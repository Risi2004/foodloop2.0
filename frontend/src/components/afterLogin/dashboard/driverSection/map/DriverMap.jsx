import React from 'react';
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import MapReadyNotifier from '../../../RoleLayout/MapReadyNotifier';
import MapTileLayer from '../../../../shared/map/MapTileLayer';
import MapInvalidateSize from '../../../../shared/map/MapInvalidateSize';
import './DriverMap.css';


import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;


const createCustomIcon = () => {
    // We use pickup SVG and want it green
    const pickupSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pin-inner-icon"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;

    // For this specific request, we want the pickup shape (circle) and GREEN color.
    // 'pin-pickup' is defined in CSS to be green

    return L.divIcon({
        className: 'custom-pin',
        html: `<div class="pin-outer pin-pickup animate">
                 ${pickupSvg}
               </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
};

const greenPickupIcon = createCustomIcon('pickup');


const MapLegend = () => (
    <div className="donor-map__legend driver-map-legend">
        <h4>MAP LEGEND</h4>
        <div className="legend__item">
            <div className="legend__icon legend-pin-pickup">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pin-inner-icon"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
            <span>Pick up Points</span>
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

function DonorMap() {
    const [mapInstance, setMapInstance] = React.useState(null);

    // Center based on the markers we are showing
    const position = [6.9271, 79.8612];

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
                <p>See our community in action. Green markers show active donations ready for pickup in your area.</p>
            </div>
            <div className='donor-map__content'>
                <div className="donor-map__container">
                    <MapContainer center={position} zoom={13} scrollWheelZoom={false} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                        <MapTileLayer />
                        <MapInvalidateSize />
                        <MapReadyNotifier />
                        <MapController setMapInstance={setMapInstance} />
                        {/* Showing only Active Pickups, but with GREEN styling as requested */}
                        <Marker position={[6.9271, 79.8612]} icon={greenPickupIcon}>
                            <Popup>
                                <strong>Pick up Point</strong><br /> Fresh Vegetables available.
                            </Popup>
                        </Marker>
                        <Marker position={[6.935, 79.85]} icon={greenPickupIcon}>
                            <Popup>
                                <strong>Pick up Point</strong><br /> Bakery Surplus.
                            </Popup>
                        </Marker>

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