import React, { useState, useEffect } from 'react';
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import MapReadyNotifier from '../../../RoleLayout/MapReadyNotifier';
import MapTileLayer from '../../../../shared/map/MapTileLayer';
import MapInvalidateSize from '../../../../shared/map/MapInvalidateSize';
import './ReceiverMap.css';
import { getMapLocations } from '../../../../../services/mapApi';
import { getAvailableDonations } from '../../../../../services/donationApi';

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

// Default center (Colombo, Sri Lanka)
const DEFAULT_CENTER = [6.9271, 79.8612];

function DonorMap() {
    const [mapInstance, setMapInstance] = React.useState(null);
    const [donorLocations, setDonorLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setError(null);
        Promise.allSettled([getMapLocations(), getAvailableDonations()])
            .then(([mapResult, availResult]) => {
                if (cancelled) return;
                const allDonorLocations = [];
                if (mapResult.status === 'fulfilled' && mapResult.value.donors && Array.isArray(mapResult.value.donors)) {
                    allDonorLocations.push(...mapResult.value.donors);
                }
                if (availResult.status === 'fulfilled' && availResult.value.donations && Array.isArray(availResult.value.donations)) {
                    availResult.value.donations.forEach((d) => {
                        if (d.position && Array.isArray(d.position) && d.position.length >= 2) {
                            const [lat, lng] = d.position;
                            if (typeof lat === 'number' && typeof lng === 'number') {
                                allDonorLocations.push({
                                    lat,
                                    lng,
                                    displayName: d.donorName || d.itemName || 'Donor',
                                });
                            }
                        }
                    });
                }
                setDonorLocations(allDonorLocations);
                if (allDonorLocations.length === 0 && availResult.status === 'rejected' && mapResult.status === 'rejected') {
                    setError(mapResult.reason?.message || availResult.reason?.message || 'Failed to load donor locations');
                }
            })
            .catch((err) => {
                if (!cancelled) setError(err.message || 'Failed to load donor locations');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

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
                    <MapContainer center={DEFAULT_CENTER} zoom={13} scrollWheelZoom={false} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                        <MapTileLayer />
                        <MapInvalidateSize />
                        <MapReadyNotifier />
                        <MapController setMapInstance={setMapInstance} />
                        {donorLocations.map((loc, idx) => (
                            <Marker
                                key={idx}
                                position={[loc.lat, loc.lng]}
                                icon={donorIcon}
                            >
                                <Popup>
                                    <strong>Donor</strong><br />
                                    {loc.displayName || 'Donor location'}
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