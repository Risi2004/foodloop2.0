import { useState, useEffect } from 'react';
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
import { getUser } from '../../../../utils/auth';
import {
    getSocket,
    onDonationInTransit,
    onDeliveryConfirmed,
    onDonationClaimedForDonor,
    onDonationClaimCancelledForDonor,
} from '../../../../services/socket';
import PageLoader from '../../../../components/common/PageLoader/PageLoader';
import SupplierAiInsightsPanel from '../../../../components/afterLogin/donor/myDonation/supplierAiInsights/SupplierAiInsightsPanel';

const DonorMyDonationDashboard = () => {
    const navigate = useNavigate();
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);
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

    const fetchDonations = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getMyDonations();
            if (response.success && response.donations) {
                setDonations(response.donations);
                const completedDonations = response.donations.filter(d => d.status === 'delivered');
                const totalMeals = completedDonations.reduce((sum, d) => sum + (d.quantity || 0), 0);
                const totalFoodSaved = totalMeals * 0.6;
                const totalCo2Offset = totalFoodSaved * 2.5;
                setImpactStats({
                    mealsShared: totalMeals,
                    foodSaved: Math.round(totalFoodSaved),
                    co2Offset: Math.round(totalCo2Offset)
                });
            } else {
                setDonations([]);
            }
        } catch (err) {
            console.error('[DonorMyDonationDashboard] Error fetching donations:', err);
            setError(err.message || 'Failed to load your donations');
            setDonations([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDonations();
        getSocket();

        const handleInTransit = (payload) => {
            fetchDonations();
            const donationId = payload?.donationId;
            if (donationId) {
                // Driver accepted the order: go to live tracking for this donation
                navigate(`/supplier/track-order?donationId=${donationId}`);
            }
        };

        const handleDeliveryConfirmed = () => {
            // Delivery finished: just refresh lists; tracking page will handle redirect back
            fetchDonations();
        };

        const handleClaimedForDonor = (payload) => {
            const user = getUser();
            const myId = user?.id || user?._id;
            const donorId = payload?.donorId;
            if (myId && donorId && String(myId) === String(donorId)) {
                fetchDonations();
            }
        };

        const unsubInTransit = onDonationInTransit(handleInTransit);
        const unsubDeliveryConfirmed = onDeliveryConfirmed(handleDeliveryConfirmed);
        const unsubClaimedForDonor = onDonationClaimedForDonor(handleClaimedForDonor);
        const unsubClaimCancelledForDonor = onDonationClaimCancelledForDonor(handleClaimedForDonor);

        return () => {
            unsubInTransit();
            unsubDeliveryConfirmed();
            unsubClaimedForDonor();
            unsubClaimCancelledForDonor();
        };
    }, [navigate]);

    // Flow: Looking for Receiver (unclaimed) → Looking for Driver (claimed, no driver) → In Transit → Completed
    const lookingForReceiver = donations.filter(d =>
        (d.status === 'available' ||
            d.status === 'draft' ||
            d.status === 'pending' ||
            d.status === 'approved') &&
        !d.assignedReceiverId &&
        d.status !== 'cancelled'
    );
    const lookingForDriver = donations.filter(
        (d) => d.status === 'claimed' && d.receiverId
    );
    const inTransit = donations.filter(
        (d) => d.status === 'driver_assigned' || d.status === 'in_transit'
    );
    const completed = donations.filter(d => d.status === 'delivered');

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

    if (loading) {
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
                                    <p style={{ color: '#fff', padding: '20px', textAlign: 'center' }}>
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
                                    <p style={{ color: '#fff', padding: '20px', textAlign: 'center' }}>
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
                                    <p style={{ color: '#fff', padding: '20px', textAlign: 'center' }}>
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
                                    <p style={{ color: '#fff', padding: '20px', textAlign: 'center' }}>
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
