import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './ReceiverFindFood.css';
import Sidebar from '../../../../components/afterLogin/receiver/findFood/sideBar/SideBar';
import MapSection from '../../../../components/afterLogin/receiver/findFood/mapSection/MapSection';
import ReceiverNavbar from "../../../../components/afterLogin/dashboard/ReceiverSection/navbar/ReceiverNavbar";
import ReceiverFooter from "../../../../components/afterLogin/dashboard/ReceiverSection/footer/ReceiverFooter";
import LocationMapModal from '../../../../components/afterLogin/donor/myDonation/locationMapModal/LocationMapModal';
import { getAvailableDonations, claimDonation } from '../../../../services/donationApi';
import { createClaimCheckout } from '../../../../services/paymentApi';
import ClaimPaymentModal from '../../../../components/afterLogin/receiver/findFood/claimPayment/ClaimPaymentModal';
import { getCurrentUser } from '../../../../services/api';
import {
    getSocket,
    onDonationCreated,
    onDonationClaimed,
    onDonationCancelled,
    onDonationClaimCancelled,
    MAX_RECEIVER_RADIUS_KM,
} from '../../../../services/socket';
import { calculateDistance, formatDistance } from '../../../../utils/distance';
import { formatExpiryDate } from '../../../../utils/donationDisplay';
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
        preferredPickupDate: donation.preferredPickupDate,
        preferredPickupTimeFrom: donation.preferredPickupTimeFrom,
        preferredPickupTimeTo: donation.preferredPickupTimeTo,
        donorName: donation.donorName,
        donorType: donation.donorType,
        donorAddress: donation.donorAddress || donation.pickupAddress,
        priceLabel: donation.priceLabel,
        listingType: donation.listingType,
        priceAmount: donation.priceAmount,
        priceCurrency: donation.priceCurrency,
    };
}

function isWithinRadius(item) {
    if (item.distanceKm == null) return false;
    return item.distanceKm <= MAX_RECEIVER_RADIUS_KM;
}

const FindFood = () => {
    const navigate = useNavigate();
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

    const fetchDonations = useCallback(async (lat, lng) => {
        try {
            setLoading(true);
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
            setError(err.message || 'Failed to load donations');
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!receiverPosition) return;
        const [lat, lng] = receiverPosition;
        fetchDonations(lat, lng);
    }, [receiverPosition, fetchDonations]);

    useEffect(() => {
        if (!receiverPosition) return undefined;

        getSocket();

        const mergeCreated = (payload) => {
            const donation = payload?.donation;
            if (!donation) return;

            const [lat, lng] = receiverPosition;
            const item = transformDonationToItem(
                { ...donation, donorName: payload.donorName || donation.donorName },
                receiverPosition
            );
            if (!isWithinRadius(item)) return;

            setItems((prev) => {
                if (prev.some((i) => i.id === item.id)) return prev;
                return [item, ...prev];
            });
        };

        const removeById = (payload) => {
            const id = payload?.donationId;
            if (!id) return;
            setItems((prev) => prev.filter((i) => i.id !== id));
            setSelectedItemId((current) => (current === id ? null : current));
        };

        const mergeClaimCancelled = (payload) => {
            const donation = payload?.donation;
            if (!donation) return;
            const item = transformDonationToItem(donation, receiverPosition);
            if (!isWithinRadius(item)) return;
            setItems((prev) => {
                if (prev.some((i) => i.id === item.id)) return prev;
                return [item, ...prev];
            });
        };

        const unsubCreated = onDonationCreated(mergeCreated);
        const unsubClaimed = onDonationClaimed(removeById);
        const unsubCancelled = onDonationCancelled(removeById);
        const unsubClaimCancelled = onDonationClaimCancelled(mergeClaimCancelled);

        return () => {
            unsubCreated();
            unsubClaimed();
            unsubCancelled();
            unsubClaimCancelled();
        };
    }, [receiverPosition]);

    useEffect(() => {
        let cancelled = false;
        getCurrentUser()
            .then((res) => {
                if (!cancelled && res?.user?.address) setProfileAddress(res.user.address);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const handleSelectLocationConfirm = async (lat, lng, address) => {
        setReceiverPosition([lat, lng]);
        setReceiverAddress(address || 'Location set');
        setShowLocationModal(false);
    };

    const handlePaymentSuccess = (orderId) => {
        const donationId = paymentCheckout?.donationId;
        const item = items.find((i) => i.id === donationId);
        setPaymentModalOpen(false);
        setPaymentCheckout(null);
        setPaidOrderId(orderId);
        setClaimingDonationId(donationId);
        setClaimLocationModalOpen(true);
        const priceText = item?.priceLabel || (item?.priceAmount ? `LKR ${item.priceAmount}` : '');
        setPaymentNotice(
            priceText
                ? `Payment received (${priceText}). Set your delivery location.`
                : 'Payment received. Set your delivery location.'
        );
    };

    const handleClaim = async (donationId) => {
        setClaimSaveError(null);
        setPaymentNotice(null);

        const item = items.find((i) => i.id === donationId);
        const isSell =
            item?.listingType === 'sell' &&
            (item?.priceAmount > 0 || (item?.donation?.priceAmount > 0));

        if (isSell) {
            setPaidOrderId(null);
            const checkout = await createClaimCheckout(donationId);
            if (!checkout?.orderId) {
                throw new Error('Invalid payment response from server.');
            }
            setPaymentCheckout({
                orderId: checkout.orderId,
                amount: checkout.amount,
                currency: checkout.currency,
                itemName: checkout.itemName,
                donationId,
            });
            setPaymentModalOpen(true);
            return;
        }

        setPaidOrderId(null);
        setClaimingDonationId(donationId);
        setClaimLocationModalOpen(true);
    };

    const handleClaimLocationConfirm = async (lat, lng, address) => {
        const donationId = claimingDonationId;
        if (!donationId) return;

        setClaimSaving(true);
        setClaimSaveError(null);
        try {
            const claimPayload = {
                receiverLatitude: lat,
                receiverLongitude: lng,
                receiverAddress: address || '',
            };
            if (paidOrderId) {
                claimPayload.paymentOrderId = paidOrderId;
            }

            const response = await claimDonation(donationId, claimPayload);
            if (response.success) {
                setReceiverPosition([lat, lng]);
                setReceiverAddress(address || 'Location set');
                setItems((prev) => prev.filter((item) => item.id !== donationId));
                setSelectedItemId((current) => (current === donationId ? null : current));
                setClaimLocationModalOpen(false);
                setClaimingDonationId(null);
                setPaidOrderId(null);
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
                            backgroundColor: '#e8f5e9',
                            color: '#1b4332',
                            fontSize: '14px',
                        }}
                    >
                        {paymentNotice}
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
                }}
                onConfirm={handleClaimLocationConfirm}
                defaultAddress={receiverAddress || profileAddress}
                defaultLat={receiverPosition?.[0]}
                defaultLng={receiverPosition?.[1]}
                autoFetchOnOpen={!receiverPosition}
                saving={claimSaving}
                saveError={claimSaveError}
                title="Set delivery location"
                confirmLabel="Confirm & claim"
                addressLabel="Delivery address"
                addressPlaceholder="Enter where you want the food delivered"
            />

            <ReceiverFooter />
        </>
    );
};

export default FindFood;
