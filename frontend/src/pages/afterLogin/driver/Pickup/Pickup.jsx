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
import { simulateMovement, stopSimulation } from '../../../../services/demoModeService';
import { resolveDemoEndpoints } from '../../../../utils/driverDemoMode';
import { getRoute, getDemoSimulationDurationMs } from '../../../../services/routingService';
import RouteInsightPanel from '../../../../components/afterLogin/driver/RouteInsightPanel';
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
    const [routeInsight, setRouteInsight] = useState(null);
    const [routeInsightLoading, setRouteInsightLoading] = useState(false);

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
                    const status = response.tracking?.donation?.status;
                    if (status === 'picked_up') {
                        navigate(`/driver/delivery-confirmation?donationId=${donationId}`, { replace: true });
                        return;
                    }
                    if (status === 'delivered') {
                        navigate('/driver/delivery', { replace: true });
                        return;
                    }
                    if (status !== 'assigned') {
                        navigate('/driver/delivery', { replace: true });
                        return;
                    }
                    setDonationData(response.tracking);
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
    }, [donationId, navigate]);

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

    useEffect(() => {
        let cancelled = false;

        const loadLegRoute = async () => {
            if (!donationData?.donor?.location) return;

            const from =
                driverLocation?.length === 2
                    ? { latitude: driverLocation[0], longitude: driverLocation[1] }
                    : donationData.driver?.location;
            const to = donationData.donor.location;

            if (!from?.latitude || !to?.latitude) return;

            setRouteInsightLoading(true);
            try {
                const result = await getRoute(from, to, { alternatives: 2 });
                if (cancelled) return;
                setRouteInsight({
                    eta: result.eta,
                    traffic: result.traffic,
                    suggested: result.suggested,
                    shorterDistanceRoute: result.shorterDistanceRoute,
                    distanceKm: (result.suggested?.distanceM || 0) / 1000,
                    approximate: result.approximate,
                });
            } catch {
                if (!cancelled) setRouteInsight(null);
            } finally {
                if (!cancelled) setRouteInsightLoading(false);
            }
        };

        if (!isDemoMode) {
            loadLegRoute();
        }

        return () => {
            cancelled = true;
        };
    }, [donationData, driverLocation, isDemoMode]);

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
            if (!donationData) {
                alert('Please wait for donation data to load');
                return;
            }

            stopLocationTracking();
            setRouteLoading(true);

            const { start, end, error: endpointError } = await resolveDemoEndpoints(
                'pickup',
                donationData,
                driverLocation
            );

            if (endpointError || !start || !end) {
                setRouteLoading(false);
                alert(endpointError || 'Cannot start demo: missing location data.');
                return;
            }

            setIsDemoMode(true);
            setDriverLocation([start.lat, start.lng]);

            try {
                const routeResult = await getRoute(
                    { latitude: start.lat, longitude: start.lng },
                    { latitude: end.lat, longitude: end.lng },
                    { alternatives: 2 }
                );

                const waypoints = routeResult.suggested?.waypoints || routeResult.route?.waypoints || [];

                if (waypoints.length === 0) {
                    setIsDemoMode(false);
                    alert('Failed to generate path waypoints. Check donor and driver coordinates.');
                    return;
                }

                setRouteInsight({
                    eta: routeResult.eta,
                    traffic: routeResult.traffic,
                    suggested: routeResult.suggested,
                    shorterDistanceRoute: routeResult.shorterDistanceRoute,
                    distanceKm: (routeResult.suggested?.distanceM || 0) / 1000,
                    approximate: routeResult.approximate,
                });

                setDemoRouteWaypoints(waypoints.map((w) => [w.latitude, w.longitude]));

                try {
                    await startDemo(waypoints);
                } catch (err) {
                    console.warn('[Pickup] Server demo unavailable, using client simulation only:', err.message);
                }

                const simMs = Math.min(
                    60000,
                    Math.max(20000, (routeResult.traffic?.adjustedSec || 60) * 40)
                );

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
                    },
                    { totalDurationMs: simMs || getDemoSimulationDurationMs() }
                );

                if (!success) {
                    setIsDemoMode(false);
                    setDemoRouteWaypoints([]);
                    await stopDemo().catch(() => {});
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

    const donationStatus = donationData?.donation?.status;
    // Leg 1: driver → donor while assigned (matches donor TrackingMap)
    let routePath = [];
    if (demoRouteWaypoints.length > 0) {
        routePath = demoRouteWaypoints;
    } else if (donationStatus === 'assigned') {
        routePath = [currentLocation, pickupLocation];
    } else if (pickupLocation && dropoffLocation) {
        routePath = [pickupLocation, dropoffLocation];
    }

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
                
                navigate(`/driver/delivery-confirmation?donationId=${donationId}`, { replace: true });
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
                                {donationData?.donor?.name || 'Supplier'}<br/>
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
                        {(isDemoMode || driverLocation) && (
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
                    <RouteInsightPanel
                        routeInsight={routeInsight}
                        loading={routeInsightLoading && !isDemoMode}
                        approximate={!!routeInsight?.approximate}
                    />
                    <DriverDetails tracking={donationData} driverProfileImageUrl={getUser()?.profileImageUrl} />
                    <Food tracking={donationData} />
                    <LiveJourney
                        tracking={donationData}
                        isConfirmed={isConfirmed}
                        impactProgress={impactProgress}
                        routeEta={routeInsight?.eta}
                        trafficLabel={routeInsight?.traffic?.label}
                    />
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