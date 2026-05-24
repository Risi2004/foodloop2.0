import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ReceiverFindFood.css';
import Sidebar from '../../../../components/afterLogin/receiver/findFood/sideBar/SideBar';
import MapSection from '../../../../components/afterLogin/receiver/findFood/mapSection/MapSection';
import ReceiverNavbar from "../../../../components/afterLogin/dashboard/ReceiverSection/navbar/ReceiverNavbar";
import ReceiverFooter from "../../../../components/afterLogin/dashboard/ReceiverSection/footer/ReceiverFooter";
import LocationMapModal from '../../../../components/afterLogin/donor/myDonation/locationMapModal/LocationMapModal';
import { getAvailableDonations, claimDonation } from '../../../../services/donationApi';
import { getCurrentUser } from '../../../../services/api';
import { onDonationCreated } from '../../../../services/socket';
import PageLoader from '../../../../components/common/PageLoader/PageLoader';
import { useMarketplace } from '../../../../contexts/MarketplaceContext';

// Offline: no external geocoder
const reverseGeocode = async (lat, lng) => {
    if (lat == null || lng == null) return null;
    return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
};

const FindFood = () => {
    const navigate = useNavigate();
    const { products, claimVendorProduct } = useMarketplace();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [receiverPosition, setReceiverPosition] = useState(null);
    const [receiverAddress, setReceiverAddress] = useState('');
    const [profileAddress, setProfileAddress] = useState('');
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [claimLocationModalOpen, setClaimLocationModalOpen] = useState(false);
    const [claimingDonationId, setClaimingDonationId] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState('');

    // Format time ago
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

    // Format expiry date
    const formatExpiryDate = (date) => {
        if (!date) return 'N/A';
        const expiryDate = new Date(date);
        const month = (expiryDate.getMonth() + 1).toString().padStart(2, '0');
        const year = expiryDate.getFullYear();
        return `${month}/${year}`;
    };

    // Format quantity display
    const formatQuantity = (quantity) => {
        if (!quantity) return 'N/A';
        return `${quantity} ${quantity === 1 ? 'serving' : 'servings'} Available`;
    };

    // Fetch available donations (on mount and when donor posts a new donation via socket)
    useEffect(() => {
        const fetchDonations = async () => {
            try {
                setLoading(true);
                setError(null);
                console.log('[ReceiverFindFood] Fetching available donations...');
                
                const response = await getAvailableDonations();
                
                if (response.success && response.donations) {
                    // Default coordinates (Sri Lanka center) for donations without geocoded addresses
                    const defaultCoordinates = [7.0873, 80.0144];
                    
                    // Transform donation data to match component structure
                    // Show ALL donations - use default coordinates if geocoding failed
                    const transformedItems = response.donations.map(donation => ({
                        id: donation.id,
                        trackingId: donation.trackingId,
                        title: donation.itemName,
                        listedTime: getTimeAgo(donation.createdAt),
                        expiry: formatExpiryDate(donation.expiryDate),
                        quantity: formatQuantity(donation.quantity),
                        impactPeople: donation.quantity || 0,
                        image: donation.imageUrl,
                        // Use provided coordinates or default to Sri Lanka center
                        position: donation.position && Array.isArray(donation.position) && donation.position.length === 2
                            ? donation.position
                            : defaultCoordinates,
                        hasValidCoordinates: !!(donation.position && Array.isArray(donation.position) && donation.position.length === 2),
                        // Additional data for tooltips and details
                        donation: donation, // Store full donation object
                        foodCategory: donation.foodCategory,
                        storageRecommendation: donation.storageRecommendation,
                        aiQualityScore: donation.aiQualityScore,
                        preferredPickupDate: donation.preferredPickupDate,
                        preferredPickupTimeFrom: donation.preferredPickupTimeFrom,
                        preferredPickupTimeTo: donation.preferredPickupTimeTo,
                        donorName: donation.donorName,
                        donorType: donation.donorType,
                        donorAddress: donation.donorAddress,
                    }));
                    
                    const vendorDonations = products
                        .filter(p => p.isDonation)
                        .map(p => ({
                            id: p.id,
                            isVendor: true,
                            trackingId: `VND-${p.id}`,
                            title: p.name,
                            listedTime: 'Recently',
                            expiry: formatExpiryDate(p.expiryDate),
                            quantity: formatQuantity(p.quantity),
                            impactPeople: p.quantity || 0,
                            image: p.image,
                            position: p.position || defaultCoordinates,
                            hasValidCoordinates: true,
                            donation: p,
                            foodCategory: p.category,
                            donorName: p.vendorName || 'Retail Vendor',
                            donorType: 'Retailer',
                        }));

                    const finalItems = [...transformedItems, ...vendorDonations];
                    console.log(`[ReceiverFindFood] Loaded ${transformedItems.length} donations and ${vendorDonations.length} vendor items`);
                    setItems(finalItems);
                } else {
                    // Fallback to only vendor donations if API fails or returns empty
                    const vendorDonations = products
                        .filter(p => p.isDonation)
                        .map(p => ({
                            id: p.id,
                            isVendor: true,
                            trackingId: `VND-${p.id}`,
                            title: p.name,
                            listedTime: 'Recently',
                            expiry: 'N/A',
                            quantity: formatQuantity(p.quantity),
                            image: p.image,
                            position: p.position || [7.0873, 80.0144],
                            hasValidCoordinates: true,
                            donation: p,
                            foodCategory: p.category,
                            donorName: p.vendorName || 'Retail Vendor',
                        }));
                    setItems(vendorDonations);
                }
            } catch (err) {
                console.error('[ReceiverFindFood] Error fetching donations:', err);
                const vendorDonations = products
                    .filter(p => p.isDonation)
                    .map(p => ({
                        id: p.id,
                        isVendor: true,
                        trackingId: `VND-${p.id}`,
                        title: p.name,
                        listedTime: 'Recently',
                        expiry: 'N/A',
                        quantity: formatQuantity(p.quantity),
                        image: p.image,
                        position: p.position || [7.0873, 80.0144],
                        hasValidCoordinates: true,
                        donation: p,
                        foodCategory: p.category,
                        donorName: p.vendorName || 'Retail Vendor',
                    }));
                setItems(vendorDonations);
                // setError(err.message || 'Failed to load donations');
            } finally {
                setLoading(false);
            }
        };

        fetchDonations();
        const unsubscribe = onDonationCreated(() => fetchDonations());
        return () => unsubscribe();
    }, []);

    // Load profile address for default in modals
    useEffect(() => {
        let cancelled = false;
        getCurrentUser()
            .then(res => {
                if (!cancelled && res?.user?.address) setProfileAddress(res.user.address);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const handleUseMyLocation = () => {
        setLocationError('');
        setLocationLoading(true);
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported.');
            setLocationLoading(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                if (lat < 5 || lat > 10 || lng < 79 || lng > 82) {
                    setLocationError('Location is outside Sri Lanka.');
                    setReceiverPosition(null);
                    setReceiverAddress('');
                } else {
                    setReceiverPosition([lat, lng]);
                    const addr = await reverseGeocode(lat, lng);
                    setReceiverAddress(addr || 'Location set');
                }
                setLocationLoading(false);
            },
            () => {
                setLocationError('Could not get location. Check permissions or try Select location.');
                setLocationLoading(false);
            },
            { timeout: 10000, maximumAge: 60000 }
        );
    };

    const handleSelectLocationConfirm = (lat, lng, address) => {
        setReceiverPosition([lat, lng]);
        setReceiverAddress(address || 'Location set');
        setShowLocationModal(false);
    };

    const handleClaim = (donationId) => {
        setClaimingDonationId(donationId);
        setClaimLocationModalOpen(true);
    };

    const handleClaimLocationConfirm = async (lat, lng, address) => {
        const donationId = claimingDonationId;
        const selectedItem = items.find(item => item.id === donationId);
        
        setClaimLocationModalOpen(false);
        setClaimingDonationId(null);
        if (!donationId) return;

        // Handle Vendor Claim
        if (selectedItem?.isVendor) {
            try {
                claimVendorProduct(selectedItem.donation, {
                    receiverLatitude: lat,
                    receiverLongitude: lng,
                    receiverAddress: address || '',
                });
                navigate('/receiver/my-claims');
                return;
            } catch (err) {
                alert('Failed to claim vendor product');
                return;
            }
        }

        // Handle Regular API Claim
        try {
            const response = await claimDonation(donationId, {
                receiverLatitude: lat,
                receiverLongitude: lng,
                receiverAddress: address || '',
            });
            if (response.success) {
                setItems(prev => prev.filter(item => {
                    const id = item.id || item.donation?._id || item.donation?.id;
                    return id !== donationId;
                }));
                navigate('/receiver/my-claims');
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to claim donation. Please try again.';
            alert(msg);
        }
    };

    if (loading) {
        return <PageLoader message="Loading available donations..." />;
    }

    if (error) {
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
                <ReceiverFooter />
            </>
        );
    }

    // Handle card click to center map on marker
    const handleCardClick = (item) => {
        if (item.position && window.mapInstance) {
            window.mapInstance.setView(item.position, 15, {
                animate: true,
                duration: 0.5
            });
        }
    };

    return (
        <>
            <ReceiverNavbar />
            <div className="find-food-page">
                <div className="sidebar-section">
                    <Sidebar items={items} onCardClick={handleCardClick} onClaim={handleClaim} />
                </div>
                <div className="map-section">
                    <MapSection
                        items={items}
                        receiverPosition={receiverPosition}
                        receiverAddress={receiverAddress}
                        onSelectLocation={() => setShowLocationModal(true)}
                        onUseMyLocation={handleUseMyLocation}
                        locationLoading={locationLoading}
                        locationError={locationError}
                    />
                </div>
            </div>

            <LocationMapModal
                isOpen={showLocationModal}
                onClose={() => setShowLocationModal(false)}
                onConfirm={handleSelectLocationConfirm}
                defaultAddress={receiverAddress || profileAddress}
                title="Select your location"
            />

            <LocationMapModal
                isOpen={claimLocationModalOpen}
                onClose={() => {
                    setClaimLocationModalOpen(false);
                    setClaimingDonationId(null);
                }}
                onConfirm={handleClaimLocationConfirm}
                defaultAddress={receiverAddress}
                title="Confirm delivery location"
            />

            <ReceiverFooter />
        </>
    );
};

export default FindFood;
