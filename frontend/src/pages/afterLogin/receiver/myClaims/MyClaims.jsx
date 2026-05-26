import { useState, useEffect } from 'react';
import "./MyClaims.css";
import ReceiverNavbar from "../../../../components/afterLogin/dashboard/ReceiverSection/navbar/ReceiverNavbar";
import ReceiverFooter from "../../../../components/afterLogin/dashboard/ReceiverSection/footer/ReceiverFooter";
import InTransitCard from "../../../../components/afterLogin/receiver/myClaims/InTransitCard";
import LookingForDriverCard from "../../../../components/afterLogin/receiver/myClaims/LookingForDriverCard";
import CompletedHistoryCard from "../../../../components/afterLogin/receiver/myClaims/CompletedHistoryCard";
import { getMyClaims, cancelClaim } from '../../../../services/donationApi';
import { getSocket, onDonationInTransit, onDeliveryConfirmed } from '../../../../services/socket';
import { useNavigate } from 'react-router-dom';
import PageLoader from '../../../../components/common/PageLoader/PageLoader';
import { useMarketplace } from '../../../../contexts/MarketplaceContext';

const Myclaims = () => {
    const navigate = useNavigate();
    const { vendorClaims } = useMarketplace();
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cancellingId, setCancellingId] = useState(null);

    // Fetch claimed donations - only on initial load
    useEffect(() => {
        let isMounted = true;

        const fetchClaims = async () => {
            try {
                setLoading(true);
                setError(null);
                console.log('[MyClaims] Fetching my claims...');
                
                const response = await getMyClaims();
                
                if (!isMounted) return;
                
                if (response.success && response.donations) {
                    console.log(`[MyClaims] Loaded ${response.donations.length} claimed donations`);
                    setDonations(response.donations);
                } else {
                    setDonations([]);
                }
            } catch (err) {
                if (!isMounted) return;
                console.error('[MyClaims] Error fetching claims:', err);
                setError(err.message || 'Failed to load your claims');
                setDonations([]);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchClaims();
        getSocket();

        const handleInTransit = (payload) => {
            fetchClaims();
            const donationId = payload?.donationId;
            if (donationId) {
                // Driver accepted the donation: go to live tracking for this claim
                navigate(`/receiver/track-order?donationId=${donationId}`);
            }
        };

        const handleDeliveryConfirmed = () => {
            // Delivery finished: just refresh lists; tracking page will handle redirect back
            fetchClaims();
        };

        const unsubInTransit = onDonationInTransit(handleInTransit);
        const unsubDeliveryConfirmed = onDeliveryConfirmed(handleDeliveryConfirmed);

        return () => {
            isMounted = false;
            unsubInTransit();
            unsubDeliveryConfirmed();
        };
    }, [navigate]);

    // After receiver claims: show in Looking for Driver; only after driver accepts, show in In Transit
    const transformedVendorClaims = vendorClaims.map(vc => ({
        id: `vclaim-${vc.id}`,
        itemName: vc.name,
        foodCategory: vc.category,
        quantity: vc.quantity,
        donorName: vc.vendorName || 'Retail Vendor',
        status: vc.status || 'assigned',
        assignedDriverId: vc.assignedDriverId || null,
        imageUrl: vc.image,
        isVendor: true
    }));

    const allDonations = [...donations, ...transformedVendorClaims];

    const lookingForDriver = allDonations.filter(
        (d) => d.status === 'claimed' && !d.isVendor
    );
    const inTransit = allDonations.filter(
        (d) =>
            !d.isVendor &&
            (d.status === 'driver_assigned' || d.status === 'in_transit' || d.status === 'picked_up')
    );
    const completed = allDonations.filter(d => d.status === 'delivered');

    const handleCancelClaim = async (donation) => {
        const donationId = donation?.id || donation?._id;
        if (!donationId) return;
        if (
            !window.confirm(
                'Cancel this claim? The listing will be available for other receivers. You can only do this before a driver is assigned.'
            )
        ) {
            return;
        }
        try {
            setCancellingId(donationId);
            await cancelClaim(donationId);
            setDonations((prev) =>
                prev.filter((d) => (d.id || d._id) !== donationId)
            );
        } catch (err) {
            console.error('[MyClaims] Error cancelling claim:', err);
            alert(err.message || 'Failed to cancel claim');
        } finally {
            setCancellingId(null);
        }
    };

    if (loading) {
        return <PageLoader message="Loading your claims..." />;
    }

    if (error) {
        return (
            <>
                <ReceiverNavbar />
                <div className="myclaims-container">
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
                <ReceiverFooter />
            </>
        );
    }

    return (
        <>
            <ReceiverNavbar />
            <div className="myclaims-container">
                <div className="intransit">
                    <h2 className="active-donations">In Transit Donation </h2>
                    <div className="donation-cards">
                        {inTransit.length > 0 ? (
                            inTransit.map((donation) => (
                                <InTransitCard key={donation.id} donation={donation} />
                            ))
                        ) : (
                            <p style={{ color: '#666', padding: '20px', textAlign: 'center' }}>
                                No donations in transit
                            </p>
                        )}
                    </div>
                </div>
                <div className="looking">
                    <h2 className="active-donations">Looking for Driver </h2>
                    <div className="donation-cards">
                        {lookingForDriver.length > 0 ? (
                            lookingForDriver.map((donation) => (
                                <LookingForDriverCard
                                    key={donation.id}
                                    donation={donation}
                                    onCancelClaim={handleCancelClaim}
                                    cancelling={cancellingId === donation.id}
                                />
                            ))
                        ) : (
                            <p style={{ color: '#666', padding: '20px', textAlign: 'center' }}>
                                No donations waiting for driver
                            </p>
                        )}
                    </div>
                </div>
                <div className="complited">
                    <h2 className="active-donations" style={{ color: "darkgreen" }}>Completed History </h2>
                    <div className="donation-cards">
                        {completed.length > 0 ? (
                            completed.map((donation) => (
                                <CompletedHistoryCard key={donation.id} donation={donation} />
                            ))
                        ) : (
                            <p style={{ color: '#666', padding: '20px', textAlign: 'center' }}>
                                No completed donations
                            </p>
                        )}
                    </div>
                </div>
            </div>
            <ReceiverFooter />
        </>
    );
};

export default Myclaims;


