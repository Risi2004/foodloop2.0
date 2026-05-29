import { useState, useEffect, useCallback, useRef } from 'react';
import DriverNavbar from "../../../../components/afterLogin/dashboard/driverSection/navbar/DriverNavbar";
import DriverFooter from "../../../../components/afterLogin/dashboard/driverSection/footer/DriverFooter";
import DeliverCard from "../../../../components/afterLogin/driver/delivery/DeliveryCard";
import DeliveryMap from "../../../../components/afterLogin/driver/delivery/DeliveryMap";
import LocationMapModal from '../../../../components/afterLogin/donor/myDonation/locationMapModal/LocationMapModal';
import { reverseGeocode } from '../../../../services/geocodingService';
import { getAvailablePickups, getActiveDeliveries, acceptOrder } from '../../../../services/donationApi';
import { updateDriverLocation } from '../../../../services/api';
import PageLoader from '../../../../components/common/PageLoader/PageLoader';
import {
    getSocket,
    onDonationNewPickup,
    onDonationPickupTaken,
    onDonationClaimCancelled,
    onDonationCancelled,
} from '../../../../services/socket';
import {
    computeRouteDistances,
    computeRoadRouteDistances,
    enrichPickupsWithRoadEta,
    isPickupWithinDriverRadius,
} from '../../../../utils/driverRoute';
import { useNavigate } from 'react-router-dom';
import { useMaintenance } from '../../../../contexts/MaintenanceContext';
import { MAINTENANCE_BLOCK_MESSAGE } from '../../../../services/maintenanceApi';
import './Delivery.css';

function Delivery() {
    const navigate = useNavigate();
    const { blockNewOrders } = useMaintenance();
    const [pickups, setPickups] = useState([]);
    const [activeDeliveries, setActiveDeliveries] = useState([]);
    const [selectedPickup, setSelectedPickup] = useState(null);
    const [driverLocation, setDriverLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [acceptingOrderId, setAcceptingOrderId] = useState(null);
    const [driverAddress, setDriverAddress] = useState('');
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [locationSaving, setLocationSaving] = useState(false);
    const [locationSaveError, setLocationSaveError] = useState(null);
    const [capacityFilteredCount, setCapacityFilteredCount] = useState(0);
    const [driverVehicleType, setDriverVehicleType] = useState('');
    const driverLocationRef = useRef(driverLocation);

    useEffect(() => {
        driverLocationRef.current = driverLocation;
    }, [driverLocation]);

    useEffect(() => {
        let cancelled = false;
        const loadAddress = async () => {
            if (!driverLocation?.latitude || !driverLocation?.longitude) {
                setDriverAddress('');
                return;
            }
            try {
                const addr = await reverseGeocode(
                    driverLocation.latitude,
                    driverLocation.longitude
                );
                if (!cancelled) {
                    setDriverAddress(addr || 'Location set');
                }
            } catch {
                if (!cancelled) setDriverAddress('Location set');
            }
        };
        loadAddress();
        return () => {
            cancelled = true;
        };
    }, [driverLocation?.latitude, driverLocation?.longitude]);

    const enrichPickup = useCallback(async (pickup, location) => {
        if (!pickup) return null;
        const loc = location || driverLocationRef.current;
        if (!loc?.latitude || !loc?.longitude) return pickup;
        return computeRoadRouteDistances(pickup, loc.latitude, loc.longitude);
    }, []);

    const fetchData = useCallback(async (locationOverride) => {
        const loc = locationOverride || driverLocationRef.current;
        const lat = loc?.latitude;
        const lng = loc?.longitude;

        try {
            setError(null);

            const [pickupsResponse, deliveriesResponse] = await Promise.all([
                getAvailablePickups(lat, lng),
                getActiveDeliveries(lat, lng),
            ]);

            if (pickupsResponse?.driverLocation && !loc) {
                setDriverLocation(pickupsResponse.driverLocation);
            }
            if (deliveriesResponse?.driverLocation && !loc && !pickupsResponse?.driverLocation) {
                setDriverLocation(deliveriesResponse.driverLocation);
            }

            const rawPickups = pickupsResponse?.success ? pickupsResponse.pickups || [] : [];
            setCapacityFilteredCount(Number(pickupsResponse?.capacityFilteredCount || 0));
            setDriverVehicleType(String(pickupsResponse?.driverVehicleType || '').trim());
            let enriched = rawPickups;
            if (lat != null && lng != null) {
                enriched = await enrichPickupsWithRoadEta(rawPickups, lat, lng);
            }
            setPickups(enriched);

            if (deliveriesResponse?.success) {
                const deliveries = deliveriesResponse.deliveries || [];
                setActiveDeliveries(
                    lat != null && lng != null
                        ? deliveries.map((d) => computeRouteDistances(d, lat, lng))
                        : deliveries
                );
            } else {
                setActiveDeliveries([]);
            }

            setSelectedPickup((current) => {
                if (!current) return null;
                const updated = enriched.find((p) => p.id === current.id);
                return updated ? updated : current;
            });
        } catch (err) {
            console.error('[Delivery] Error fetching data:', err);
            setError(err.message || 'Failed to load pickups');
            setPickups([]);
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            setLoading(true);
            await fetchData();
            if (mounted) setLoading(false);
        };

        init();
        getSocket();

        const refreshFromServer = () => {
            fetchData();
        };

        const removePickupById = (payload) => {
            const id = payload?.donationId;
            if (!id) return;
            setPickups((prev) => prev.filter((p) => p.id !== id));
            setSelectedPickup((current) => (current?.id === id ? null : current));
            refreshFromServer();
        };

        const mergeNewPickup = (payload) => {
            const donation = payload?.donation;
            if (!donation) return;

            const loc = driverLocationRef.current;
            if (loc?.latitude == null || loc?.longitude == null) {
                refreshFromServer();
                return;
            }
            if (!isPickupWithinDriverRadius(donation, loc.latitude, loc.longitude)) {
                refreshFromServer();
                return;
            }

            const item = computeRouteDistances(donation, loc.latitude, loc.longitude);
            const id = item.id || item._id;

            setPickups((prev) => {
                if (prev.some((p) => p.id === id)) return prev;
                return [item, ...prev];
            });
            refreshFromServer();
        };

        const unsubNew = onDonationNewPickup(mergeNewPickup);
        const unsubTaken = onDonationPickupTaken(removePickupById);
        const unsubClaimCancelled = onDonationClaimCancelled(removePickupById);
        const unsubCancelled = onDonationCancelled(removePickupById);

        return () => {
            mounted = false;
            unsubNew();
            unsubTaken();
            unsubClaimCancelled();
            unsubCancelled();
        };
    }, [fetchData]);

    const handlePickupSelect = async (pickup) => {
        setSelectedPickup(computeRouteDistances(pickup, driverLocationRef.current?.latitude, driverLocationRef.current?.longitude));
        const enriched = await enrichPickup(pickup);
        if (enriched) setSelectedPickup(enriched);
    };

    const handleAcceptOrder = async (pickup) => {
        if (!pickup?.id) return;
        if (blockNewOrders) {
            alert(MAINTENANCE_BLOCK_MESSAGE);
            return;
        }
        const isCustomerOrder = pickup?.sourceType === 'customer_order';
        if (activeDeliveries.length > 0) {
            alert('You can only have 1 order at a time. Complete your current delivery first.');
            return;
        }
        if (
            !driverLocation ||
            (!isCustomerOrder && !pickup.totalRouteDistanceFormatted && !pickup.totalEtaFormatted)
        ) {
            alert('Set your location and select this order to view route distance before accepting.');
            return;
        }

        setAcceptingOrderId(pickup.id);
        try {
            await acceptOrder(pickup.id);
            setPickups((prev) => prev.filter((p) => p.id !== pickup.id));
            setSelectedPickup(null);
            await fetchData();
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
            navigate(`/driver/pickup?donationId=${delivery.id}`);
        } else {
            navigate(`/driver/delivery-confirmation?donationId=${delivery.id}`);
        }
    };

    const handleLocationUpdate = async (latitude, longitude) => {
        const response = await updateDriverLocation(latitude, longitude);

        if (response.success && response.location) {
            const location = response.location;
            setDriverLocation(location);
            driverLocationRef.current = location;
            await fetchData(location);

            if (selectedPickup) {
                const enriched = await computeRoadRouteDistances(
                    selectedPickup,
                    location.latitude,
                    location.longitude
                );
                setSelectedPickup(enriched);
            }
        }

        return response;
    };

    const handleLocationModalConfirm = async (lat, lng, address) => {
        setLocationSaving(true);
        setLocationSaveError(null);
        try {
            await handleLocationUpdate(lat, lng);
            setDriverAddress(address?.trim() || 'Location set');
            setShowLocationModal(false);
        } catch (err) {
            const msg =
                err.response?.data?.message || err.message || 'Failed to save location.';
            setLocationSaveError(msg);
            throw new Error(msg);
        } finally {
            setLocationSaving(false);
        }
    };

    const canAcceptSelected =
        !!driverLocation &&
        !blockNewOrders &&
        (!!(selectedPickup?.totalRouteDistanceFormatted || selectedPickup?.totalEtaFormatted) ||
            selectedPickup?.sourceType === 'customer_order') &&
        activeDeliveries.length === 0;

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
                        width: '100%',
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
                                fontSize: '14px',
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
                <div className='delivery__s2'>
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
                                                        ? (delivery.driverToReceiverDistanceFormatted ||
                                                          delivery.donorToReceiverDistanceFormatted ||
                                                          'Calculating distance...')
                                                        : (delivery.driverToDonorDistanceFormatted ||
                                                          'Calculating distance...')}
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
                                        {capacityFilteredCount > 0 ? (
                                            <>
                                                <p>No pickups fit your vehicle capacity</p>
                                                <p className='delivery__empty-state__hint'>
                                                    {capacityFilteredCount} order(s) are currently too large for your{' '}
                                                    {driverVehicleType ? driverVehicleType.replace('_', ' ') : 'vehicle'}.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p>No pickups within 40 km</p>
                                                <p className='delivery__empty-state__hint'>Check back later for new pickup requests</p>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="delivery__pickups-list">
                                {pickups.map((pickup) => {
                                    const isSelected = selectedPickup?.id === pickup.id;
                                    const enriched = isSelected ? selectedPickup : pickup;
                                    return (
                                        <DeliverCard
                                            key={pickup.id}
                                            donation={enriched}
                                            isSelected={isSelected}
                                            onClick={() => handlePickupSelect(pickup)}
                                            onAcceptOrder={handleAcceptOrder}
                                            isAccepting={acceptingOrderId === pickup.id}
                                            hasActiveDelivery={activeDeliveries.length > 0}
                                            canAcceptOrder={
                                                isSelected &&
                                                canAcceptSelected &&
                                                acceptingOrderId !== pickup.id
                                            }
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                <div className='delivery__s1'>
                    <DeliveryMap
                        selectedPickup={selectedPickup}
                        driverLocation={driverLocation}
                        driverAddress={driverAddress}
                        onOpenLocationModal={() => {
                            setLocationSaveError(null);
                            setShowLocationModal(true);
                        }}
                    />
                </div>
            </div>

            <LocationMapModal
                isOpen={showLocationModal}
                onClose={() => {
                    if (locationSaving) return;
                    setShowLocationModal(false);
                    setLocationSaveError(null);
                }}
                onConfirm={handleLocationModalConfirm}
                defaultAddress={driverAddress}
                defaultLat={driverLocation?.latitude}
                defaultLng={driverLocation?.longitude}
                autoFetchOnOpen={!driverLocation}
                saving={locationSaving}
                saveError={locationSaveError}
                title="Set your location"
                confirmLabel="Confirm location"
                addressLabel="Your location"
                addressPlaceholder="Enter your current area or address in Sri Lanka"
                savingMessage="Saving your location…"
                instructions="Drag the marker or tap the map to adjust your position. Live GPS loads when you open this screen."
            />

            <DriverFooter />
        </>
    );
}

export default Delivery;
