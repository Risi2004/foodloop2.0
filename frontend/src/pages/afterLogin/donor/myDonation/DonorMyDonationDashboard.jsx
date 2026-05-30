import { useState, useEffect, useCallback, useRef } from 'react';
import "./DonorMyDonationDashboard.css";
import DonorNavbar from "../../../../components/afterLogin/dashboard/donorSection/navbar/DonorNavbar";
import DonorFooter from "../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter";
import DonationSidebar from "../../../../components/afterLogin/donor/myDonation/DonationSidebar";
import InTransitCard from "../../../../components/afterLogin/donor/myDonation/InTransitCard";
import LookingForReceiverCard from "../../../../components/afterLogin/donor/myDonation/LookingForReceiverCard";
import LookingForDriverCard from "../../../../components/afterLogin/donor/myDonation/LookingForDriverCard";
import CompletedHistoryCard from "../../../../components/afterLogin/donor/myDonation/CompletedHistoryCard";
import { useNavigate } from 'react-router-dom';
import {
    getMyDonations,
    deleteDonation,
    cancelClaim,
    getDiscountSuggestion,
    applyDiscountSuggestion,
} from '../../../../services/donationApi';
import { getDiscountedPriceDetails } from '../../../../utils/donationDisplay';
import {
    getSocket,
    onDonationInTransit,
    onDonationPickedUp,
    onDeliveryConfirmed,
    onDonationClaimedForDonor,
    onDonationClaimCancelledForDonor,
} from '../../../../services/socket';
import PageLoader from '../../../../components/common/PageLoader/PageLoader';
import SupplierAiInsightsPanel from '../../../../components/afterLogin/donor/myDonation/supplierAiInsights/SupplierAiInsightsPanel';
import { getDashboardPath, clearAuth, getUser } from '../../../../utils/auth';

function normalizeDonationStatus(status) {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'assigned') return 'driver_assigned';
    return value || status;
}

function normalizeRefId(value) {
    if (value == null) return null;
    if (typeof value === 'object') {
        return value.id || value._id?.toString?.() || value._id || null;
    }
    return String(value);
}

function extractDonationFromPayload(payload) {
    const raw = payload?.donation;
    if (!raw) return null;
    if (raw.donation && typeof raw.donation === 'object') {
        return raw.donation;
    }
    return raw;
}

function normalizeDonationRecord(donation) {
    if (!donation) return donation;
    return {
        ...donation,
        id: donation.id || donation._id,
        status: normalizeDonationStatus(donation.status),
        parentListingId: normalizeRefId(donation.parentListingId),
        receiverId: normalizeRefId(donation.receiverId),
        driverId: normalizeRefId(donation.driverId || donation.assignedDriverId),
        quantity: Number(donation.quantity ?? 0),
    };
}

function mergeDonationLists(prev, payload) {
    const extractedDonation = extractDonationFromPayload(payload);
    const { parentListing, parentListingId, donationId } = payload || {};
    let next = [...prev];

    if (parentListing) {
        const parentId = parentListing.id || parentListing._id || parentListingId;
        if (parentId) {
            const normalizedParent = normalizeDonationRecord(parentListing);
            const parentKey = normalizeRefId(parentId);
            if (normalizedParent.quantity <= 0 || normalizedParent.status === 'cancelled') {
                next = next.filter((d) => normalizeRefId(d.id) !== parentKey);
            } else {
                const idx = next.findIndex((d) => normalizeRefId(d.id) === parentKey);
                if (idx >= 0) {
                    next[idx] = { ...next[idx], ...normalizedParent, id: parentKey };
                } else {
                    next.push({ ...normalizedParent, id: parentKey });
                }
            }
        }
    }

    if (extractedDonation) {
        const normalized = normalizeDonationRecord(extractedDonation);
        const id = normalizeRefId(normalized.id || donationId);
        if (!id) return next;

        if (normalized.status === 'cancelled' && normalized.parentListingId) {
            return next.filter((d) => normalizeRefId(d.id) !== id);
        }

        const idx = next.findIndex((d) => normalizeRefId(d.id) === id);
        if (idx >= 0) {
            next[idx] = { ...next[idx], ...normalized, id };
        } else {
            next.unshift({ ...normalized, id });
        }
    } else if (donationId) {
        const removeId = normalizeRefId(donationId);
        next = next.filter((d) => normalizeRefId(d.id) !== removeId);
    }

    return next;
}

function categorizeDonations(donations) {
    const normalized = donations.map(normalizeDonationRecord).filter(Boolean);

    const lookingForDriver = normalized.filter(
        (d) => d.status === 'claimed' && d.receiverId && !d.driverId
    );
    const inTransit = normalized.filter((d) =>
        ['driver_assigned', 'picked_up', 'in_transit'].includes(d.status)
    );
    const completed = normalized.filter((d) => d.status === 'delivered');

    const lookingForReceiver = normalized.filter((d) => {
        if (d.parentListingId) return false;
        if (d.quantity <= 0) return false;
        if (!['available', 'draft'].includes(d.status)) return false;
        return true;
    });

    return { lookingForReceiver, lookingForDriver, inTransit, completed };
}

const DonorMyDonationDashboard = () => {
    const navigate = useNavigate();
    const [donations, setDonations] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState(null);
    const [impactStats, setImpactStats] = useState({
        mealsShared: 0,
        foodSaved: 0,
        co2Offset: 0
    });
    const [activeSuggestionDonation, setActiveSuggestionDonation] = useState(null);
    const [suggestionData, setSuggestionData] = useState(null);
    const [aiLoadingId, setAiLoadingId] = useState('');
    const [applyingDiscount, setApplyingDiscount] = useState(false);
    const accessDeniedRef = useRef(false);

    const fetchDonations = useCallback(async ({ silent = false } = {}) => {
        if (accessDeniedRef.current) return;

        try {
            if (!silent) setInitialLoading(true);
            setError(null);
            const response = await getMyDonations();
            if (response.success && response.donations) {
                const normalized = response.donations.map(normalizeDonationRecord);
                setDonations(normalized);
                const completedDonations = normalized.filter((d) => d.status === 'delivered');
                const totalMeals = completedDonations.reduce((sum, d) => sum + (d.quantity || 0), 0);
                const totalFoodSaved = totalMeals * 0.6;
                const totalCo2Offset = totalFoodSaved * 2.5;
                setImpactStats({
                    mealsShared: totalMeals,
                    foodSaved: Math.round(totalFoodSaved),
                    co2Offset: Math.round(totalCo2Offset),
                });
            } else {
                setDonations([]);
            }
        } catch (err) {
            const status = err.response?.status;
            const message = err.response?.data?.message || err.message || 'Failed to load your donations';

            if (status === 401 || status === 403) {
                accessDeniedRef.current = true;
                if (status === 401) clearAuth();
                if (!silent) {
                    setError(
                        status === 403
                            ? 'This account cannot view supplier listings. Redirecting to your dashboard...'
                            : 'Your session expired. Please sign in again.'
                    );
                    setDonations([]);
                }
                if (status === 401) {
                    navigate('/login', { replace: true });
                } else {
                    navigate(getDashboardPath(getUser()?.role), { replace: true });
                }
                return;
            }

            if (!silent) {
                console.error('[DonorMyDonationDashboard] Error fetching donations:', err);
                setError(message);
                setDonations([]);
            }
        } finally {
            if (!silent) setInitialLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchDonations();
        getSocket();

        let refreshTimer = null;
        const refreshSilently = () => {
            if (refreshTimer) clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => fetchDonations({ silent: true }), 400);
        };

        const applySocketUpdate = (payload) => {
            setDonations((prev) => mergeDonationLists(prev, payload));
            refreshSilently();
        };

        const unsubInTransit = onDonationInTransit(applySocketUpdate);
        const unsubPickedUp = onDonationPickedUp(applySocketUpdate);
        const unsubDeliveryConfirmed = onDeliveryConfirmed(applySocketUpdate);
        const unsubClaimedForDonor = onDonationClaimedForDonor(applySocketUpdate);
        const unsubClaimCancelledForDonor = onDonationClaimCancelledForDonor(applySocketUpdate);

        const pollId = setInterval(() => {
            if (!accessDeniedRef.current) fetchDonations({ silent: true });
        }, 8000);
        const onFocus = () => {
            if (!accessDeniedRef.current) fetchDonations({ silent: true });
        };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') onFocus();
        });

        return () => {
            if (refreshTimer) clearTimeout(refreshTimer);
            clearInterval(pollId);
            window.removeEventListener('focus', onFocus);
            unsubInTransit();
            unsubPickedUp();
            unsubDeliveryConfirmed();
            unsubClaimedForDonor();
            unsubClaimCancelledForDonor();
        };
    }, [fetchDonations]);

    // Flow: Looking for Receiver (unclaimed) → Looking for Driver (claimed, no driver) → In Transit → Completed
    const { lookingForReceiver, lookingForDriver, inTransit, completed } = categorizeDonations(donations);

    const handleEdit = (donation) => {
        navigate(`/supplier/edit-donation/${donation.id}`);
    };

    const handleCancelClaim = async (donation) => {
        if (
            !window.confirm(
                'Cancel this claim? The listing will return to looking for a receiver. This is only allowed before a driver is assigned.'
            )
        ) {
            return;
        }
        try {
            await cancelClaim(donation.id);
            await fetchDonations();
        } catch (err) {
            console.error('[DonorMyDonationDashboard] Error cancelling claim:', err);
            alert(err.message || 'Failed to cancel claim');
        }
    };

    const handleDelete = async (donation) => {
        if (!window.confirm('Are you sure you want to cancel this donation? It will no longer be available for receivers.')) {
            return;
        }
        try {
            await deleteDonation(donation.id);
            await fetchDonations();
        } catch (err) {
            console.error('[DonorMyDonationDashboard] Error deleting donation:', err);
            alert(err.message || 'Failed to cancel donation');
        }
    };

    const closeSuggestionModal = () => {
        setActiveSuggestionDonation(null);
        setSuggestionData(null);
        setApplyingDiscount(false);
    };

    const handleAiSuggestDiscount = async (donation) => {
        const donationId = donation?.id || donation?._id;
        if (!donationId) return;
        try {
            setAiLoadingId(donationId);
            const response = await getDiscountSuggestion(donationId);
            setActiveSuggestionDonation(donation);
            setSuggestionData(response?.suggestion || null);
        } catch (err) {
            console.error('[DonorMyDonationDashboard] Error getting discount suggestion:', err);
            alert(err.message || 'Failed to get AI discount suggestion');
        } finally {
            setAiLoadingId('');
        }
    };

    const handleApplySuggestion = async () => {
        const donationId = activeSuggestionDonation?.id || activeSuggestionDonation?._id;
        const suggestedPrice = Number(suggestionData?.suggestedPrice);
        if (!donationId || Number.isNaN(suggestedPrice)) return;
        try {
            setApplyingDiscount(true);
            await applyDiscountSuggestion(donationId, { suggestedPrice });
            await fetchDonations();
            closeSuggestionModal();
        } catch (err) {
            console.error('[DonorMyDonationDashboard] Error applying discount suggestion:', err);
            alert(err.message || 'Failed to apply AI discount');
            setApplyingDiscount(false);
        }
    };

    if (initialLoading) {
        return <PageLoader message="Loading your donations..." />;
    }

    if (error) {
        return (
            <>
                <DonorNavbar />
                <div className="donor-my-donation-container">
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        height: '50vh',
                        flexDirection: 'column',
                        gap: '16px',
                        padding: '20px'
                    }}>
                        <p style={{ color: '#d32f2f', fontSize: '16px', textAlign: 'center' }}>
                            ⚠️ {error}
                        </p>
                        <button 
                            onClick={() => window.location.reload()} 
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#1b4332',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Retry
                        </button>
                    </div>
                </div>
                <DonorFooter />
            </>
        );
    }

    return (
        <>
            <DonorNavbar />
            <div className="donor-my-donation-container">
                <div className="donor-my-donation-layout">
                    <DonationSidebar impactStats={impactStats} />
                    
                    <main className="donor-my-donation-content">
                        <SupplierAiInsightsPanel />
                        {/* 1. In Transit */}
                        <div className="intransit">
                            <h2 className="active-donations">In Transit Donations</h2>
                            <div className="donation-cards">
                                {inTransit.length > 0 ? (
                                    inTransit.map((donation) => (
                                        <InTransitCard key={donation.id} donation={donation} />
                                    ))
                                ) : (
                                    <p style={{ color: '#618972', padding: '20px', textAlign: 'center' }}>
                                        No donations in transit
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 2. Looking for Driver */}
                        <div className="looking">
                            <h2 className="active-donations">Looking for Driver</h2>
                            <div className="donation-cards">
                                {lookingForDriver.length > 0 ? (
                                    lookingForDriver.map((donation) => (
                                        <LookingForDriverCard
                                            key={donation.id}
                                            donation={donation}
                                            onCancelClaim={handleCancelClaim}
                                            onAiSuggestDiscount={handleAiSuggestDiscount}
                                            aiBusy={aiLoadingId === (donation.id || donation._id)}
                                        />
                                    ))
                                ) : (
                                    <p style={{ color: '#618972', padding: '20px', textAlign: 'center' }}>
                                        No donations waiting for driver
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 3. Looking for Receiver */}
                        <div className="lookingForReceiver">
                            <h2 className="active-donations">Looking for Receiver</h2>
                            <div className="donation-cards">
                                {lookingForReceiver.length > 0 ? (
                                    lookingForReceiver.map((donation) => (
                                        <LookingForReceiverCard 
                                            key={donation.id} 
                                            donation={donation}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                            onAiSuggestDiscount={handleAiSuggestDiscount}
                                            aiBusy={aiLoadingId === (donation.id || donation._id)}
                                        />
                                    ))
                                ) : (
                                    <p style={{ color: '#618972', padding: '20px', textAlign: 'center' }}>
                                        No donations waiting for receiver
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 4. Completed History */}
                        <div className="complited">
                            <h2 className="active-donations" style={{ color: "darkgreen" }}>Completed History</h2>
                            <div className="donation-cards">
                                {completed.length > 0 ? (
                                    completed.map((donation) => (
                                        <CompletedHistoryCard key={donation.id} donation={donation} />
                                    ))
                                ) : (
                                    <p style={{ color: '#618972', padding: '20px', textAlign: 'center' }}>
                                        No completed donations
                                    </p>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
            {activeSuggestionDonation && suggestionData && (
                <div className="ai-discount-modal__backdrop" onClick={closeSuggestionModal}>
                    <div className="ai-discount-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>AI Discount Suggestion</h3>
                        <p><strong>Item:</strong> {activeSuggestionDonation.itemName || 'Listing'}</p>
                        <p>
                            <strong>Current Price:</strong>{' '}
                            {getDiscountedPriceDetails(activeSuggestionDonation)?.currentFormatted || 'LKR 0.00'}
                        </p>
                        <p>
                            <strong>Suggested Price:</strong>{' '}
                            LKR {Number(suggestionData.suggestedPrice || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p><strong>Discount:</strong> {Number(suggestionData.discountPercent || 0)}%</p>
                        {suggestionData.isFreeRecommendation && (
                            <p className="ai-discount-modal__badge">Near-expiry free recommendation</p>
                        )}
                        <p className="ai-discount-modal__reason">{suggestionData.reasoning || 'No reasoning available.'}</p>
                        <div className="ai-discount-modal__actions">
                            <button type="button" onClick={closeSuggestionModal} disabled={applyingDiscount}>Cancel</button>
                            <button type="button" onClick={handleApplySuggestion} disabled={applyingDiscount}>
                                {applyingDiscount ? 'Applying...' : 'Apply Discount'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <DonorFooter />
        </>
    );
};

export default DonorMyDonationDashboard;
