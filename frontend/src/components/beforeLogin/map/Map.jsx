import React from 'react';
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './Map.css';
import { getMapLocations } from '../../../services/mapApi';
import MapTileLayer from '../../shared/map/MapTileLayer';
import MapInvalidateSize from '../../shared/map/MapInvalidateSize';


// Donors: green circle with location pin (teardrop). Receivers: red circle with box/package.
const donorPinSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pin-inner-icon"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
const receiverPinSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pin-inner-icon"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;

const donorIcon = L.divIcon({
    className: 'custom-pin',
    html: `<div class="pin-outer pin-donor">${donorPinSvg}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

const receiverIcon = L.divIcon({
    className: 'custom-pin',
    html: `<div class="pin-outer pin-receiver">${receiverPinSvg}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

const MapLegend = () => (
    <div className="map__legend">
        <h4>Map Legend</h4>
        <div className="legend__item">
            <div className="legend__icon legend__icon--donor">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
            <span>Suppliers</span>
        </div>
        <div className="legend__item">
            <div className="legend__icon legend__icon--receiver">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <span>Receivers</span>
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

const FitBounds = ({ donors, receivers }) => {
    const map = useMap();
    React.useEffect(() => {
        const points = [
            ...donors.map((d) => [d.lat, d.lng]),
            ...receivers.map((r) => [r.lat, r.lng]),
        ].filter(([lat, lng]) => !Number.isNaN(lat) && !Number.isNaN(lng));

        if (points.length === 0) return;

        if (points.length === 1) {
            map.setView(points[0], 13);
            return;
        }

        map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 });
    }, [map, donors, receivers]);
    return null;
};

function Map() {
    const [mapInstance, setMapInstance] = React.useState(null);
    const [locations, setLocations] = React.useState({ donors: [], receivers: [] });
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    const position = [6.9271, 79.8612];
    const totalPins = locations.donors.length + locations.receivers.length;

    React.useEffect(() => {
        let cancelled = false;
        const fetchLocations = async () => {
            try {
                const data = await getMapLocations();
                if (!cancelled) {
                    setLocations(data);
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || 'Unable to load locations');
                    setLocations({ donors: [], receivers: [] });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchLocations();
        return () => { cancelled = true; };
    }, []);

    const handleZoomIn = () => {
        if (mapInstance) mapInstance.zoomIn();
    };

    const handleZoomOut = () => {
        if (mapInstance) mapInstance.zoomOut();
    };

    return (
        <div className="map">
            <div className='map__s1'>
                <h1>Live Impact Map</h1>
                <p>
                    See our community in action. Green markers show suppliers in our network, and red markers show receivers feeding those in need.
                    {!loading && totalPins > 0 && (
                        <span className="map__pin-count"> ({locations.donors.length} suppliers, {locations.receivers.length} receivers)</span>
                    )}
                </p>
            </div>
            <div className='map__s2'>
                <div className="map__container">
                    {loading && (
                        <div className="map__loading">Loading map...</div>
                    )}
                    {error && !loading && (
                        <div className="map__error">{error}</div>
                    )}
                    {!loading && !error && totalPins === 0 && (
                        <div className="map__empty">No community locations to show yet. Check back as suppliers and receivers join FoodLoop.</div>
                    )}
                    <MapContainer center={position} zoom={13} scrollWheelZoom={false} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                        <MapTileLayer />
                        <MapInvalidateSize />
                        <MapController setMapInstance={setMapInstance} />
                        <FitBounds donors={locations.donors} receivers={locations.receivers} />
                        {locations.donors.map((d) => (
                            <Marker key={`donor-${d.id}`} position={[d.lat, d.lng]} icon={donorIcon}>
                                <Popup>
                                    <strong>Supplier</strong><br />{d.displayName}
                                    {d.address && (<><br /><span style={{ fontSize: '12px', color: '#666' }}>{d.address}</span></>)}
                                </Popup>
                            </Marker>
                        ))}
                        {locations.receivers.map((r) => (
                            <Marker key={`receiver-${r.id}`} position={[r.lat, r.lng]} icon={receiverIcon}>
                                <Popup>
                                    <strong>Receiver</strong><br />{r.displayName}
                                    {r.address && (<><br /><span style={{ fontSize: '12px', color: '#666' }}>{r.address}</span></>)}
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                    <div className="map__zoom-controls">
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

export default Map;