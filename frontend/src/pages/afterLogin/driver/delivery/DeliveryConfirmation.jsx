import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DriverNavbar from "../../../../components/afterLogin/dashboard/driverSection/navbar/DriverNavbar";
import DriverFooter from "../../../../components/afterLogin/dashboard/driverSection/footer/DriverFooter";
import './DeliveryConfirmation.css';
import { MapContainer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { confirmDelivery, getDonationTracking } from '../../../../services/donationApi';
import { startLocationTracking, stopLocationTracking } from '../../../../services/locationService';
import ChatIconButton from '../../../../components/afterLogin/donationChat/ChatIconButton';
import { getUser } from '../../../../utils/auth';
import PageLoader from '../../../../components/common/PageLoader/PageLoader';
import { updateDriverLocation, startDemo, stopDemo } from '../../../../services/api';
import { generateRouteWaypoints, simulateMovement, stopSimulation } from '../../../../services/demoModeService';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const mobileBlueOptions = { color: '#3b82f6', weight: 6, opacity: 0.8 };

const ZoomHandler = () => {
    const map = useMap();
    return (
        <div className="custom-zoom-controls">
            <button className="zoom-btn zoom-in" onClick={() => map.zoomIn()}>+</button>
            <button className="zoom-btn zoom-out" onClick={() => map.zoomOut()}>-</button>
        </div>
    );
};

// Updates map center when driver moves without resetting zoom
function MapCenterUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center && center.length === 2) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

function DeliveryConfirmation() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const donationId = searchParams.get('donationId');
    const [isConfirming, setIsConfirming] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [donationData, setDonationData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [driverLocation, setDriverLocation] = useState(null);
    const [error, setError] = useState(null);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [demoProgress, setDemoProgress] = useState({ currentIndex: 0, total: 0 });
    const [demoRouteWaypoints, setDemoRouteWaypoints] = useState([]);
    const [routeLoading, setRouteLoading] = useState(false);

    const fetchDonationData = async () => {
        if (!donationId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await getDonationTracking(donationId);

            if (response.success && response.tracking) {
                setDonationData(response.tracking);
            } else {
                setError('Failed to load donation data');
            }
        } catch (err) {
            console.error('[DeliveryConfirmation] Error fetching donation data:', err);
            setError(err.message || 'Failed to load donation data');
        } finally {
            setLoading(false);
        }
    };

    // Fetch donation data on mount and when donationId changes
    useEffect(() => {
        fetchDonationData();
    }, [donationId]);

    // Refetch when page gains focus (e.g. after driver confirms pickup on Pickup page and returns)
    useEffect(() => {
        const handleFocus = () => {
            if (donationId && !loading) {
                getDonationTracking(donationId).then((response) => {
                    if (response?.success && response?.tracking) {
                        setDonationData(response.tracking);
                    }
                }).catch(() => {});
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [donationId, loading]);

    // Start location tracking when component mounts (only if demo mode is off)
    useEffect(() => {
        if (!donationId || isDemoMode) return;

        // Start continuous location tracking
        startLocationTracking(async (location, error) => {
            if (error) {
                console.error('[DeliveryConfirmation] Location tracking error:', error);
                return;
            }

            if (location) {
                setDriverLocation([location.latitude, location.longitude]);
                
                // Update driver location on server every 5 seconds
                try {
                    await updateDriverLocation(location.latitude, location.longitude);
                } catch (err) {
                    console.error('[DeliveryConfirmation] Error updating driver location on server:', err);
                }
            }
        });

        // Cleanup on unmount
        return () => {
            stopLocationTracking();
        };
    }, [donationId, isDemoMode]);

    // Demo mode handler
    const handleDemoModeToggle = async () => {
        if (isDemoMode) {
            // Disable demo mode
            stopSimulation();
            try {
                await stopDemo();
            } catch (err) {
                console.error('[DeliveryConfirmation] Error stopping server demo:', err);
            }
            setIsDemoMode(false);
            setDemoProgress({ currentIndex: 0, total: 0 });
            setDemoRouteWaypoints([]);
            // Resume real location tracking if available
            if (donationId) {
                startLocationTracking(async (location, error) => {
                    if (!error && location) {
                        setDriverLocation([location.latitude, location.longitude]);
                        try {
                            await updateDriverLocation(location.latitude, location.longitude);
                        } catch (err) {
                            console.error('[DeliveryConfirmation] Error updating driver location:', err);
                        }
                    }
                });
            }
        } else {
            // Enable demo mode
            if (!donationData) {
                alert('Please wait for donation data to load');
                return;
            }

            // Stop real GPS tracking
            stopLocationTracking();

            // First, get driver's current location from server
            // Since pickup is confirmed, driver should be at donor location
            let startLocation = null;
            
            // Priority 1: Use donor location as starting point (since pickup is confirmed, driver is at donor location)
            if (donationData?.donor?.location) {
                startLocation = {
                    lat: donationData.donor.location.latitude,
                    lng: donationData.donor.location.longitude
                };
                console.log('[DeliveryConfirmation] Using donor location as starting point (pickup confirmed):', startLocation);
            }
            // Priority 2: Use driver location from tracking data
            else if (donationData?.driver?.location) {
                startLocation = {
                    lat: donationData.driver.location.latitude,
                    lng: donationData.driver.location.longitude
                };
                console.log('[DeliveryConfirmation] Using driver location from tracking data:', startLocation);
            }
            // Priority 3: Use current driverLocation state if available
            else if (driverLocation && driverLocation.length === 2) {
                startLocation = {
                    lat: driverLocation[0],
                    lng: driverLocation[1]
                };
                console.log('[DeliveryConfirmation] Using driver location from state:', startLocation);
            }
            // Priority 4: Try to get from browser geolocation as fallback
            else {
                try {
                    const location = await new Promise((resolve, reject) => {
                        if (!navigator.geolocation) {
                            reject(new Error('Geolocation not supported'));
                            return;
                        }
                        navigator.geolocation.getCurrentPosition(
                            (position) => resolve({
                                lat: position.coords.latitude,
                                lng: position.coords.longitude
                            }),
                            reject,
                            { timeout: 5000 }
                        );
                    });
                    startLocation = location;
                    console.log('[DeliveryConfirmation] Using driver location from browser geolocation:', startLocation);
                } catch (err) {
                    console.warn('[DeliveryConfirmation] Could not get driver location from geolocation:', err);
                }
            }
            
            const endLocation = donationData?.receiver?.location
                ? { lat: donationData.receiver.location.latitude, lng: donationData.receiver.location.longitude }
                : null;

            if (!startLocation || !endLocation) {
                alert(`Cannot start demo mode: Missing location data.\nStart: ${startLocation ? 'OK' : 'Missing'}\nEnd (Receiver): ${endLocation ? 'OK' : 'Missing'}`);
                return;
            }

            // Update driver location state with starting location
            setDriverLocation([startLocation.lat, startLocation.lng]);

            try {
                await updateDriverLocation(startLocation.lat, startLocation.lng);
            } catch (err) {
                console.error('[DeliveryConfirmation] Error updating starting location:', err);
            }

            setRouteLoading(true);
            try {
                const waypoints = await generateRouteWaypoints(
                    startLocation.lat,
                    startLocation.lng,
                    endLocation.lat,
                    endLocation.lng
                );

                if (waypoints.length === 0) {
                    alert('Failed to generate path waypoints');
                    return;
                }

                setDemoRouteWaypoints(waypoints.map((w) => [w.latitude, w.longitude]));

                console.log(`[DeliveryConfirmation] Starting demo mode: ${waypoints.length} waypoints from driver to receiver`);

                try {
                    await startDemo(waypoints);
                } catch (err) {
                    console.error('[DeliveryConfirmation] Error starting server demo (movement will only show while you stay on this page):', err);
                }

                const success = simulateMovement(
                    waypoints,
                    async (waypoint) => {
                        setDriverLocation([waypoint.latitude, waypoint.longitude]);
                        setDemoProgress({ currentIndex: waypoint.index + 1, total: waypoint.total });
                        try {
                            await updateDriverLocation(waypoint.latitude, waypoint.longitude);
                        } catch (err) {
                            console.error('[DeliveryConfirmation] Error updating driver location in demo mode:', err);
                        }
                        if (waypoint.index === waypoint.total - 1) {
                            console.log('[DeliveryConfirmation] Demo mode: Reached receiver location');
                        }
                    },
                    2500
                );

                if (success) {
                    setIsDemoMode(true);
                } else {
                    alert('Failed to start demo mode');
                }
            } finally {
                setRouteLoading(false);
            }
        }
    };

    // Cleanup demo mode on unmount
    useEffect(() => {
        return () => {
            if (isDemoMode) {
                stopSimulation();
            }
        };
    }, [isDemoMode]);

    const donationStatus = donationData?.donation?.status;
    const canConfirmDelivery = donationStatus === 'picked_up';

    const handleConfirmDelivery = async () => {
        if (!donationId) {
            alert('Donation ID is missing');
            return;
        }

        if (!canConfirmDelivery) {
            alert('Confirm pickup at the donor first, then return here to confirm delivery.');
            return;
        }

        if (isConfirmed) {
            alert('Delivery already confirmed');
            return;
        }

        setIsConfirming(true);
        try {
            const response = await confirmDelivery(donationId);
            if (response.success) {
                setIsConfirmed(true);
                alert('Delivery confirmed! Emails have been sent to donor and receiver.');
                // Redirect after a delay
                setTimeout(() => {
                    navigate('/driver/delivery');
                }, 2000);
            } else {
                alert(response.message || 'Failed to confirm delivery');
            }
        } catch (error) {
            console.error('Error confirming delivery:', error);
            alert(error.response?.data?.message || error.message || 'Failed to confirm delivery. Please try again.');
        } finally {
            setIsConfirming(false);
        }
    };

    // Check if donationId is provided
    useEffect(() => {
        if (!donationId) {
            alert('No donation ID provided');
            navigate('/driver/delivery');
        }
    }, [donationId, navigate]);

    if (loading) {
        return <PageLoader message="Loading donation details..." />;
    }

    if (error) {
        return (
            <>
                <DriverNavbar />
                <div className='delivery-confirmation' style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '600px', padding: '20px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ color: '#d32f2f', fontSize: '16px', marginBottom: '16px' }}>⚠️ {error}</p>
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

    // Get coordinates from donation data
    const receiverLocation = donationData?.receiver?.location
        ? [donationData.receiver.location.latitude, donationData.receiver.location.longitude]
        : [6.850, 79.930]; // Default fallback

    const currentLocation = driverLocation || (donationData?.driver?.location
        ? [donationData.driver.location.latitude, donationData.driver.location.longitude]
        : [6.860, 79.925]); // Default fallback

    // Build route path: use road route waypoints when in demo, else simple segment
    const routePath = demoRouteWaypoints.length > 0
        ? demoRouteWaypoints
        : [currentLocation, receiverLocation];

    // Custom icons
    const receiverIcon = new L.DivIcon({
        className: 'custom-icon',
        html: `<div style="background-color: #F44336; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    const driverIcon = new L.DivIcon({
        className: 'custom-icon',
        html: `<div style="width: 40px; height: 40px; background: #2196F3; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; border: 3px solid white; box-shadow: 0 4px 10px rgba(33, 150, 243, 0.3);">🚌</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    return (
        <>
            <DriverNavbar />
            <div className='delivery-confirmation'>
                <div className='delivery-confirmation__s1'>
                    {/* Demo Mode Toggle Button */}
                    <button
                        onClick={handleDemoModeToggle}
                        disabled={routeLoading}
                        className={`demo-mode-toggle ${isDemoMode ? 'demo-mode-active' : ''}`}
                        title={isDemoMode ? 'Disable Demo Mode' : 'Enable Demo Mode - Simulate movement for competition'}
                    >
                        {routeLoading ? '⏳ Loading route...' : (isDemoMode ? '🛑 Stop Demo' : '▶️ Demo Mode')}
                    </button>

                    {/* Demo Mode Status Indicator */}
                    {isDemoMode && (
                        <div className="delivery-confirmation__demo-status">
                            <span>🎬 Demo Mode Active</span>
                            {demoProgress.total > 0 && (
                                <span>({demoProgress.currentIndex}/{demoProgress.total})</span>
                            )}
                        </div>
                    )}

                    {/* Google Maps link - open in new tab, no API key */}
                    {donationData?.receiver?.location && (
                        <a
                            href={`https://www.google.com/maps?q=${donationData.receiver.location.latitude},${donationData.receiver.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="delivery-confirmation__google-maps-link"
                        >
                            Open delivery in Google Maps
                        </a>
                    )}

                    <MapContainer
                        center={currentLocation}
                        zoom={14}
                        scrollWheelZoom={true}
                        style={{ height: "100%", width: "100%" }}
                        zoomControl={false}
                        key="delivery-map"
                    >
                        {donationData?.receiver && (
                            <Marker position={receiverLocation} icon={receiverIcon}>
                                <Popup>
                                    <strong>Delivery Location</strong><br/>
                                    {donationData.receiver.name || 'Receiver'}<br/>
                                    {donationData.receiver.address || ''}
                                </Popup>
                            </Marker>
                        )}
                        {driverLocation && (
                            <Marker position={currentLocation} icon={driverIcon}>
                                <Popup>
                                    <strong>Your Location</strong><br/>
                                    Live tracking active
                                </Popup>
                            </Marker>
                        )}
                        <Polyline pathOptions={mobileBlueOptions} positions={routePath} />
                        <MapCenterUpdater center={currentLocation} />
                        <ZoomHandler />
                    </MapContainer>
                </div>
                <div className='delivery-confirmation__s2'>
                    {/* Delivery Details card - same styling as pickup/delivery panels */}
                    <div className='delivery-confirmation__panel'>
                        <h2>Delivery Details</h2>
                        {donationData && (
                            <>
                                <p><strong>Item:</strong> {donationData.donation.itemName}</p>
                                <p><strong>Quantity:</strong> {donationData.donation.quantity} servings</p>
                                <p><strong>Tracking ID:</strong> {donationData.donation.trackingId}</p>
                                {donationData.receiver && (
                                    <>
                                        <p><strong>Receiver:</strong> {donationData.receiver.name}</p>
                                        {donationData.receiver.contactNo && (
                                            <p><strong>Contact:</strong> {donationData.receiver.contactNo}</p>
                                        )}
                                        <p><strong>Address:</strong> {donationData.receiver.address}</p>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                    {/* Confirm Delivery card */}
                    <div className='delivery-confirmation__panel'>
                        {isConfirmed ? (
                            <div className='delivery-confirmation__success'>
                                <div className='delivery-confirmation__success-title'>✓ Delivery Confirmed!</div>
                                <p className='delivery-confirmation__success-text'>
                                    Emails have been sent to the donor and receiver. Redirecting...
                                </p>
                            </div>
                        ) : (
                            <>
                                {!canConfirmDelivery && (
                                    <p className='delivery-confirmation__warning'>
                                        Confirm pickup at the donor first, then return here to confirm delivery.
                                    </p>
                                )}
                                <button
                                    onClick={handleConfirmDelivery}
                                    disabled={isConfirming || !donationId || !canConfirmDelivery}
                                    className='delivery-confirmation__btn'
                                >
                                    {isConfirming ? 'Confirming Delivery...' : 'Confirm Delivery'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <DriverFooter />
            {donationId && donationData && (
                <ChatIconButton donationId={donationId} currentUser={getUser()} title="Chat about this delivery" />
            )}
        </>
    );
}

export default DeliveryConfirmation;
