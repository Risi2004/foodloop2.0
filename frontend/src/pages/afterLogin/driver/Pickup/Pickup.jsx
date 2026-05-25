import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DriverNavbar from "../../../../components/afterLogin/dashboard/driverSection/navbar/DriverNavbar";
import DriverFooter from "../../../../components/afterLogin/dashboard/driverSection/footer/DriverFooter";
import './Pickup.css'
import { MapContainer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import DriverDetails from "../../../../components/afterLogin/driver/pickup/driverDetails/DriverDetails";
import Food from "../../../../components/afterLogin/driver/pickup/Food/Food";
import LiveJourney from "../../../../components/afterLogin/driver/pickup/liveJourney/LiveJourney";
import ChatIconButton from "../../../../components/afterLogin/donationChat/ChatIconButton";
import { confirmPickup, getDonationTracking, getDriverStatistics } from '../../../../services/donationApi';
import MapTileLayer from '../../../../components/shared/map/MapTileLayer';
import MapInvalidateSize from '../../../../components/shared/map/MapInvalidateSize';
import { startLocationTracking, stopLocationTracking } from '../../../../services/locationService';
import { updateDriverLocation, startDemo, stopDemo } from '../../../../services/api';
import { generateRouteWaypoints, simulateMovement, stopSimulation } from '../../../../services/demoModeService';
import { getUser } from '../../../../utils/auth';
import PageLoader from '../../../../components/common/PageLoader/PageLoader';

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
    )
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

function Pickup() {
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
    const locationUpdateIntervalRef = useRef(null);
    const [impactProgress, setImpactProgress] = useState(null);

    // Fetch donation data
    useEffect(() => {
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
                    // If donation already physically confirmed (picked_up), show confirmed state
                    if (response.tracking?.donation?.status === 'picked_up') {
                        setIsConfirmed(true);
                    }
                } else {
                    setError('Failed to load donation data');
                }
            } catch (err) {
                console.error('[Pickup] Error fetching donation data:', err);
                setError(err.message || 'Failed to load donation data');
            } finally {
                setLoading(false);
            }
        };

        fetchDonationData();
    }, [donationId]);

    // Fetch driver statistics for impact progress card
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await getDriverStatistics();
                if (res?.success && res?.statistics?.impactProgress) {
                    setImpactProgress(res.statistics.impactProgress);
                }
            } catch (err) {
                console.warn('[Pickup] Could not load driver statistics:', err);
            }
        };
        fetchStats();
    }, []);

    // Start location tracking when component mounts (only if demo mode is off)
    useEffect(() => {
        if (!donationId || isDemoMode) return;

        // Start continuous location tracking
        startLocationTracking(async (location, error) => {
            if (error) {
                console.error('[Pickup] Location tracking error:', error);
                return;
            }

            if (location) {
                setDriverLocation([location.latitude, location.longitude]);
                
                // Update driver location on server every 5 seconds
                try {
                    await updateDriverLocation(location.latitude, location.longitude);
                } catch (err) {
                    console.error('[Pickup] Error updating driver location on server:', err);
                }
            }
        });

        // Cleanup on unmount
        return () => {
            stopLocationTracking();
            if (locationUpdateIntervalRef.current) {
                clearInterval(locationUpdateIntervalRef.current);
            }
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
                console.error('[Pickup] Error stopping server demo:', err);
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
                            console.error('[Pickup] Error updating driver location:', err);
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

            // First, get driver's current location from server (from tracking data)
            let startLocation = null;

            // Priority 1: Use driver location from tracking data
            if (donationData?.driver?.location) {
                startLocation = {
                    lat: donationData.driver.location.latitude,
                    lng: donationData.driver.location.longitude
                };
                console.log('[Pickup] Using driver location from tracking data:', startLocation);
            }
            // Priority 2: Use current driverLocation state if available
            else if (driverLocation && driverLocation.length === 2) {
                startLocation = {
                    lat: driverLocation[0],
                    lng: driverLocation[1]
                };
                console.log('[Pickup] Using driver location from state:', startLocation);
            }
            // Priority 3: Try to get from browser geolocation as fallback
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
                    console.log('[Pickup] Using driver location from browser geolocation:', startLocation);
                } catch (err) {
                    console.warn('[Pickup] Could not get driver location from geolocation:', err);
                }
            }

            const endLocation = donationData?.donor?.location
                ? { lat: donationData.donor.location.latitude, lng: donationData.donor.location.longitude }
                : null;

            if (!startLocation || !endLocation) {
                alert(`Cannot start demo mode: Missing location data.\nStart: ${startLocation ? 'OK' : 'Missing'}\nEnd (Donor): ${endLocation ? 'OK' : 'Missing'}`);
                return;
            }

            // Update driver location state with starting location
            setDriverLocation([startLocation.lat, startLocation.lng]);

            // Update server with starting location
            try {
                await updateDriverLocation(startLocation.lat, startLocation.lng);
            } catch (err) {
                console.error('[Pickup] Error updating starting location:', err);
            }

            setRouteLoading(true);
            try {
                // Fetch road route waypoints (falls back to straight line on failure)
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

                console.log(`[Pickup] Starting demo mode: ${waypoints.length} waypoints from driver to donor`);

                try {
                    await startDemo(waypoints);
                } catch (err) {
                    console.error('[Pickup] Error starting server demo (movement will only show while you stay on this page):', err);
                }

                const success = simulateMovement(
                    waypoints,
                    async (waypoint) => {
                        setDriverLocation([waypoint.latitude, waypoint.longitude]);
                        setDemoProgress({ currentIndex: waypoint.index + 1, total: waypoint.total });
                        try {
                            await updateDriverLocation(waypoint.latitude, waypoint.longitude);
                        } catch (err) {
                            console.error('[Pickup] Error updating driver location in demo mode:', err);
                        }
                        if (waypoint.index === waypoint.total - 1) {
                            console.log('[Pickup] Demo mode: Reached donor location');
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

    // Get coordinates from donation data
    const pickupLocation = donationData?.donor?.location
        ? [donationData.donor.location.latitude, donationData.donor.location.longitude]
        : [6.868, 79.918]; // Default fallback

    const dropoffLocation = donationData?.receiver?.location
        ? [donationData.receiver.location.latitude, donationData.receiver.location.longitude]
        : [6.850, 79.930]; // Default fallback

    const currentLocation = driverLocation || (donationData?.driver?.location
        ? [donationData.driver.location.latitude, donationData.driver.location.longitude]
        : [6.860, 79.925]); // Default fallback

    // Build route path: use road route waypoints when in demo, else simple segment
    const routePath = demoRouteWaypoints.length > 0
        ? demoRouteWaypoints
        : [pickupLocation, currentLocation, dropoffLocation];

    const handleConfirmPickup = async () => {
        if (!donationId) {
            alert('Donation ID is missing');
            return;
        }

        if (isConfirmed) {
            alert('Pickup already confirmed');
            return;
        }

        setIsConfirming(true);
        try {
            const response = await confirmPickup(donationId);
            if (response.success) {
                setIsConfirmed(true);
                
                // Update driver location to donor location after pickup confirmation
                if (donationData?.donor?.location) {
                    const donorLat = donationData.donor.location.latitude;
                    const donorLng = donationData.donor.location.longitude;
                    
                    // Update local state
                    setDriverLocation([donorLat, donorLng]);
                    
                    // Update server location
                    try {
                        await updateDriverLocation(donorLat, donorLng);
                        console.log('[Pickup] Driver location updated to donor location after pickup confirmation');
                    } catch (err) {
                        console.error('[Pickup] Error updating driver location to donor location:', err);
                    }
                }
                
                alert('Pickup confirmed! Emails have been sent to donor and receiver.');
                // Redirect to delivery confirmation page after a delay
                setTimeout(() => {
                    navigate(`/driver/delivery-confirmation?donationId=${donationId}`);
                }, 2000);
            } else {
                alert(response.message || 'Failed to confirm pickup');
            }
        } catch (error) {
            console.error('Error confirming pickup:', error);
            alert(error.response?.data?.message || error.message || 'Failed to confirm pickup. Please try again.');
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
                <div className='pickup' style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '600px', padding: '20px' }}>
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

    // Custom icons
    const donorIcon = new L.DivIcon({
        className: 'custom-icon',
        html: `<div style="background-color: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

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
            <div className='pickup'>
                <div className='pickup__s1' style={{ position: 'relative' }}>
                    {/* Demo Mode Toggle Button */}
                    <button
                        onClick={handleDemoModeToggle}
                        disabled={routeLoading}
                        className="demo-mode-toggle"
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            zIndex: 1000,
                            padding: '12px 20px',
                            background: isDemoMode ? '#f59e0b' : '#1F4E36',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: routeLoading ? 'wait' : 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.3s ease',
                            opacity: routeLoading ? 0.8 : 1
                        }}
                        title={isDemoMode ? 'Disable Demo Mode' : 'Enable Demo Mode - Simulate movement for competition'}
                    >
                        {routeLoading ? '⏳ Loading route...' : (isDemoMode ? '🛑 Stop Demo' : '▶️ Demo Mode')}
                    </button>

                    {/* Demo Mode Status Indicator */}
                    {isDemoMode && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '70px',
                                right: '20px',
                                zIndex: 1000,
                                padding: '10px 16px',
                                background: 'rgba(245, 158, 11, 0.95)',
                                color: 'white',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <span>🎬 Demo Mode Active</span>
                            {demoProgress.total > 0 && (
                                <span style={{ fontSize: '12px', opacity: 0.9 }}>
                                    ({demoProgress.currentIndex}/{demoProgress.total})
                                </span>
                            )}
                        </div>
                    )}

                    {/* Google Maps link - open in new tab, no API key */}
                    {donationData?.donor?.location && (
                        <a
                            href={`https://www.google.com/maps?q=${donationData.donor.location.latitude},${donationData.donor.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pickup__google-maps-link"
                        >
                            Open pickup in Google Maps
                        </a>
                    )}

                    <MapContainer
                        center={currentLocation}
                        zoom={14}
                        scrollWheelZoom={true}
                        style={{ height: "100%", width: "100%" }}
                        zoomControl={false}
                        key="pickup-map"
                    >
                        <MapTileLayer />
                        <MapInvalidateSize />
                        <Marker position={pickupLocation} icon={donorIcon}>
                            <Popup>
                                <strong>Pickup Location</strong><br/>
                                {donationData?.donor?.name || 'Donor'}<br/>
                                {donationData?.donor?.address || ''}
                            </Popup>
                        </Marker>
                        {donationData?.receiver && (
                            <Marker position={dropoffLocation} icon={receiverIcon}>
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
                <div className='pickup__s2'>
                    <DriverDetails tracking={donationData} driverProfileImageUrl={getUser()?.profileImageUrl} />
                    <Food tracking={donationData} />
                    <LiveJourney tracking={donationData} isConfirmed={isConfirmed} impactProgress={impactProgress} />
                    <div style={{ 
                        padding: '20px', 
                        background: 'white', 
                        borderRadius: '12px', 
                        marginTop: '20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                        {isConfirmed ? (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <div style={{ 
                                    color: '#10b981', 
                                    fontSize: '18px', 
                                    fontWeight: 'bold',
                                    marginBottom: '10px'
                                }}>
                                    ✓ Pickup Confirmed!
                                </div>
                                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                                    Emails have been sent to the donor and receiver. Redirecting...
                                </p>
                            </div>
                        ) : (
                            <button
                                onClick={handleConfirmPickup}
                                disabled={isConfirming || !donationId}
                                style={{
                                    width: '100%',
                                    padding: '14px 24px',
                                    background: isConfirming ? '#9ca3af' : 'linear-gradient(135deg, #1F4E36 0%, #2d5a3d 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: isConfirming || !donationId ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                }}
                            >
                                {isConfirming ? 'Confirming Pickup...' : 'Confirm Pickup'}
                            </button>
                        )}
                    </div>
                </div>
            </div >
            <DriverFooter />
            {donationId && donationData && (
                <ChatIconButton donationId={donationId} currentUser={getUser()} title="Chat about this delivery" />
            )}
        </>
    )
}

export default Pickup;