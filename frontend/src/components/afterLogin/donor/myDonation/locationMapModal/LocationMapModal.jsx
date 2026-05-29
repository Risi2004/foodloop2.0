import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, Marker, useMapEvents } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationMapModal.css';
import MapTileLayer from '../../../../shared/map/MapTileLayer';
import MapInvalidateSize from '../../../../shared/map/MapInvalidateSize';
import { geocodeAddress, reverseGeocode, isWithinSriLanka } from '../../../../../services/geocodingService';
import { getCurrentLocation } from '../../../../../services/locationService';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const DEFAULT_CENTER = [7.0873, 80.0144];
const DEFAULT_ZOOM = 13;
const MAP_ZOOM = 15;

const MapClickHandler = ({ onMapClick }) => {
    useMapEvents({
        click: (e) => {
            onMapClick(e.latlng);
        },
    });
    return null;
};

const MapCenterController = ({ center, zoom }) => {
    const map = useMap();

    useEffect(() => {
        if (center) {
            map.setView(center, zoom);
        }
    }, [map, center, zoom]);

    return null;
};

const LocationMapModal = ({
    isOpen,
    onClose,
    onConfirm,
    initialPickupAddress: initialPickupAddressProp = '',
    defaultAddress,
    defaultLat,
    defaultLng,
    autoFetchOnOpen = true,
    saving = false,
    saveError = null,
    savingMessage = 'Saving…',
    instructions = 'Drag the marker or click the map to adjust the exact pickup point.',
    title = 'Confirm Pickup Location',
    confirmLabel = 'Confirm & save donation',
    addressLabel = 'Pickup address',
    addressPlaceholder = 'Enter the address where food can be picked up',
}) => {
    const initialPickupAddress = (initialPickupAddressProp || defaultAddress || '').trim()
        ? (initialPickupAddressProp || defaultAddress || '')
        : '';
    const [addressText, setAddressText] = useState('');
    const [coordinates, setCoordinates] = useState(null);
    const [markerPosition, setMarkerPosition] = useState(null);
    const [mapReady, setMapReady] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [info, setInfo] = useState(null);
    const [loadingMessage, setLoadingMessage] = useState('Fetching your location…');
    const markerRef = useRef(null);

    const applyCoords = useCallback((lat, lng, addressOverride) => {
        const coords = [lat, lng];
        setCoordinates(coords);
        setMarkerPosition(coords);
        if (addressOverride != null) {
            setAddressText(addressOverride);
        }
    }, []);

    const loadFromCoords = useCallback(
        async (lat, lng, reverse = true) => {
            if (!isWithinSriLanka(lat, lng)) {
                setError('Selected location is outside Sri Lanka. Please select a valid location.');
                return false;
            }
            applyCoords(lat, lng, null);
            if (reverse) {
                try {
                    const addr = await reverseGeocode(lat, lng);
                    if (addr) setAddressText(addr);
                } catch {
                    setAddressText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                }
            }
            return true;
        },
        [applyCoords]
    );

    const runGeocode = useCallback(
        async (address) => {
            const query = String(address || '').trim();
            if (!query) {
                setError('Please enter a pickup address.');
                return false;
            }
            setActionLoading(true);
            setError(null);
            try {
                const result = await geocodeAddress(query);
                if (!result) {
                    setError('Could not find that address in Sri Lanka. Try a more specific address or use current location.');
                    return false;
                }
                applyCoords(result.lat, result.lng, result.displayName || query);
                setInfo('Address placed on the map. Drag the marker to fine-tune if needed.');
                return true;
            } catch (err) {
                setError(err.message || 'Failed to look up address.');
                return false;
            } finally {
                setActionLoading(false);
            }
        },
        [applyCoords]
    );

    const fetchCurrentLocation = useCallback(async (manageLoading = true) => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return false;
        }

        if (manageLoading) {
            setActionLoading(true);
            setLoadingMessage('Fetching your location…');
        }
        setError(null);

        return new Promise((resolve) => {
            getCurrentLocation(async (coords, err) => {
                if (err || !coords) {
                    setError(
                        err?.message ||
                            'Failed to get your current location. Allow location access or enter an address and tap Find on map.'
                    );
                    if (manageLoading) setActionLoading(false);
                    resolve(false);
                    return;
                }
                try {
                    await loadFromCoords(coords.latitude, coords.longitude, true);
                    setInfo('Location loaded. Drag the marker or edit the address if needed.');
                    resolve(true);
                } catch (e) {
                    setError(e.message || 'Failed to resolve address for your location.');
                    resolve(false);
                } finally {
                    if (manageLoading) setActionLoading(false);
                }
            });
        });
    }, [loadFromCoords]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKeyDown = (e) => {
            if (e.key === 'Escape' && !saving && !actionLoading) {
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, saving, actionLoading, onClose]);

    useEffect(() => {
        if (!isOpen) return;

        const savedAddress = (initialPickupAddress || '').trim();
        setError(null);
        setInfo(null);
        setMapReady(true);
        setCoordinates(DEFAULT_CENTER);
        setMarkerPosition(DEFAULT_CENTER);

        const loadSavedCoords = async () => {
            if (
                defaultLat == null ||
                defaultLng == null ||
                Number.isNaN(Number(defaultLat)) ||
                Number.isNaN(Number(defaultLng))
            ) {
                return false;
            }
            setLoadingMessage('Loading map…');
            const hasSavedAddress = !!savedAddress;
            await loadFromCoords(Number(defaultLat), Number(defaultLng), !hasSavedAddress);
            if (hasSavedAddress) setAddressText(savedAddress);
            setInfo('Location loaded. Adjust on the map if needed.');
            return true;
        };

        const init = async () => {
            setActionLoading(true);
            try {
                if (autoFetchOnOpen) {
                    setAddressText('');
                    setLoadingMessage('Fetching your location…');
                    const located = await fetchCurrentLocation(false);
                    if (located) return;

                    const restored = await loadSavedCoords();
                    if (restored) {
                        setInfo('Could not get live location. Using your last map pin — adjust or tap Use current location.');
                        return;
                    }

                    setCoordinates(DEFAULT_CENTER);
                    setMarkerPosition(DEFAULT_CENTER);
                    setInfo('Allow location access, drag the marker, or enter an address and tap Find on map.');
                    return;
                }

                setAddressText(savedAddress);

                if (await loadSavedCoords()) {
                    return;
                }

                if (savedAddress) {
                    setLoadingMessage('Finding address on map…');
                    const ok = await runGeocode(savedAddress);
                    if (!ok) {
                        setCoordinates(DEFAULT_CENTER);
                        setMarkerPosition(DEFAULT_CENTER);
                        setInfo('Could not find that address. Try current location or edit the address.');
                    }
                    return;
                }

                setInfo('Use current location or type an address and tap Find on map.');
            } finally {
                setActionLoading(false);
            }
        };

        init();
    }, [
        isOpen,
        initialPickupAddress,
        defaultLat,
        defaultLng,
        autoFetchOnOpen,
        loadFromCoords,
        runGeocode,
        fetchCurrentLocation,
    ]);

    const handleMarkerDragEnd = async (e) => {
        const { lat, lng } = e.target.getLatLng();
        if (!isWithinSriLanka(lat, lng)) {
            setError('Selected location is outside Sri Lanka.');
            return;
        }
        setActionLoading(true);
        setError(null);
        try {
            applyCoords(lat, lng, null);
            const addr = await reverseGeocode(lat, lng);
            if (addr) setAddressText(addr);
            else setAddressText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch {
            setAddressText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleMapClick = async (latlng) => {
        const { lat, lng } = latlng;
        await loadFromCoords(lat, lng, true);
        setError(null);
    };

    const handleUseCurrentLocation = () => {
        fetchCurrentLocation();
    };

    const handleFindOnMap = async () => {
        await runGeocode(addressText);
    };

    const handleConfirm = async () => {
        const trimmed = addressText.trim();
        if (!trimmed) {
            setError('Please enter a pickup address.');
            return;
        }
        if (!coordinates) {
            setError('Please select a location on the map.');
            return;
        }
        if (!isWithinSriLanka(coordinates[0], coordinates[1])) {
            setError('Selected location is outside Sri Lanka. Please select a valid location.');
            return;
        }
        setError(null);
        try {
            await onConfirm(Number(coordinates[0]), Number(coordinates[1]), trimmed);
        } catch (err) {
            setError(err?.message || 'Failed to save donation.');
        }
    };

    const handleCancel = () => {
        if (saving) return;
        onClose();
    };

    if (!isOpen) return null;

    const center = coordinates || DEFAULT_CENTER;
    const zoom = coordinates ? MAP_ZOOM : DEFAULT_ZOOM;
    const busy = actionLoading || saving;
    const displayError = saveError || error;
    const overlayMessage = saving ? savingMessage : loadingMessage;

    const modal = (
        <div
            className="location-map-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-map-modal-title"
            onClick={handleCancel}
        >
            <div className="location-map-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="location-map-modal-header">
                    <h2 id="location-map-modal-title">{title}</h2>
                    <button type="button" className="location-map-modal-close" onClick={handleCancel}>
                        ×
                    </button>
                </div>

                <div className="location-map-modal-body">
                    <label className="location-map-address-label" htmlFor="pickup-address-input">
                        {addressLabel}
                    </label>
                    <textarea
                        id="pickup-address-input"
                        className="location-map-address-input"
                        value={addressText}
                        onChange={(e) => setAddressText(e.target.value)}
                        rows={3}
                        placeholder={addressPlaceholder}
                        disabled={busy}
                    />

                    <div className="location-map-actions">
                        <button
                            type="button"
                            className="location-map-action-btn location-map-action-btn-primary"
                            onClick={handleUseCurrentLocation}
                            disabled={busy}
                        >
                            Use current location
                        </button>
                        <button
                            type="button"
                            className="location-map-action-btn"
                            onClick={handleFindOnMap}
                            disabled={busy || !addressText.trim()}
                        >
                            Find on map
                        </button>
                    </div>

                    {info && !saving && <div className="location-map-info">{info}</div>}
                    {displayError && <div className="location-map-error">⚠️ {displayError}</div>}

                    <div className="location-map-container">
                        {mapReady && (
                            <MapContainer
                                key="pickup-location-map"
                                center={center}
                                zoom={zoom}
                                scrollWheelZoom
                                className="location-map"
                                style={{ height: '100%', width: '100%', minHeight: 400 }}
                            >
                                <MapTileLayer />
                                <MapInvalidateSize />
                                <MapCenterController center={center} zoom={zoom} />
                                <MapClickHandler onMapClick={handleMapClick} />
                                {markerPosition && (
                                    <Marker
                                        position={markerPosition}
                                        draggable
                                        eventHandlers={{ dragend: handleMarkerDragEnd }}
                                        ref={markerRef}
                                    />
                                )}
                            </MapContainer>
                        )}
                        {busy && (
                            <div className="location-map-loading-overlay">
                                <div className="spinner" />
                                <p>{overlayMessage}</p>
                            </div>
                        )}
                    </div>

                    <div className="location-map-instructions">
                        <p>{instructions}</p>
                    </div>
                </div>

                <div className="location-map-modal-footer">
                    <button type="button" className="location-map-btn-cancel" onClick={handleCancel} disabled={saving}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="location-map-btn-confirm"
                        onClick={handleConfirm}
                        disabled={!coordinates || busy || !addressText.trim()}
                    >
                        {saving ? 'Saving…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return modal;
    return createPortal(modal, document.body);
};

export default LocationMapModal;
