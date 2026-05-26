import { MapContainer, Marker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './MapSection.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import MapTileLayer from '../../../../shared/map/MapTileLayer';
import MapInvalidateSize from '../../../../shared/map/MapInvalidateSize';
import { formatListingPrice, getDonationExpiryDisplay } from '../../../../../utils/donationDisplay';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const createCustomIcon = (imageUrl, selected = false) => {
    const selectedClass = selected ? ' marker-pin--selected' : '';
    return L.divIcon({
        className: 'custom-map-marker',
        html: `<div class="marker-pin${selectedClass}"><img src="${imageUrl}" class="marker-img" alt="" /></div>`,
        iconSize: [50, 60],
        iconAnchor: [25, 60],
        popupAnchor: [0, -60]
    });
};

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

const FlyToSelected = ({ selectedItem }) => {
    const map = useMap();

    useEffect(() => {
        if (!selectedItem?.position || selectedItem.position.length !== 2) return;
        map.flyTo(selectedItem.position, 15, { animate: true, duration: 0.5 });
    }, [map, selectedItem?.id, selectedItem?.position]);

    return null;
};

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

const CurrentLocationOverlay = ({ receiverPosition, receiverAddress, onSelectLocation }) => {
    return (
        <div className="current-location-overlay">
            <div className="location-icon">📍</div>
            <div className="location-text">
                {receiverPosition && receiverAddress ? (
                    <>
                        <span className="label">Current Location</span>
                        <span className="value">{receiverAddress}</span>
                        <div className="location-actions">
                            <button type="button" className="location-action-btn" onClick={onSelectLocation}>
                                Change location
                            </button>
                        </div>
                    </>
                ) : receiverPosition ? (
                    <>
                        <span className="label">Current Location</span>
                        <span className="value">Location set</span>
                        <div className="location-actions">
                            <button type="button" className="location-action-btn" onClick={onSelectLocation}>
                                Change location
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <span className="label">Set your location</span>
                        <div className="location-actions">
                            <button type="button" className="location-action-btn" onClick={onSelectLocation}>
                                Set location
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (time) => {
    if (!time) return 'N/A';
    return time;
};

const SelectedDonationPanel = ({ selectedItem }) => {
    if (!selectedItem) return null;
    const donation = selectedItem.donation || selectedItem;
    const priceText = selectedItem.priceLabel || formatListingPrice(donation);

    return (
        <div className="selected-donation-panel">
            <h3 className="selected-donation-panel__title">
                {selectedItem.title || donation.itemName}
            </h3>
            {selectedItem.distanceLabel && (
                <p className="selected-donation-panel__distance">{selectedItem.distanceLabel} away</p>
            )}
            {priceText && (
                <p className="selected-donation-panel__row selected-donation-panel__price">
                    <strong>Price:</strong> {priceText}
                </p>
            )}
            {donation.donorAddress && (
                <p className="selected-donation-panel__row">
                    <strong>Pickup:</strong> {donation.donorAddress}
                </p>
            )}
            {donation.preferredPickupDate && (
                <p className="selected-donation-panel__row">
                    <strong>Date:</strong> {formatDate(donation.preferredPickupDate)}
                    {donation.preferredPickupTimeFrom && donation.preferredPickupTimeTo && (
                        <> · {formatTime(donation.preferredPickupTimeFrom)} – {formatTime(donation.preferredPickupTimeTo)}</>
                    )}
                </p>
            )}
            <p className="selected-donation-panel__row">
                <strong>Expiry:</strong> {selectedItem.expiry || getDonationExpiryDisplay(donation)}
            </p>
            {donation.donorName && (
                <p className="selected-donation-panel__row">
                    <strong>Donor:</strong> {donation.donorName}
                </p>
            )}
        </div>
    );
};

const MapSection = ({
    items,
    receiverPosition,
    receiverAddress,
    selectedItemId,
    selectedItem,
    onSelectLocation,
}) => {
    const mapWrapperRef = useRef(null);
    const defaultPosition = [7.0873, 80.0144];

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
            <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className="leaflet-map" zoomControl={false} style={{ height: '100%', width: '100%' }}>
                <MapTileLayer />
                <MapInvalidateSize />
                <MapResizeWhenVisible wrapperRef={mapWrapperRef} />
                <MapController items={items} receiverPosition={receiverPosition} />
                <FlyToSelected selectedItem={selectedItem} />

                {items.map((item, index) => {
                    if (!item.position || !Array.isArray(item.position) || item.position.length !== 2) {
                        return null;
                    }

                    const donation = item.donation || item;
                    const isSelected = item.id === selectedItemId;
                    const priceText = item.priceLabel || formatListingPrice(donation);

                    return (
                        <Marker
                            key={item.id || index}
                            position={item.position}
                            icon={createCustomIcon(item.image || '/placeholder-food.jpg', isSelected)}
                            eventHandlers={{
                                click: () => {},
                            }}
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
                                    {item.distanceLabel && (
                                        <div style={{ marginBottom: '2px' }}>
                                            <strong>Distance:</strong> {item.distanceLabel}
                                        </div>
                                    )}
                                    {priceText && (
                                        <div style={{ marginBottom: '2px', color: '#047857', fontWeight: 600 }}>
                                            <strong>Price:</strong> {priceText}
                                        </div>
                                    )}
                                    <div style={{ marginBottom: '2px' }}>
                                        <strong>Quantity:</strong> {item.quantity || donation.quantity || 'N/A'}
                                    </div>
                                    <div style={{ marginBottom: '2px' }}>
                                        <strong>Expiry:</strong> {item.expiry || getDonationExpiryDisplay(donation)}
                                    </div>
                                    {donation.donorAddress && (
                                        <div style={{ marginBottom: '2px', fontSize: '11px', color: '#666' }}>
                                            {donation.donorAddress}
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

                <ZoomButtons />
            </MapContainer>

            <CurrentLocationOverlay
                receiverPosition={receiverPosition}
                receiverAddress={receiverAddress}
                onSelectLocation={onSelectLocation}
            />

            <SelectedDonationPanel selectedItem={selectedItem} />
        </div>
    );
};

function ZoomButtons() {
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
}

export default MapSection;
