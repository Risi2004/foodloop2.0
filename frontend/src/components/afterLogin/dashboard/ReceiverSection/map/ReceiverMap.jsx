import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import MapReadyNotifier from '../../../RoleLayout/MapReadyNotifier';
import MapTileLayer from '../../../../shared/map/MapTileLayer';
import MapInvalidateSize from '../../../../shared/map/MapInvalidateSize';
import './ReceiverMap.css';
import { getAvailableDonations } from '../../../../../services/donationApi';
import { getCurrentUser } from '../../../../../services/api';
import { getUser } from '../../../../../utils/auth';
import { calculateDistance } from '../../../../../utils/distance';
import {
    getSocket,
    onDonationCreated,
    onDonationClaimed,
    onDonationStockUpdated,
    onDonationCancelled,
    onDonationClaimCancelled,
    MAX_RECEIVER_RADIUS_KM,
} from '../../../../../services/socket';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;


const donorPinSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pin-inner-icon"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;

const donorIcon = L.divIcon({
    className: 'custom-pin',
    html: `<div class="pin-outer pin-pickup">${donorPinSvg}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

/* Same pin icon as map markers (donorIcon) - scaled down for legend */
const MapLegend = () => (
    <div className="donor-map__legend receiver-map-legend">
        <h4>MAP LEGEND</h4>
        <div className="legend__item">
            <div className="legend__icon legend-pin-pickup">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pin-inner-icon"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
            <span>Donor</span>
        </div>
    </div>
);


const MapController = ({ setMapInstance }) => {
    const map = useMap();
    React.useEffect(() => {
        setMapInstance(map);
    }, [map, setMapInstance]);
    return null;
};

const DEFAULT_CENTER = [6.9271, 79.8612];

function resolveReceiverCenter() {
    const user = getUser();
    const lat = Number(user?.receiverLatitude);
    const lng = Number(user?.receiverLongitude);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return [lat, lng];
    }
    return DEFAULT_CENTER;
}

function isWithinRadius(lat, lng, receiverCenter) {
    const distanceKm = calculateDistance(receiverCenter[0], receiverCenter[1], lat, lng);
    if (distanceKm == null) return true;
    return distanceKm <= MAX_RECEIVER_RADIUS_KM;
}

function donationToMapLocation(donation, donorNameOverride, receiverCenter) {
    const lat = donation.donorLatitude ?? donation.position?.[0];
    const lng = donation.donorLongitude ?? donation.position?.[1];
    if (lat == null || lng == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
        return null;
    }
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (!isWithinRadius(numLat, numLng, receiverCenter)) {
        return null;
    }

    const donorName = donation.donorName || donorNameOverride;
    return {
        id: donation.id || donation._id,
        lat: numLat,
        lng: numLng,
        displayName: donation.itemName || donorName || 'Supplier',
        donorName,
        itemName: donation.itemName,
    };
}

function locationsFromDonations(donations, receiverCenter) {
    const locations = [];
    if (!Array.isArray(donations)) return locations;
    donations.forEach((d) => {
        const loc = donationToMapLocation(d, null, receiverCenter);
        if (loc) locations.push(loc);
    });
    return locations;
}

function mergeLocations(existing, incoming) {
    const byKey = new Map();
    for (const loc of existing) {
        const key = loc.id || `${loc.lat},${loc.lng}`;
        byKey.set(key, loc);
    }
    for (const loc of incoming) {
        const key = loc.id || `${loc.lat},${loc.lng}`;
        byKey.set(key, { ...byKey.get(key), ...loc });
    }
    return Array.from(byKey.values());
}

function DonorMap() {
    const [mapInstance, setMapInstance] = React.useState(null);
    const [donorLocations, setDonorLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [receiverCenter, setReceiverCenter] = useState(() => resolveReceiverCenter());

    const loadDonorLocations = useCallback(async (center) => {
        const [lat, lng] = center;
        setError(null);
        try {
            const response = await getAvailableDonations(lat, lng);
            const locations = locationsFromDonations(response?.donations, center);
            setDonorLocations(locations);
        } catch (err) {
            setError(err.message || 'Failed to load donor locations');
            setDonorLocations([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        getCurrentUser()
            .then((res) => {
                const user = res?.user;
                const lat = Number(user?.receiverLatitude);
                const lng = Number(user?.receiverLongitude);
                if (!cancelled && !Number.isNaN(lat) && !Number.isNaN(lng)) {
                    setReceiverCenter([lat, lng]);
                }
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        setLoading(true);
        loadDonorLocations(receiverCenter);
    }, [receiverCenter, loadDonorLocations]);

    useEffect(() => {
        getSocket();

        const refreshFromServer = () => loadDonorLocations(receiverCenter);

        const mergeCreated = (payload) => {
            const donation = payload?.donation;
            if (!donation) return;

            const loc = donationToMapLocation(
                { ...donation, donorName: payload.donorName || donation.donorName },
                payload.donorName,
                receiverCenter
            );
            if (!loc) return;

            setDonorLocations((prev) => mergeLocations(prev, [loc]));
            refreshFromServer();
        };

        const removeById = (payload) => {
            const id = payload?.donationId;
            if (!id) return;
            setDonorLocations((prev) => prev.filter((loc) => loc.id !== id));
            refreshFromServer();
        };

        const mergeClaimCancelled = (payload) => {
            const parentListing = payload?.parentListing || payload?.donation;
            if (!parentListing) return;

            const loc = donationToMapLocation(parentListing, null, receiverCenter);
            if (!loc) return;

            setDonorLocations((prev) => mergeLocations(prev, [loc]));
            refreshFromServer();
        };

        const mergeStockUpdated = (payload) => {
            const donation = payload?.donation;
            if (!donation) return;

            const id = donation.id || donation._id;
            if (donation.quantity <= 0) {
                setDonorLocations((prev) => prev.filter((loc) => loc.id !== id));
                return;
            }

            const loc = donationToMapLocation(donation, null, receiverCenter);
            if (!loc) {
                setDonorLocations((prev) => prev.filter((l) => l.id !== id));
                return;
            }

            setDonorLocations((prev) => mergeLocations(prev, [loc]));
        };

        const unsubCreated = onDonationCreated(mergeCreated);
        const unsubClaimed = onDonationClaimed(removeById);
        const unsubStockUpdated = onDonationStockUpdated(mergeStockUpdated);
        const unsubCancelled = onDonationCancelled(removeById);
        const unsubClaimCancelled = onDonationClaimCancelled(mergeClaimCancelled);

        return () => {
            unsubCreated();
            unsubClaimed();
            unsubStockUpdated();
            unsubCancelled();
            unsubClaimCancelled();
        };
    }, [receiverCenter, loadDonorLocations]);

    const handleZoomIn = () => {
        if (mapInstance) mapInstance.zoomIn();
    };

    const handleZoomOut = () => {
        if (mapInstance) mapInstance.zoomOut();
    };

    return (
        <div className="donor-map">
            <div className='donor-map__header'>
                <h1>Live Impact Map</h1>
                <p>See our community in action. Green markers show donor locations in your area.</p>
            </div>
            <div className='donor-map__content'>
                <div className="donor-map__container">
                    {loading && (
                        <div className="donor-map__loading">Loading donor locations...</div>
                    )}
                    {error && (
                        <div className="donor-map__error">{error}</div>
                    )}
                    <MapContainer center={receiverCenter} zoom={13} scrollWheelZoom={false} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                        <MapTileLayer />
                        <MapInvalidateSize />
                        <MapReadyNotifier />
                        <MapController setMapInstance={setMapInstance} />
                        {donorLocations.map((loc) => (
                            <Marker
                                key={loc.id || `${loc.lat},${loc.lng}`}
                                position={[loc.lat, loc.lng]}
                                icon={donorIcon}
                            >
                                <Popup>
                                    <strong>{loc.itemName || loc.displayName || 'New listing'}</strong>
                                    {loc.donorName && loc.itemName && (
                                        <>
                                            <br />
                                            From: {loc.donorName}
                                        </>
                                    )}
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                    <div className="donor-map__zoom-controls">
                        <button onClick={handleZoomIn} className="zoom-btn" aria-label="Zoom in">
                            +
                        </button>
                        <button onClick={handleZoomOut} className="zoom-btn" aria-label="Zoom out">
                            −
                        </button>
                    </div>
                    <MapLegend />
                </div>
            </div>
        </div>
    )
}

export default DonorMap;
