import { MapContainer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import MapTileLayer from '../../../../shared/map/MapTileLayer';
import MapInvalidateSize from '../../../../shared/map/MapInvalidateSize';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './TrackingMap.css';

// Fix for default Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const donorIcon = new L.DivIcon({
    className: 'custom-icon',
    html: `<div style="background-color: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const receiverIcon = new L.DivIcon({
    className: 'custom-icon',
    html: `<div style="background-color: #F44336; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const driverIcon = new L.DivIcon({
    className: 'custom-icon',
    html: `<div style="width: 40px; height: 40px; background: #2196F3; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; border: 3px solid white; box-shadow: 0 4px 10px rgba(33, 150, 243, 0.3);">🚌</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

// Component to update map center when driver location changes
function MapUpdater({ driverLocation, donorLocation, receiverLocation: _receiverLocation }) {
    const map = useMap();
    
    useEffect(() => {
        if (driverLocation) {
            map.setView(driverLocation, map.getZoom());
        } else if (donorLocation) {
            map.setView(donorLocation, map.getZoom());
        }
    }, [driverLocation, donorLocation, map]);

    return null;
}

function TrackingMap({ trackingData, driverLocation: liveDriverLocation }) {
    // Default center (Sri Lanka center)
    const defaultCenter = [7.0873, 80.0144];

    // Get locations from tracking data
    const donorLocation = trackingData?.donor?.location
        ? [trackingData.donor.location.latitude, trackingData.donor.location.longitude]
        : null;

    const receiverLocation = trackingData?.receiver?.location
        ? [trackingData.receiver.location.latitude, trackingData.receiver.location.longitude]
        : null;

    // Use live driver location if available, otherwise use from tracking data
    const driverLocation = liveDriverLocation 
        ? [liveDriverLocation.latitude, liveDriverLocation.longitude]
        : (trackingData?.driver?.location
            ? [trackingData.driver.location.latitude, trackingData.driver.location.longitude]
            : null);

    // Determine map center
    let mapCenter = defaultCenter;
    if (driverLocation) {
        mapCenter = driverLocation;
    } else if (donorLocation) {
        mapCenter = donorLocation;
    }

    // Build route polyline based on status
    let polyline = [];
    const status = trackingData?.donation?.status;

    if (status === 'assigned' && donorLocation && driverLocation) {
        // Going to donor
        polyline = [driverLocation, donorLocation];
    } else if (status === 'picked_up' && receiverLocation && driverLocation) {
        // Going to receiver
        polyline = [driverLocation, receiverLocation];
    } else if (status === 'delivered' && donorLocation && receiverLocation) {
        // Completed route
        polyline = [donorLocation, receiverLocation];
    } else if (donorLocation && receiverLocation && driverLocation) {
        // Show all points
        polyline = [donorLocation, driverLocation, receiverLocation];
    }

    return (
        <div className="tracking-map-container">
            <MapContainer
                center={mapCenter}
                zoom={14}
                scrollWheelZoom={true}
                className="map-container"
                zoomControl={false}
                key="tracking-map"
                style={{ height: '100%', width: '100%' }}
            >
                <MapTileLayer />
                <MapInvalidateSize />
                <MapUpdater 
                    driverLocation={driverLocation}
                    donorLocation={donorLocation}
                    receiverLocation={receiverLocation}
                />

                {/* Route Line */}
                {polyline.length > 0 && (
                    <Polyline
                        positions={polyline}
                        pathOptions={{ 
                            color: status === 'delivered' ? '#10b981' : '#2196f3', 
                            weight: 4, 
                            dashArray: status === 'delivered' ? '0' : '10, 10', 
                            opacity: 0.7 
                        }}
                    />
                )}

                {/* Donor Marker */}
                {donorLocation && (
                    <Marker position={donorLocation} icon={donorIcon}>
                        <Popup>
                            <strong>Pickup Location</strong><br/>
                            {trackingData?.donor?.name || 'Donor'}<br/>
                            {trackingData?.donor?.address || ''}
                        </Popup>
                    </Marker>
                )}

                {/* Driver Marker */}
                {driverLocation && (
                    <Marker position={driverLocation} icon={driverIcon}>
                        <Popup>
                            <strong>Driver Location</strong><br/>
                            {trackingData?.driver?.name || 'Driver'}<br/>
                            {trackingData?.driver?.vehicleNumber ? `Vehicle: ${trackingData.driver.vehicleNumber}` : ''}
                        </Popup>
                    </Marker>
                )}

                {/* Receiver Marker */}
                {receiverLocation && (
                    <Marker position={receiverLocation} icon={receiverIcon}>
                        <Popup>
                            <strong>Delivery Location</strong><br/>
                            {trackingData?.receiver?.name || 'Receiver'}<br/>
                            {trackingData?.receiver?.address || ''}
                        </Popup>
                    </Marker>
                )}

                <ZoomControl />
            </MapContainer>
        </div>
    );
}

// Custom Zoom Control to match design
function ZoomControl() {
    const map = useMap();

    return (
        <div className="map-controls">
            <button className="map-control-btn" onClick={() => map.zoomIn()}>+</button>
            <button className="map-control-btn" onClick={() => map.zoomOut()}>-</button>
        </div>
    );
}

export default TrackingMap;
