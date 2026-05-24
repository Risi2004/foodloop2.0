import { useState, useEffect } from 'react';
import DriverNavbar from "../../../../components/afterLogin/dashboard/driverSection/navbar/DriverNavbar";
import DriverFooter from "../../../../components/afterLogin/dashboard/driverSection/footer/DriverFooter";
import DeliverCard from "../../../../components/afterLogin/driver/delivery/DeliveryCard";
import DeliveryMap from "../../../../components/afterLogin/driver/delivery/DeliveryMap";
import { getAvailablePickups, getActiveDeliveries, acceptOrder } from '../../../../services/donationApi';
import { updateDriverLocation } from '../../../../services/api';
import PageLoader from '../../../../components/common/PageLoader/PageLoader';
import { onDonationClaimed } from '../../../../services/socket';
import { useNavigate } from 'react-router-dom';
import './Delivery.css';

function Delivery() {
    const navigate = useNavigate();
    const [pickups, setPickups] = useState([]);
    const [activeDeliveries, setActiveDeliveries] = useState([]);
    const [selectedPickup, setSelectedPickup] = useState(null);
    const [driverLocation, setDriverLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [acceptingOrderId, setAcceptingOrderId] = useState(null);

    // Fetch available pickups, active deliveries, and driver location
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                console.log('[Delivery] Fetching available pickups and active deliveries...');
                
                // Fetch pickups and active deliveries in parallel
                const [pickupsResponse, deliveriesResponse] = await Promise.all([
                    getAvailablePickups(),
                    getActiveDeliveries()
                ]);
                
                if (pickupsResponse && pickupsResponse.success && pickupsResponse.pickups) {
                    console.log(`[Delivery] Loaded ${pickupsResponse.pickups.length} pickups`);
                    setPickups(pickupsResponse.pickups);
                    
                    // Set driver location from response
                    if (pickupsResponse.driverLocation) {
                        setDriverLocation(pickupsResponse.driverLocation);
                    }
                } else {
                    setPickups([]);
                }

                if (deliveriesResponse && deliveriesResponse.success && deliveriesResponse.deliveries) {
                    console.log(`[Delivery] Loaded ${deliveriesResponse.deliveries.length} active deliveries`);
                    setActiveDeliveries(deliveriesResponse.deliveries);
                    
                    // Set driver location from deliveries response if not already set
                    if (!driverLocation && deliveriesResponse.driverLocation) {
                        setDriverLocation(deliveriesResponse.driverLocation);
                    }
                } else {
                    setActiveDeliveries([]);
                }
            } catch (err) {
                console.error('[Delivery] Error fetching data:', err);
                setError(err.message || 'Failed to load pickups');
                setPickups([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const unsubscribe = onDonationClaimed(() => fetchData());
        return () => unsubscribe();
    }, []);

    const handlePickupSelect = (pickup) => {
        setSelectedPickup(pickup);
    };

    const handleAcceptOrder = async (pickup) => {
        if (!pickup?.id) return;
        if (activeDeliveries.length > 0) {
            alert('You can only have 1 order at a time. Complete your current delivery first.');
            return;
        }
        setAcceptingOrderId(pickup.id);
        try {
            await acceptOrder(pickup.id);
            navigate(`/driver/pickup?donationId=${pickup.id}`);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to accept order. Please try again.';
            alert(msg);
        } finally {
            setAcceptingOrderId(null);
        }
    };

    const handleInTransitSelect = (delivery) => {
        if (delivery.status === 'assigned') {
            // Pickup not confirmed yet – go to pickup page to confirm pickup
            navigate(`/driver/pickup?donationId=${delivery.id}`);
        } else {
            // Pickup confirmed (picked_up) – go to delivery confirmation page
            navigate(`/driver/delivery-confirmation?donationId=${delivery.id}`);
        }
    };

    const handleLocationUpdate = async (latitude, longitude) => {
        try {
            console.log('[Delivery] Updating driver location:', { latitude, longitude });
            
            const response = await updateDriverLocation(latitude, longitude);
            
            if (response.success && response.location) {
                setDriverLocation(response.location);
                console.log('[Delivery] Driver location updated successfully');
                
                // Refresh pickups to recalculate distances
                const pickupsResponse = await getAvailablePickups();
                if (pickupsResponse.success && pickupsResponse.pickups) {
                    setPickups(pickupsResponse.pickups);
                    
                    // Update selected pickup if one is selected
                    if (selectedPickup) {
                        const updatedPickup = pickupsResponse.pickups.find(p => p.id === selectedPickup.id);
                        if (updatedPickup) {
                            setSelectedPickup(updatedPickup);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[Delivery] Error updating location:', err);
            throw err; // Re-throw to let LocationBox handle the error
        }
    };

    if (loading) {
        return <PageLoader message="Loading available pickups..." />;
    }

    if (error) {
        return (
            <>
                <DriverNavbar />
                <div className='delivery'>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        height: '600px',
                        flexDirection: 'column',
                        gap: '16px',
                        padding: '20px',
                        width: '100%'
                    }}>
                        <p style={{ color: '#d32f2f', fontSize: '16px', textAlign: 'center' }}>
                            ⚠️ {error}
                        </p>
                        <button 
                            onClick={() => window.location.reload()} 
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#1F4E36',
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
                <DriverFooter />
            </>
        );
    }

    return (
        <>
            <DriverNavbar />
            <div className='delivery'>
                {/* Left: Content (In Transit + Available Pickups) */}
                <div className='delivery__s2'>
                    {/* In Transit Pickups - card panel like DriverDetails/Food on pickup */}
                    {activeDeliveries.length > 0 && (
                        <div className='delivery__panel'>
                            <div className='delivery__s2__info'>
                                <h1>In Transit Pickups</h1>
                                <h5>{activeDeliveries.length} Pickup{activeDeliveries.length !== 1 ? 's' : ''} In Transit</h5>
                            </div>
                            {activeDeliveries.map((delivery) => {
                                const pickupConfirmed = delivery.status === 'picked_up';
                                return (
                                <div
                                    key={delivery.id}
                                    onClick={() => handleInTransitSelect(delivery)}
                                    className='delivery__in-transit-card'
                                >
                                    <div className='delivery__in-transit-card__inner'>
                                        <div>
                                            <h3>{delivery.itemName}</h3>
                                            <p>To: {delivery.receiverName}</p>
                                            <p className='delivery__in-transit-card__distance'>
                                                {pickupConfirmed
                                                    ? (delivery.driverToReceiverDistanceFormatted || 'Calculating distance...')
                                                    : (delivery.driverToDonorDistanceFormatted || 'Calculating distance...')}
                                            </p>
                                        </div>
                                        <button className='delivery__in-transit-card__btn' type="button">
                                            {pickupConfirmed ? 'Confirm Delivery' : 'Confirm Pickup Here'}
                                        </button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Available Pickups Section - card panel like pickup page */}
                    <div className='delivery__panel'>
                        <div className='delivery__s2__info'>
                            <h1>Available Pickups</h1>
                            <h5>{pickups.length} Pickup{pickups.length !== 1 ? 's' : ''} Found</h5>
                        </div>
                        {pickups.length === 0 ? (
                            <div className='delivery__empty-state'>
                                {!driverLocation ? (
                                    <>
                                        <p>Add your location to see available pickups within 40 km</p>
                                        <p className='delivery__empty-state__hint'>Use the map to set your current location</p>
                                    </>
                                ) : (
                                    <>
                                        <p>No pickups within 40 km</p>
                                        <p className='delivery__empty-state__hint'>Check back later for new pickup requests</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="delivery__pickups-list">
                                {pickups.map((pickup) => (
                                    <DeliverCard
                                        key={pickup.id}
                                        donation={pickup}
                                        isSelected={selectedPickup?.id === pickup.id}
                                        onClick={() => handlePickupSelect(pickup)}
                                        onAcceptOrder={handleAcceptOrder}
                                        isAccepting={acceptingOrderId === pickup.id}
                                        hasActiveDelivery={activeDeliveries.length > 0}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                {/* Right: Map */}
                <div className='delivery__s1'>
                    <DeliveryMap 
                        selectedPickup={selectedPickup}
                        driverLocation={driverLocation}
                        onLocationUpdate={handleLocationUpdate}
                    />
                </div>
            </div>
            <DriverFooter />
        </>
    )
}

export default Delivery; 