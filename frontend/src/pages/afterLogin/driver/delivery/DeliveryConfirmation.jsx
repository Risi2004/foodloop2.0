import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
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
import MapTileLayer from '../../../../components/shared/map/MapTileLayer';
import MapInvalidateSize from '../../../../components/shared/map/MapInvalidateSize';
import { updateDriverLocation } from '../../../../services/api';
import { runDriverDemoLeg, stopDriverDemo, getSupplierCoordFromTracking, getReceiverCoordFromTracking, getSupplierAddressFromTracking, getReceiverAddressFromTracking } from '../../../../utils/driverDemoMode';
import { getRoute } from '../../../../services/routingService';
import RouteInsightPanel from '../../../../components/afterLogin/driver/RouteInsightPanel';

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
    const location = useLocation();
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
    const [routeInsight, setRouteInsight] = useState(null);
    const [routeInsightLoading, setRouteInsightLoading] = useState(false);
    const autoStartDemoRef = useRef(Boolean(location.state?.autoStartDemo));
    const autoDemoStartedRef = useRef(false);

    const startDeliveryDemo = useCallback(async () => {
        if (!donationData || routeLoading || isDemoMode) return;

        stopLocationTracking();
        setRouteLoading(true);

        try {
            const result = await runDriverDemoLeg({
                leg: 'delivery',
                tracking: donationData,
                driverLocationState: driverLocation,
                onRouteInsight: setRouteInsight,
                onLocationUpdate: async (waypoint) => {
                    setDriverLocation([waypoint.latitude, waypoint.longitude]);
                    setDemoProgress({ currentIndex: waypoint.index + 1, total: waypoint.total });
                    try {
                        await updateDriverLocation(waypoint.latitude, waypoint.longitude);
                    } catch (err) {
                        console.error('[DeliveryConfirmation] Error updating driver location in demo mode:', err);
                    }
                },
            });

            if (!result.ok) {
                alert(result.error || 'Cannot start demo: missing location data.');
                return;
            }

            setIsDemoMode(true);
            setDriverLocation([result.start.lat, result.start.lng]);
            setDemoRouteWaypoints(result.waypoints.map((w) => [w.latitude, w.longitude]));
        } finally {
            setRouteLoading(false);
        }
    }, [donationData, driverLocation, isDemoMode, routeLoading]);

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
                if (status === 'delivered') {
                    navigate('/driver/delivery', { replace: true });
                    return;
                }
                if (status === 'assigned') {
                    navigate(`/driver/pickup?donationId=${donationId}`, { replace: true });
                    return;
                }
                if (status !== 'picked_up') {
                    navigate('/driver/delivery', { replace: true });
                    return;
                }
                const tracking = response.tracking;
                setDonationData(tracking);
                const donor = tracking?.donor?.location;
                if (donor?.latitude != null && donor?.longitude != null) {
                    setDriverLocation([donor.latitude, donor.longitude]);
                }
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
    }, [donationId, navigate]);

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

    useEffect(() => {
        let cancelled = false;

        const loadLegRoute = async () => {
            if (!donationData?.receiver?.location) return;

            const donorLoc = donationData.donor?.location;
            const from =
                donorLoc?.latitude != null
                    ? { latitude: donorLoc.latitude, longitude: donorLoc.longitude }
                    : driverLocation?.length === 2
                      ? { latitude: driverLocation[0], longitude: driverLocation[1] }
                      : donationData.driver?.location;
            const to = donationData.receiver.location;

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

        if (!isDemoMode && donationData) {
            loadLegRoute();
        }

        return () => {
            cancelled = true;
        };
    }, [donationData, driverLocation, isDemoMode]);

    // Sync driverLocation from donationData driver location when it loads
    useEffect(() => {
        if (donationData?.driver?.location?.latitude != null && donationData?.driver?.location?.longitude != null) {
            setDriverLocation([
                donationData.driver.location.latitude,
                donationData.driver.location.longitude
            ]);
        }
    }, [donationData]);

    // Start location tracking when component mounts (only if demo mode is off)
    useEffect(() => {
        if (!donationId || isDemoMode) return;

        const locType = localStorage.getItem('driver_location_type');
        if (locType === 'manual') {
            console.log('[DeliveryConfirmation] Prioritizing manually selected location, skipping browser GPS watch');
            return;
        }

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

    useEffect(() => {
        if (!donationData || !autoStartDemoRef.current || autoDemoStartedRef.current) return;
        autoDemoStartedRef.current = true;
        startDeliveryDemo();
    }, [donationData, startDeliveryDemo]);

    // Demo mode handler
    const handleDemoModeToggle = async () => {
        if (isDemoMode) {
            await stopDriverDemo();
            setIsDemoMode(false);
            setDemoProgress({ currentIndex: 0, total: 0 });
            setDemoRouteWaypoints([]);
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
            await startDeliveryDemo();
        }
    };

    useEffect(() => {
        return () => {
            if (isDemoMode) {
                stopDriverDemo();
            }
        };
    }, [isDemoMode]);

    const donationStatus = donationData?.donation?.status;
    const codAmount = Number(donationData?.donation?.codAmount || donationData?.codAmount || 0);
    const isCodOrder = (donationData?.donation?.paymentMethod || donationData?.paymentMethod || '').toLowerCase() === 'cod';
    const deliveryFeeEarnings = Number(
      donationData?.earnings ||
      donationData?.deliveryFee ||
      donationData?.donation?.deliveryFee ||
      0
    );
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
                navigate('/driver/delivery', { replace: true });
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

    const supplierCoord = getSupplierCoordFromTracking(donationData);
    const receiverCoord = getReceiverCoordFromTracking(donationData);
    const supplierAddress = getSupplierAddressFromTracking(donationData);
    const receiverAddress = getReceiverAddressFromTracking(donationData);

    const receiverLocation = receiverCoord
        ? [receiverCoord.lat, receiverCoord.lng]
        : null;

    const supplierLocation = supplierCoord
        ? [supplierCoord.lat, supplierCoord.lng]
        : null;

    const currentLocation = driverLocation || (donationData?.driver?.location
        ? [donationData.driver.location.latitude, donationData.driver.location.longitude]
        : supplierLocation || [6.9271, 79.8612]);

    let routePath = [];
    if (demoRouteWaypoints.length > 0) {
        routePath = demoRouteWaypoints;
    } else if (supplierLocation && receiverLocation) {
        routePath = [supplierLocation, receiverLocation];
    } else if (donationStatus === 'picked_up' || receiverLocation) {
        routePath = [currentLocation, receiverLocation];
    }

    // Custom icons
    const receiverIcon = new L.DivIcon({
        className: 'custom-icon',
        html: `<div style="background-color: #F44336; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    const supplierIcon = new L.DivIcon({
        className: 'custom-icon',
        html: `<div style="background-color: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"></div>`,
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
                    {receiverLocation && (
                        <a
                            href={`https://www.google.com/maps?q=${receiverLocation[0]},${receiverLocation[1]}`}
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
                        <MapTileLayer />
                        <MapInvalidateSize />
                        {supplierLocation && (
                            <Marker position={supplierLocation} icon={supplierIcon}>
                                <Popup>
                                    <strong>Pickup Location (Supplier)</strong><br/>
                                    {donationData?.donor?.name || 'Supplier'}<br/>
                                    {supplierAddress || donationData?.donor?.address || 'Address not available'}
                                </Popup>
                            </Marker>
                        )}
                        {receiverLocation && (
                            <Marker position={receiverLocation} icon={receiverIcon}>
                                <Popup>
                                    <strong>Delivery Location</strong><br/>
                                    {donationData?.receiver?.name || 'Receiver'}<br/>
                                    {receiverAddress || donationData?.receiver?.address || 'Address not available'}
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
                <div className='delivery-confirmation__s2'>
                    <RouteInsightPanel
                        routeInsight={routeInsight}
                        loading={routeInsightLoading && !isDemoMode}
                        approximate={!!routeInsight?.approximate}
                    />
                    {/* Delivery Details card - same styling as pickup/delivery panels */}
                    <div className='delivery-confirmation__panel'>
                        <h2>Delivery Details</h2>
                        {donationData && (
                            <>
                                <p><strong>Item:</strong> {donationData.donation.itemName}</p>
                                <p><strong>Quantity:</strong> {donationData.donation.quantity} servings</p>
                                <p><strong>Tracking ID:</strong> {donationData.donation.trackingId}</p>
                                {donationData.donor && (
                                    <>
                                        <p><strong>Supplier:</strong> {donationData.donor.name}</p>
                                        <p><strong>Pickup address:</strong> {supplierAddress || donationData.donor.address || '—'}</p>
                                    </>
                                )}
                                {donationData.receiver && (
                                    <>
                                        <p><strong>Receiver:</strong> {donationData.receiver.name}</p>
                                        {donationData.receiver.contactNo && (
                                            <p><strong>Contact:</strong> {donationData.receiver.contactNo}</p>
                                        )}
                                        <p><strong>Delivery address:</strong> {receiverAddress || donationData.receiver.address || '—'}</p>
                                    </>
                                )}
                                {isCodOrder && (
                                    <p>
                                        <strong>Collect on Delivery:</strong>{' '}
                                        LKR {codAmount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                )}
                                {deliveryFeeEarnings > 0 && (
                                    <p>
                                        <strong>Your delivery fee (bank payout):</strong>{' '}
                                        LKR {deliveryFeeEarnings.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
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
                                {isCodOrder && (
                                    <p className='delivery-confirmation__warning' style={{ color: '#1f4e36', background: '#e8f6ff' }}>
                                        Collect LKR {codAmount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in cash before confirming delivery.
                                        {deliveryFeeEarnings > 0 && (
                                            <> Your per-km delivery fee of LKR {deliveryFeeEarnings.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} will be credited to your earnings balance.</>
                                        )}
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
