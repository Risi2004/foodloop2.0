import React from 'react';
import { MapContainer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import LocationBox from './LocationBox';
import { computeRouteDistances } from '../../../../utils/driverRoute';
import MapTileLayer from '../../../shared/map/MapTileLayer';
import MapInvalidateSize from '../../../shared/map/MapInvalidateSize';
import './DeliveryMap.css';

// Same pin SVG as donor and receiver dashboard maps (map pin with circle)
const pinSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pin-inner-icon"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;

// Use same symbols as donor dashboard and receiver dashboard maps: green pin (donor), red pin (receiver), blue pin (driver)
const driverIcon = L.divIcon({
    className: 'custom-pin',
    html: `<div class="pin-outer pin-driver">${pinSvg}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

const donorIcon = L.divIcon({
    className: 'custom-pin',
    html: `<div class="pin-outer pin-pickup">${pinSvg}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

const receiverIcon = L.divIcon({
    className: 'custom-pin',
    html: `<div class="pin-outer pin-pickup-red">${pinSvg}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

// Component to handle map view bounds
const MapController = ({ bounds }) => {
    const map = useMap();
    React.useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [map, bounds]);
    return null;
};

// Fix map size so tiles render – Leaflet needs invalidateSize when container dimensions are set
const MapResizeFix = () => {
    const map = useMap();
    React.useEffect(() => {
        map.invalidateSize();
        const t1 = setTimeout(() => map.invalidateSize(), 100);
        const t2 = setTimeout(() => map.invalidateSize(), 400);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [map]);
    return null;
};

// Wrap Zoom Buttons to access map context and stop propagation
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
            className="custom-zoom-buttons"
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()} // Stop bubbling to map
        >
            <button onClick={handleZoomIn} type="button">+</button>
            <button onClick={handleZoomOut} type="button">-</button>
        </div>
    );
};

function DeliveryMap({ selectedPickup, driverLocation, driverAddress, onOpenLocationModal }) {
    const pickupForDisplay =
        selectedPickup && driverLocation?.latitude != null && driverLocation?.longitude != null
            ? computeRouteDistances(
                  selectedPickup,
                  driverLocation.latitude,
                  driverLocation.longitude
              )
            : selectedPickup;
    // Default center (Sri Lanka center)
    const defaultCenter = [7.0873, 80.0144];

    // Get driver position
    const driverPos = driverLocation?.latitude && driverLocation?.longitude
        ? [driverLocation.latitude, driverLocation.longitude]
        : null;

    // Get donor position
    const donorLat =
        pickupForDisplay?.donorLatitude ??
        pickupForDisplay?.donor?.location?.latitude;
    const donorLng =
        pickupForDisplay?.donorLongitude ??
        pickupForDisplay?.donor?.location?.longitude;
    const donorPos =
        donorLat != null && donorLng != null ? [donorLat, donorLng] : null;

    // Get receiver position
    const receiverLat =
        pickupForDisplay?.receiverLatitude ??
        pickupForDisplay?.receiver?.location?.latitude;
    const receiverLng =
        pickupForDisplay?.receiverLongitude ??
        pickupForDisplay?.receiver?.location?.longitude;
    const receiverPos =
        receiverLat != null && receiverLng != null ? [receiverLat, receiverLng] : null;

    const donorAddressText =
        pickupForDisplay?.donorAddress ||
        pickupForDisplay?.pickupAddress ||
        pickupForDisplay?.donor?.address ||
        '';
    const receiverAddressText =
        pickupForDisplay?.receiverAddress ||
        pickupForDisplay?.receiver?.address ||
        '';

    // Calculate map center and bounds
    let mapCenter = defaultCenter;
    let bounds = null;

    const positions = [];
    if (driverPos) positions.push(driverPos);
    if (donorPos) positions.push(donorPos);
    if (receiverPos) positions.push(receiverPos);

    if (positions.length > 0) {
        bounds = L.latLngBounds(positions);
        // Calculate center from bounds
        mapCenter = bounds.getCenter();
    }

    // Distance information
    const driverToDonorDistance = pickupForDisplay?.driverToDonorDistanceFormatted || null;
    const donorToReceiverDistance = pickupForDisplay?.donorToReceiverDistanceFormatted || null;
    const totalRouteDistance = pickupForDisplay?.totalRouteDistanceFormatted || null;

    return (
        <div className="delivery-map-container">
            {/* Fixed overlay layer – does not move when map is panned */}
            <div className="delivery-map-overlay">
                <LocationBox
                    driverLocation={driverLocation}
                    driverAddress={driverAddress}
                    onOpenLocationModal={onOpenLocationModal}
                />

                {/* Distance Information Box */}
                {pickupForDisplay && (donorPos || receiverPos) && (
                <div className="distance-info-box">
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1F4E36' }}>Route Information</h3>
                    {driverToDonorDistance && (
                        <div className="distance-item">
                            <span className="distance-label">Driver → Donor:</span>
                            <span className="distance-value">{driverToDonorDistance}</span>
                        </div>
                    )}
                    {donorToReceiverDistance && (
                        <div className="distance-item">
                            <span className="distance-label">Donor → Receiver:</span>
                            <span className="distance-value">{donorToReceiverDistance}</span>
                        </div>
                    )}
                    {totalRouteDistance && (
                        <div className="distance-item total">
                            <span className="distance-label">Total Route:</span>
                            <span className="distance-value">{totalRouteDistance}</span>
                        </div>
                    )}
                    {!driverPos && (
                        <div className="distance-warning" style={{ 
                            marginTop: '8px', 
                            padding: '8px', 
                            background: '#fff3cd', 
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: '#856404'
                        }}>
                            ⚠️ Set your location to see distances
                        </div>
                    )}
                </div>
                )}
                {!pickupForDisplay && (
                    <div className="no-pickup-message" style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: '#666',
                        fontSize: '14px',
                        background: 'white',
                        borderRadius: '12px',
                        marginBottom: '16px'
                    }}>
                        {driverPos ? (
                            <p>Select a pickup from the list to view route and distances</p>
                        ) : (
                            <p>Tap Set location to open the map and confirm your position</p>
                        )}
                    </div>
                )}
            </div>

            {/* Map layer – fills container; overlay stays fixed on top */}
            <div className="delivery-map-layer">
            <MapContainer
                center={mapCenter}
                zoom={13}
                className="leaflet-map"
                zoomControl={false}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <MapTileLayer />
                <MapInvalidateSize />
                <MapResizeFix />
                {bounds && <MapController bounds={bounds} />}

                {/* Driver marker */}
                {driverPos && (
                    <Marker position={driverPos} icon={driverIcon}>
                        <Popup>
                            <div>
                                <strong>Driver Location</strong>
                                <br />
                                {driverLocation?.latitude?.toFixed(6)}, {driverLocation?.longitude?.toFixed(6)}
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Donor marker */}
                {donorPos && (
                    <Marker position={donorPos} icon={donorIcon}>
                        <Popup>
                            <div>
                                <strong>Donor: {pickupForDisplay.donorName}</strong>
                                <br />
                                {donorAddressText || 'Address not available'}
                                <br />
                                {pickupForDisplay.itemName} ({pickupForDisplay.quantity} servings)
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Receiver marker */}
                {receiverPos && (
                    <Marker position={receiverPos} icon={receiverIcon}>
                        <Popup>
                            <div>
                                <strong>Receiver: {pickupForDisplay.receiverName}</strong>
                                <br />
                                {receiverAddressText || 'Address not available'}
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Polylines connecting locations */}
                {driverPos && donorPos && (
                    <Polyline 
                        positions={[driverPos, donorPos]} 
                        color="#4CAF50" 
                        weight={4}
                        dashArray="5, 5"
                    />
                )}
                {donorPos && receiverPos && (
                    <Polyline 
                        positions={[donorPos, receiverPos]} 
                        color="#2196F3" 
                        weight={4}
                    />
                )}

                <ZoomButtons />
            </MapContainer>
            </div>
        </div>
    );
}

export default DeliveryMap;
