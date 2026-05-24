import { MapContainer, Marker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './MapSection.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';

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

// Custom Icon function to match the design (Image inside a pin)
const createCustomIcon = (imageUrl) => {
    return L.divIcon({
        className: 'custom-map-marker',
        html: `<div class="marker-pin"><img src="${imageUrl}" class="marker-img" /></div>`,
        iconSize: [50, 60],
        iconAnchor: [25, 60],
        popupAnchor: [0, -60]
    });
};

// Component to center map on all markers (and receiver if set)
const MapController = ({ items, receiverPosition }) => {
    const map = useMap();
    
    useEffect(() => {
        const positions = items
            .filter(item => item.position && Array.isArray(item.position) && item.position.length === 2)
            .map(item => item.position);
        if (receiverPosition && Array.isArray(receiverPosition) && receiverPosition.length === 2) {
            positions.push(receiverPosition);
        }
        if (positions.length > 0) {
            const bounds = L.latLngBounds(positions);
            map.fitBounds(bounds, { padding: [50, 50] });
        } else {
            map.setView([7.0873, 80.0144], 8);
        }
    }, [map, items, receiverPosition]);
    
    return null;
};

// When map container scrolls into view (e.g. on mobile), tell Leaflet to recalc size so tiles render
const MapResizeWhenVisible = ({ wrapperRef }) => {
    const map = useMap();
    useEffect(() => {
        if (!wrapperRef?.current || !map) return;
        const el = wrapperRef.current;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            map.invalidateSize();
                        }, 100);
                    }
                });
            },
            { root: null, rootMargin: '0px', threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [map, wrapperRef]);
    return null;
};

// Current Location Overlay: dynamic with "Use my location" / "Select location" or address
const CurrentLocationOverlay = ({ receiverPosition, receiverAddress, onSelectLocation, onUseMyLocation, locationLoading, locationError }) => {
    return (
        <div className="current-location-overlay">
            <div className="location-icon">📍</div>
            <div className="location-text">
                {receiverPosition && receiverAddress ? (
                    <>
                        <span className="label">Current Location</span>
                        <span className="value">{receiverAddress}</span>
                    </>
                ) : receiverPosition ? (
                    <>
                        <span className="label">Current Location</span>
                        <span className="value">Location set</span>
                    </>
                ) : (
                    <>
                        <span className="label">Set your location</span>
                        <div className="location-actions">
                            <button type="button" className="location-action-btn" onClick={onUseMyLocation} disabled={locationLoading}>
                                {locationLoading ? 'Getting...' : 'Use my location'}
                            </button>
                            <button type="button" className="location-action-btn" onClick={onSelectLocation} disabled={locationLoading}>
                                Select location
                            </button>
                        </div>
                        {locationError && <span className="location-error">{locationError}</span>}
                    </>
                )}
            </div>
        </div>
    );
};

// Format date for display
const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Format expiry date for display
const formatExpiryDate = (date) => {
    if (!date) return 'N/A';
    const expiryDate = new Date(date);
    const month = (expiryDate.getMonth() + 1).toString().padStart(2, '0');
    const year = expiryDate.getFullYear();
    return `${month}/${year}`;
};

// Format time for display
const formatTime = (time) => {
    if (!time) return 'N/A';
    return time;
};

const MapSection = ({ items, receiverPosition, receiverAddress, onSelectLocation, onUseMyLocation, locationLoading, locationError }) => {
    const mapWrapperRef = useRef(null);
    // Default center (Sri Lanka)
    const defaultPosition = [7.0873, 80.0144];
    
    // Calculate center based on items (and receiver if set)
    const calculateCenter = () => {
        const validPositions = items
            .filter(item => item.position && Array.isArray(item.position) && item.position.length === 2)
            .map(item => item.position);
        if (receiverPosition && Array.isArray(receiverPosition) && receiverPosition.length === 2) {
            validPositions.push(receiverPosition);
        }
        if (validPositions.length === 0) return defaultPosition;
        const avgLat = validPositions.reduce((sum, pos) => sum + pos[0], 0) / validPositions.length;
        const avgLng = validPositions.reduce((sum, pos) => sum + pos[1], 0) / validPositions.length;
        return [avgLat, avgLng];
    };

    const center = calculateCenter();
    const zoom = items.length > 1 || receiverPosition ? 10 : 13;

    return (
        <div className="map-container-wrapper" ref={mapWrapperRef}>
            <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className="leaflet-map" zoomControl={false}>
                <MapResizeWhenVisible wrapperRef={mapWrapperRef} />
                <MapController items={items} receiverPosition={receiverPosition} />
                <ZoomButtons />

                {items.map((item, index) => {
                    // Show all items - position should always be set (default if geocoding failed)
                    if (!item.position || !Array.isArray(item.position) || item.position.length !== 2) {
                        console.warn(`[MapSection] Item ${item.id} has invalid position, skipping marker`);
                        return null;
                    }
                    
                    const donation = item.donation || item;
                    
                    return (
                        <Marker
                            key={item.id || index}
                            position={item.position}
                            icon={createCustomIcon(item.image || '/placeholder-food.jpg')}
                        >
                            <Tooltip permanent={false} direction="top" offset={[0, -60]}>
                                <div className="tooltip-content" style={{
                                    minWidth: '200px',
                                    padding: '8px',
                                    fontSize: '12px',
                                    lineHeight: '1.4'
                                }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#1b4332', fontSize: '13px' }}>
                                        {item.title || donation.itemName || 'Food Item'}
                                    </div>
                                    <div style={{ marginBottom: '2px' }}>
                                        <strong>Quantity:</strong> {item.quantity || donation.quantity || 'N/A'}
                                    </div>
                                    <div style={{ marginBottom: '2px' }}>
                                        <strong>Expiry:</strong> {item.expiry || formatExpiryDate(donation.expiryDate) || 'N/A'}
                                    </div>
                                    {donation.donorName && (
                                        <div style={{ marginBottom: '2px' }}>
                                            <strong>Donor:</strong> {donation.donorName}
                                        </div>
                                    )}
                                    {donation.donorAddress && (
                                        <div style={{ marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                                            📍 {donation.donorAddress}
                                        </div>
                                    )}
                                    {donation.preferredPickupDate && (
                                        <div style={{ marginBottom: '2px' }}>
                                            <strong>Pickup:</strong> {formatDate(donation.preferredPickupDate)}
                                        </div>
                                    )}
                                    {donation.preferredPickupTimeFrom && donation.preferredPickupTimeTo && (
                                        <div style={{ marginBottom: '2px' }}>
                                            <strong>Time:</strong> {formatTime(donation.preferredPickupTimeFrom)} - {formatTime(donation.preferredPickupTimeTo)}
                                        </div>
                                    )}
                                    {donation.storageRecommendation && (
                                        <div>
                                            <strong>Storage:</strong> {donation.storageRecommendation}
                                        </div>
                                    )}
                                    {!item.hasValidCoordinates && (
                                        <div style={{ marginTop: '4px', fontSize: '10px', color: '#ff9800', fontStyle: 'italic' }}>
                                            ⚠️ Approximate location
                                        </div>
                                    )}
                                </div>
                            </Tooltip>
                        </Marker>
                    );
                })}

                {receiverPosition && Array.isArray(receiverPosition) && receiverPosition.length === 2 && (
                    <Marker position={receiverPosition} icon={DefaultIcon}>
                        <Tooltip permanent={false} direction="top">Your location</Tooltip>
                    </Marker>
                )}
            </MapContainer>

            <CurrentLocationOverlay
                receiverPosition={receiverPosition}
                receiverAddress={receiverAddress}
                onSelectLocation={onSelectLocation}
                onUseMyLocation={onUseMyLocation}
                locationLoading={locationLoading}
                locationError={locationError}
            />
        </div>
    );
};

// Zoom buttons component (must be inside MapContainer to use useMap)
const ZoomButtons = () => {
    const map = useMap();

    const handleZoomIn = (e) => {
        e.preventDefault();
        e.stopPropagation();
        map.zoomIn();
    };

    const handleZoomOut = (e) => {
        e.preventDefault();
        e.stopPropagation();
        map.zoomOut();
    };

    return (
        <div
            className="map-controls"
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <button className="control-btn" onClick={handleZoomIn} type="button" aria-label="Zoom in">
                +
            </button>
            <button className="control-btn" onClick={handleZoomOut} type="button" aria-label="Zoom out">
                -
            </button>
        </div>
    );
};

export default MapSection;
