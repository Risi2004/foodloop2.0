import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './ReceiverFindFood.css';
import Sidebar from '../../../../components/afterLogin/receiver/findFood/sideBar/SideBar';
import MapSection from '../../../../components/afterLogin/receiver/findFood/mapSection/MapSection';
import ReceiverNavbar from "../../../../components/afterLogin/dashboard/ReceiverSection/navbar/ReceiverNavbar";
import ReceiverFooter from "../../../../components/afterLogin/dashboard/ReceiverSection/footer/ReceiverFooter";
import LocationMapModal from '../../../../components/afterLogin/donor/myDonation/locationMapModal/LocationMapModal';
import { getAvailableDonations, claimDonation } from '../../../../services/donationApi';
import { createClaimCheckout, retryClaimPayment } from '../../../../services/paymentApi';
import ClaimPaymentModal from '../../../../components/afterLogin/receiver/findFood/claimPayment/ClaimPaymentModal';
import { getCurrentUser } from '../../../../services/api';
import {
    getSocket,
    joinFoodListings,
    onDonationCreated,
    onDonationClaimed,
    onDonationStockUpdated,
    onDonationCancelled,
    onDonationClaimCancelled,
    MAX_RECEIVER_RADIUS_KM,
} from '../../../../services/socket';
import { calculateDistance, formatDistance } from '../../../../utils/distance';
import { formatExpiryDate } from '../../../../utils/donationDisplay';
import { useMaintenance } from '../../../../contexts/MaintenanceContext';
import { MAINTENANCE_BLOCK_MESSAGE } from '../../../../services/maintenanceApi';
import PageLoader from '../../../../components/common/PageLoader/PageLoader';

const getTimeAgo = (date) => {
    if (!date) return 'Recently';
    const now = new Date();
    const donationDate = new Date(date);
    const diffInSeconds = Math.floor((now - donationDate) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} sec${diffInSeconds !== 1 ? 's' : ''} ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min${Math.floor(diffInSeconds / 60) !== 1 ? 's' : ''} ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr${Math.floor(diffInSeconds / 3600) !== 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInSeconds / 86400)} day${Math.floor(diffInSeconds / 86400) !== 1 ? 's' : ''} ago`;
};

const formatQuantity = (quantity) => {
    if (!quantity) return 'N/A';
    return `${quantity} ${quantity === 1 ? 'serving' : 'servings'} Available`;
};

function transformDonationToItem(donation, receiverPosition) {
    const lat = donation.donorLatitude ?? donation.position?.[0];
    const lng = donation.donorLongitude ?? donation.position?.[1];
    const hasCoords = lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
    const position = hasCoords ? [Number(lat), Number(lng)] : null;

    let distanceKm = donation.distanceKm;
    if (receiverPosition && position) {
        distanceKm = calculateDistance(
            receiverPosition[0],
            receiverPosition[1],
            position[0],
            position[1]
        );
    }

    return {
        id: donation.id || donation._id,
        trackingId: donation.trackingId,
        title: donation.itemName,
        listedTime: getTimeAgo(donation.createdAt),
        expiry: formatExpiryDate(donation.expiryDate || donation.userProvidedExpiryDate),
        quantity: formatQuantity(donation.quantity),
        impactPeople: donation.quantity || 0,
        image: donation.imageUrl,
        position,
        hasValidCoordinates: !!position,
        distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
        distanceLabel: distanceKm != null ? formatDistance(distanceKm) : null,
        donation,
        foodCategory: donation.foodCategory,
        storageRecommendation: donation.storageRecommendation,
        aiQualityScore: donation.aiQualityScore,
        donorName: donation.donorName,
        donorIsPremium: donation.donorIsPremium === true,
        donorType: donation.donorType,
        donorAddress: donation.donorAddress || donation.pickupAddress,
        priceLabel: donation.priceLabel,
        listingType: donation.listingType,
        priceAmount: donation.priceAmount,
        priceCurrency: donation.priceCurrency,
        discountMeta: donation.discountMeta || null,
        estimatedDeliveryFee:
            donation.listingType === 'sell' && distanceKm != null
                ? Math.round(distanceKm * 100)
                : null,
    };
}

function isWithinRadius(item) {
    if (item.distanceKm == null) return false;
    return item.distanceKm <= MAX_RECEIVER_RADIUS_KM;
}

const FindFood = () => {
    const navigate = useNavigate();
    const { blockNewOrders } = useMaintenance();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [receiverPosition, setReceiverPosition] = useState(null);
    const [receiverAddress, setReceiverAddress] = useState('');
    const [profileAddress, setProfileAddress] = useState('');
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [claimLocationModalOpen, setClaimLocationModalOpen] = useState(false);
    const [claimingDonationId, setClaimingDonationId] = useState(null);
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [claimSaving, setClaimSaving] = useState(false);
    const [claimSaveError, setClaimSaveError] = useState(null);
    const [paidOrderId, setPaidOrderId] = useState(null);
    const [paymentNotice, setPaymentNotice] = useState(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentCheckout, setPaymentCheckout] = useState(null);
    const [pendingClaimLocation, setPendingClaimLocation] = useState(null);
    const [claimIsSellFlow, setClaimIsSellFlow] = useState(false);
    const [pendingClaimQuantity, setPendingClaimQuantity] = useState(1);
    const [claimQuantities, setClaimQuantities] = useState({});
    const [pendingRetryOrderId, setPendingRetryOrderId] = useState(null);
    const receiverPositionRef = useRef(null);

    const getClaimQuantityFor = (donationId) => claimQuantities[donationId] ?? 1;

    const handleClaimQuantityChange = (donationId, qty) => {
        setClaimQuantities((prev) => ({ ...prev, [donationId]: qty }));
    };

    const applyParentListingAfterClaim = useCallback((prev, donationId, parentListing) => {
        if (!parentListing || parentListing.quantity <= 0) {
            return prev.filter((item) => item.id !== donationId);
        }
        if (!receiverPosition) return prev;
        const updatedItem = transformDonationToItem(parentListing, receiverPosition);
        if (!isWithinRadius(updatedItem)) {
            return prev.filter((item) => item.id !== donationId);
        }
        return prev.map((item) => (item.id === donationId ? updatedItem : item));
    }, [receiverPosition]);

    const fetchDonations = useCallback(async (lat, lng, options = {}) => {
        const { silent = false } = options;
        try {
            if (!silent) setLoading(true);
            setError(null);
            const response = await getAvailableDonations(lat, lng);

            if (response.success && response.donations) {
                const receiverPos = [lat, lng];
                const transformed = response.donations
                    .map((d) => transformDonationToItem(d, receiverPos))
                    .filter(isWithinRadius);
                setItems(transformed);
                setSelectedItemId((current) => {
                    if (current && transformed.some((t) => t.id === current)) return current;
                    return transformed.length > 0 ? transformed[0].id : null;
                });
            } else {
                setItems([]);
                setSelectedItemId(null);
            }
        } catch (err) {
            console.error('[ReceiverFindFood] Error fetching donations:', err);
            if (!silent) {
                setError(err.message || 'Failed to load donations');
            }
            if (!silent) {
                setItems([]);
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        receiverPositionRef.current = receiverPosition;
    }, [receiverPosition]);

    useEffect(() => {
        if (!receiverPosition) return;
        const [lat, lng] = receiverPosition;
        fetchDonations(lat, lng);
    }, [receiverPosition, fetchDonations]);

    useEffect(() => {
        getSocket();
        const leaveFoodListings = joinFoodListings();

        const refreshFromServer = () => {
            const pos = receiverPositionRef.current;
            if (!pos) return;
            const [lat, lng] = pos;
            fetchDonations(lat, lng, { silent: true });
        };

        const mergeCreated = (payload) => {
            const donation = payload?.donation;
            const pos = receiverPositionRef.current;
            if (!donation || !pos) {
                refreshFromServer();
                return;
            }

            const item = transformDonationToItem(
                { ...donation, donorName: payload.donorName || donation.donorName },
                pos
            );
            if (isWithinRadius(item)) {
                setItems((prev) => {
                    if (prev.some((i) => i.id === item.id)) {
                        return prev.map((i) => (i.id === item.id ? item : i));
                    }
                    return [item, ...prev];
                });
            }
            refreshFromServer();
        };

        const removeById = (payload) => {
            const id = payload?.donationId;
            if (!id) return;
            setItems((prev) => prev.filter((i) => i.id !== id));
            setSelectedItemId((current) => (current === id ? null : current));
            refreshFromServer();
        };

        const mergeClaimCancelled = (payload) => {
            const parentListing = payload?.parentListing || payload?.donation;
            const pos = receiverPositionRef.current;
            if (!parentListing || !pos) {
                refreshFromServer();
                return;
            }
            const item = transformDonationToItem(parentListing, pos);
            if (!isWithinRadius(item)) return;
            setItems((prev) => {
                if (prev.some((i) => i.id === item.id)) {
                    return prev.map((i) => (i.id === item.id ? item : i));
                }
                return [item, ...prev];
            });
            refreshFromServer();
        };

        const mergeStockUpdated = (payload) => {
            const donation = payload?.donation;
            const pos = receiverPositionRef.current;
            if (!donation || !pos) {
                refreshFromServer();
                return;
            }
            const donationId = donation.id || donation._id || payload?.donationId;
            const maxQty = Math.max(1, Number(donation.quantity) || 1);

            if (donationId) {
                setClaimQuantities((prev) => {
                    const current = prev[donationId] ?? 1;
                    if (current <= maxQty) return prev;
                    return { ...prev, [donationId]: maxQty };
                });
                setPendingClaimQuantity((current) => (current > maxQty ? maxQty : current));
            }

            const item = transformDonationToItem(donation, pos);
            if (!isWithinRadius(item)) {
                setItems((prev) => prev.filter((i) => i.id !== item.id));
                return;
            }
            setItems((prev) => {
                const exists = prev.some((i) => i.id === item.id);
                if (!exists) return [item, ...prev];
                return prev.map((i) => (i.id === item.id ? item : i));
            });
        };

        const unsubCreated = onDonationCreated(mergeCreated);
        const unsubClaimed = onDonationClaimed(removeById);
        const unsubStockUpdated = onDonationStockUpdated(mergeStockUpdated);
        const unsubCancelled = onDonationCancelled(removeById);
        const unsubClaimCancelled = onDonationClaimCancelled(mergeClaimCancelled);

        return () => {
            leaveFoodListings();
            unsubCreated();
            unsubClaimed();
            unsubStockUpdated();
            unsubCancelled();
            unsubClaimCancelled();
        };
    }, [fetchDonations]);

    useEffect(() => {
        let cancelled = false;
        getCurrentUser()
            .then((res) => {
                if (cancelled || !res?.user) return;
                if (res.user.address) setProfileAddress(res.user.address);
                const lat = Number(res.user.receiverLatitude);
                const lng = Number(res.user.receiverLongitude);
                if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                    setReceiverPosition((current) => current || [lat, lng]);
                    if (res.user.address) {
                        setReceiverAddress((current) => current || res.user.address);
                    }
                }
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const handleSelectLocationConfirm = async (lat, lng, address) => {
        setReceiverPosition([lat, lng]);
        setReceiverAddress(address || 'Location set');
        setShowLocationModal(false);
    };

    const handlePaymentSuccess = async (orderId, confirmResult) => {
        const checkoutSnapshot = paymentCheckout;
        const donationId = checkoutSnapshot?.donationId || claimingDonationId;
        const location = pendingClaimLocation;
        const claimQuantity = checkoutSnapshot?.claimQuantity ?? pendingClaimQuantity;

        setPaymentModalOpen(false);
        setPaymentCheckout(null);

        if (!donationId || !location) {
            setPaymentNotice('Payment received. Please claim again from the listing.');
            return;
        }

        if (confirmResult?.claimCompleted) {
            setReceiverPosition([location.lat, location.lng]);
            setReceiverAddress(location.address || 'Location set');
            setItems((prev) =>
                applyParentListingAfterClaim(prev, donationId, confirmResult.parentListing)
            );
            setSelectedItemId((current) => {
                if (confirmResult.parentListing?.quantity > 0 && current === donationId) return donationId;
                return current === donationId ? null : current;
            });
            setClaimingDonationId(null);
            setPendingClaimLocation(null);
            setPendingClaimQuantity(1);
            setClaimIsSellFlow(false);
            setPaidOrderId(null);
            setPaymentNotice(null);
            setPendingRetryOrderId(null);
            navigate('/receiver/my-claims');
            return;
        }

        setClaimSaving(true);
        setClaimSaveError(null);
        try {
            const response = await claimDonation(donationId, {
                receiverLatitude: location.lat,
                receiverLongitude: location.lng,
                receiverAddress: location.address || '',
                paymentOrderId: orderId,
                claimQuantity,
            });
            if (response.success) {
                setReceiverPosition([location.lat, location.lng]);
                setReceiverAddress(location.address || 'Location set');
                setItems((prev) =>
                    applyParentListingAfterClaim(prev, donationId, response.parentListing)
                );
                setSelectedItemId((current) => {
                    if (response.parentListing?.quantity > 0 && current === donationId) return donationId;
                    return current === donationId ? null : current;
                });
                setClaimingDonationId(null);
                setPendingClaimLocation(null);
                setPendingClaimQuantity(1);
                setClaimIsSellFlow(false);
                setPaidOrderId(null);
                setPaymentNotice(null);
                setPendingRetryOrderId(null);
                navigate('/receiver/my-claims');
            }
        } catch (err) {
            const msg =
                confirmResult?.claimError ||
                err.response?.data?.message ||
                err.message ||
                'Failed to claim after payment.';
            setClaimSaveError(msg);
            setPendingRetryOrderId(orderId);
            setPaymentNotice(`${msg} Use "Complete claim" below to retry without paying again.`);
        } finally {
            setClaimSaving(false);
        }
    };

    const handleRetryPaidClaim = async () => {
        if (!pendingRetryOrderId) return;
        setClaimSaving(true);
        setClaimSaveError(null);
        try {
            const response = await retryClaimPayment(pendingRetryOrderId);
            if (response.success && response.claimCompleted) {
                setPendingRetryOrderId(null);
                setPaymentNotice(null);
                navigate('/receiver/my-claims');
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to complete claim.';
            setClaimSaveError(msg);
            setPaymentNotice(msg);
        } finally {
            setClaimSaving(false);
        }
    };

    const handleClaim = async (donationId, claimQuantity = 1) => {
        if (blockNewOrders) {
            setPaymentNotice(MAINTENANCE_BLOCK_MESSAGE);
            return;
        }
        setClaimSaveError(null);
        setPaymentNotice(null);
        setPaidOrderId(null);
        setPendingClaimLocation(null);
        setPendingClaimQuantity(claimQuantity);

        const item = items.find((i) => i.id === donationId);
        const isSell =
            item?.listingType === 'sell' &&
            (item?.priceAmount > 0 || (item?.donation?.priceAmount > 0));

        setClaimingDonationId(donationId);
        setClaimIsSellFlow(Boolean(isSell));
        setClaimLocationModalOpen(true);
    };

    const handleClaimLocationConfirm = async (lat, lng, address) => {
        const donationId = claimingDonationId;
        if (!donationId) return;

        if (claimIsSellFlow) {
            setClaimSaving(true);
            setClaimSaveError(null);
            try {
                const checkout = await createClaimCheckout(
                    donationId,
                    lat,
                    lng,
                    pendingClaimQuantity,
                    address || ''
                );
                if (!checkout?.orderId) {
                    throw new Error('Invalid payment response from server.');
                }
                setPendingClaimLocation({ lat, lng, address: address || '' });
                setPaymentCheckout({
                    orderId: checkout.orderId,
                    amount: checkout.amount,
                    currency: checkout.currency,
                    itemName: checkout.itemName,
                    donationId,
                    claimQuantity: pendingClaimQuantity,
                    breakdown: checkout.breakdown,
                    discountStatus: checkout.discountStatus,
                });
                setClaimLocationModalOpen(false);
                setPaymentModalOpen(true);
            } catch (err) {
                const msg = err.response?.data?.message || err.message || 'Failed to start checkout.';
                setClaimSaveError(msg);
                throw new Error(msg);
            } finally {
                setClaimSaving(false);
            }
            return;
        }

        setClaimSaving(true);
        setClaimSaveError(null);
        try {
            const response = await claimDonation(donationId, {
                receiverLatitude: lat,
                receiverLongitude: lng,
                receiverAddress: address || '',
                claimQuantity: pendingClaimQuantity,
            });
            if (response.success) {
                setReceiverPosition([lat, lng]);
                setReceiverAddress(address || 'Location set');
                setItems((prev) =>
                    applyParentListingAfterClaim(prev, donationId, response.parentListing)
                );
                setSelectedItemId((current) => {
                    if (response.parentListing?.quantity > 0 && current === donationId) return donationId;
                    return current === donationId ? null : current;
                });
                setClaimLocationModalOpen(false);
                setClaimingDonationId(null);
                setPendingClaimQuantity(1);
                setClaimIsSellFlow(false);
                setPaymentNotice(null);
                navigate('/receiver/my-claims');
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to claim donation. Please try again.';
            setClaimSaveError(msg);
            throw new Error(msg);
        } finally {
            setClaimSaving(false);
        }
    };

    const handleCardClick = (item) => {
        if (item?.id) setSelectedItemId(item.id);
    };

    const locationRequired = !receiverPosition;
    const selectedItem = items.find((i) => i.id === selectedItemId) || null;

    if (loading && receiverPosition && items.length === 0) {
        return <PageLoader message="Loading available donations..." />;
    }

    if (error && receiverPosition) {
        return (
            <>
                <ReceiverNavbar />
                <div className="find-food-page">
                    <div className="error-container" style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100vh',
                        flexDirection: 'column',
                        gap: '16px',
                        padding: '20px',
                    }}>
                        <p style={{ color: '#d32f2f', fontSize: '16px', textAlign: 'center' }}>
                            {error}
                        </p>
                        <button
                            type="button"
                            onClick={() => fetchDonations(receiverPosition[0], receiverPosition[1])}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#1b4332',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Retry
                        </button>
                    </div>
                </div>
                <ReceiverFooter />
            </>
        );
    }

    return (
        <>
            <ReceiverNavbar />
            <div className="find-food-page">
                {paymentNotice && (
                    <div
                        role="status"
                        style={{
                            margin: '12px 16px 0',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            backgroundColor: pendingRetryOrderId ? '#fff3cd' : '#e8f5e9',
                            color: pendingRetryOrderId ? '#664d03' : '#1b4332',
                            fontSize: '14px',
                        }}
                    >
                        {paymentNotice}
                        {pendingRetryOrderId && (
                            <button
                                type="button"
                                onClick={handleRetryPaidClaim}
                                disabled={claimSaving}
                                style={{
                                    display: 'block',
                                    marginTop: '8px',
                                    padding: '8px 14px',
                                    background: '#1F4E36',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: claimSaving ? 'wait' : 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                {claimSaving ? 'Completing claim...' : 'Complete claim'}
                            </button>
                        )}
                    </div>
                )}
                <div className="sidebar-section">
                    <Sidebar
                        items={items}
                        onCardClick={handleCardClick}
                        onClaim={handleClaim}
                        selectedItemId={selectedItemId}
                        locationRequired={locationRequired}
                        maxRadiusKm={MAX_RECEIVER_RADIUS_KM}
                        claimQuantities={claimQuantities}
                        onClaimQuantityChange={handleClaimQuantityChange}
                        getClaimQuantityFor={getClaimQuantityFor}
                        ordersBlocked={blockNewOrders}
                    />
                </div>
                <div className="map-section">
                    <MapSection
                        items={items}
                        receiverPosition={receiverPosition}
                        receiverAddress={receiverAddress}
                        selectedItemId={selectedItemId}
                        selectedItem={selectedItem}
                        onSelectLocation={() => setShowLocationModal(true)}
                    />
                </div>
            </div>

            <LocationMapModal
                isOpen={showLocationModal}
                onClose={() => setShowLocationModal(false)}
                onConfirm={handleSelectLocationConfirm}
                defaultAddress=""
                autoFetchOnOpen
                title="Set your location"
                confirmLabel="Confirm location"
                addressLabel="Your location"
                addressPlaceholder="Enter your delivery address"
            />

            <ClaimPaymentModal
                isOpen={paymentModalOpen}
                checkout={paymentCheckout}
                onClose={() => {
                    setPaymentModalOpen(false);
                    setPaymentCheckout(null);
                }}
                onSuccess={handlePaymentSuccess}
            />

            <LocationMapModal
                isOpen={claimLocationModalOpen}
                onClose={() => {
                    if (claimSaving) return;
                    setClaimLocationModalOpen(false);
                    setClaimingDonationId(null);
                    setClaimSaveError(null);
                    setPaidOrderId(null);
                    setPendingClaimLocation(null);
                    setClaimIsSellFlow(false);
                }}
                onConfirm={handleClaimLocationConfirm}
                defaultAddress={receiverAddress || profileAddress}
                defaultLat={receiverPosition?.[0]}
                defaultLng={receiverPosition?.[1]}
                autoFetchOnOpen={!receiverPosition}
                saving={claimSaving}
                saveError={claimSaveError}
                title={claimIsSellFlow ? 'Set delivery location' : 'Set delivery location'}
                confirmLabel={claimIsSellFlow ? 'Continue to payment' : 'Confirm & claim'}
                addressLabel="Delivery address"
                addressPlaceholder="Enter where you want the food delivered"
            />

            <ReceiverFooter />
        </>
    );
};

export default FindFood;
