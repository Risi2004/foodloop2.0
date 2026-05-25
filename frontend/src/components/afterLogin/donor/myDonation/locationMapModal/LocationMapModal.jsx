import { useState, useEffect, useRef } from 'react';
import { MapContainer, Marker, useMapEvents } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationMapModal.css';
import MapTileLayer from '../../../../shared/map/MapTileLayer';
import MapInvalidateSize from '../../../../shared/map/MapInvalidateSize';

// Fix for default marker icons in React Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map clicks
const MapClickHandler = ({ onMapClick }) => {
    useMapEvents({
        click: (e) => {
            onMapClick(e.latlng);
        },
    });
    return null;
};

// Component to center map on coordinates
const MapCenterController = ({ center, zoom }) => {
    const map = useMap();
    
    useEffect(() => {
        if (center) {
            map.setView(center, zoom);
        }
    }, [map, center, zoom]);
    
    return null;
};

const LocationMapModal = ({ isOpen, onClose, onConfirm, defaultAddress, defaultLat, defaultLng, title = 'Confirm Pickup Location' }) => {
    const [coordinates, setCoordinates] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentAddress, setCurrentAddress] = useState(defaultAddress || '');
    const [markerPosition, setMarkerPosition] = useState(null);
    const markerRef = useRef(null);

    // Default center (Sri Lanka)
    const defaultCenter = [7.0873, 80.0144];
    const defaultZoom = 13;

    // Geocode address on mount or when address changes; or use defaultLat/defaultLng when provided (edit mode)
    useEffect(() => {
        if (!isOpen) return;

        if (defaultLat != null && defaultLng != null && !isNaN(defaultLat) && !isNaN(defaultLng)) {
            const coords = [Number(defaultLat), Number(defaultLng)];
            setCoordinates(coords);
            setMarkerPosition(coords);
            setLoading(false);
            setError(null);
            return;
        }

        const loadOffline = (address) => {
            setLoading(true);
            setError(null);
            if (!address || address.trim() === '') {
                setError('No address provided');
                setCoordinates(defaultCenter);
                setMarkerPosition(defaultCenter);
                setCurrentAddress('');
            } else {
                setCoordinates(defaultCenter);
                setMarkerPosition(defaultCenter);
                setCurrentAddress(address.trim());
                setError('Offline mode: drag the marker to set the exact pickup point.');
            }
            setLoading(false);
        };

        loadOffline(defaultAddress);
    }, [isOpen, defaultAddress, defaultLat, defaultLng]);

    // Handle marker drag end
    const handleMarkerDragEnd = (e) => {
        const marker = e.target;
        const position = marker.getLatLng();
        const newCoords = [position.lat, position.lng];
        setMarkerPosition(newCoords);
        setCoordinates(newCoords);
        
        setCurrentAddress(`${newCoords[0].toFixed(5)}, ${newCoords[1].toFixed(5)}`);
    };

    // Handle map click
    const handleMapClick = (latlng) => {
        const newCoords = [latlng.lat, latlng.lng];
        setMarkerPosition(newCoords);
        setCoordinates(newCoords);
        setCurrentAddress(`${newCoords[0].toFixed(5)}, ${newCoords[1].toFixed(5)}`);
    };

    // Handle confirm
    const handleConfirm = () => {
        if (!coordinates) {
            setError('Please select a location on the map');
            return;
        }

        // Validate coordinates are within Sri Lanka bounds
        if (coordinates[0] < 5 || coordinates[0] > 10 || coordinates[1] < 79 || coordinates[1] > 82) {
            setError('Selected location is outside Sri Lanka. Please select a valid location.');
            return;
        }

        onConfirm(coordinates[0], coordinates[1], currentAddress);
    };

    // Handle cancel
    const handleCancel = () => {
        onClose();
    };

    if (!isOpen) return null;

    const center = coordinates || defaultCenter;
    const zoom = coordinates ? 15 : defaultZoom;

    return (
        <div className="location-map-modal-overlay" onClick={handleCancel}>
            <div className="location-map-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="location-map-modal-header">
                    <h2>{title}</h2>
                    <button className="location-map-modal-close" onClick={handleCancel}>×</button>
                </div>

                <div className="location-map-modal-body">
                    <div className="location-map-address-display">
                        <strong>Address:</strong> {currentAddress || defaultAddress || 'Loading...'}
                    </div>

                    {error && (
                        <div className="location-map-error">
                            ⚠️ {error}
                        </div>
                    )}

                    {loading && (
                        <div className="location-map-loading">
                            <div className="spinner"></div>
                            <p>Finding your location...</p>
                        </div>
                    )}

                    <div className="location-map-container">
                        {!loading && (
                            <MapContainer
                                center={center}
                                zoom={zoom}
                                scrollWheelZoom={true}
                                className="location-map"
                                style={{ height: '100%', width: '100%' }}
                            >
                                <MapTileLayer />
                                <MapInvalidateSize />
                                <MapCenterController center={center} zoom={zoom} />
                                <MapClickHandler onMapClick={handleMapClick} />
                                
                                {markerPosition && (
                                    <Marker
                                        position={markerPosition}
                                        draggable={true}
                                        eventHandlers={{
                                            dragend: handleMarkerDragEnd,
                                        }}
                                        ref={markerRef}
                                    />
                                )}
                            </MapContainer>
                        )}
                    </div>

                    <div className="location-map-instructions">
                        <p>📍 Drag the marker or click on the map to adjust the pickup location</p>
                    </div>
                </div>

                <div className="location-map-modal-footer">
                    <button className="location-map-btn-cancel" onClick={handleCancel}>
                        Cancel
                    </button>
                    <button 
                        className="location-map-btn-confirm" 
                        onClick={handleConfirm}
                        disabled={!coordinates || loading}
                    >
                        Confirm Location
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LocationMapModal;
