import { useState, useEffect } from 'react';
import './LocationBox.css';

// Offline: label coordinates only (no external geocoder)
const reverseGeocode = async (lat, lng) =>
    `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;

// Offline: address-to-coordinates lookup disabled — use "Use Current Location"
const geocodeAddress = async (address) => {
    if (!address || address.trim() === '') return null;
    return null;
};

const LocationBox = ({ driverLocation, onLocationUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [address, setAddress] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);
    const [error, setError] = useState(null);
    const [currentAddress, setCurrentAddress] = useState('Not set');

    // Load current address when driverLocation changes
    useEffect(() => {
        const loadCurrentAddress = async () => {
            if (driverLocation?.latitude && driverLocation?.longitude) {
                setIsLoadingAddress(true);
                try {
                    const addr = await reverseGeocode(driverLocation.latitude, driverLocation.longitude);
                    setCurrentAddress(addr);
                    setAddress(addr);
                } catch (err) {
                    console.error('Error loading address:', err);
                    setCurrentAddress(`${driverLocation.latitude.toFixed(6)}, ${driverLocation.longitude.toFixed(6)}`);
                } finally {
                    setIsLoadingAddress(false);
                }
            } else {
                setCurrentAddress('Not set');
                setAddress('');
            }
        };

        loadCurrentAddress();
    }, [driverLocation]);

    const handleEditClick = () => {
        setIsEditing(true);
        setError(null);
        // Set address to current address when editing starts
        setAddress(currentAddress);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setError(null);
        // Reset to original address
        setAddress(currentAddress);
    };

    const handleUseCurrentLocation = async () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        setIsUpdating(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Validate coordinates are within Sri Lanka bounds
                if (lat < 5 || lat > 10 || lng < 79 || lng > 82) {
                    setError('Your location is outside Sri Lanka. Please enter an address manually.');
                    setIsUpdating(false);
                    return;
                }

                try {
                    // Reverse geocode to get address
                    const addr = await reverseGeocode(lat, lng);
                    setAddress(addr);
                    
                    // Update location immediately
                    await onLocationUpdate(lat, lng);
                    setIsEditing(false);
                } catch (err) {
                    console.error('Error reverse geocoding:', err);
                    setError('Got location but failed to get address. You can still save.');
                    setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                } finally {
                    setIsUpdating(false);
                }
            },
            (err) => {
                console.error('Geolocation error:', err);
                setError('Failed to get your current location. Please enter an address manually.');
                setIsUpdating(false);
            }
        );
    };

    const handleSave = async () => {
        if (!address || address.trim() === '') {
            setError('Please enter an address');
            return;
        }

        setIsUpdating(true);
        setError(null);

        try {
            // Geocode address to get coordinates
            const coords = await geocodeAddress(address.trim());
            
            if (!coords) {
                setError('Could not find this address. Please check the address and try again.');
                setIsUpdating(false);
                return;
            }

            // Validate coordinates are within Sri Lanka bounds
            if (coords.lat < 5 || coords.lat > 10 || coords.lng < 79 || coords.lng > 82) {
                setError('Address is outside Sri Lanka. Please enter a valid Sri Lankan address.');
                setIsUpdating(false);
                return;
            }

            // Update location with geocoded coordinates
            await onLocationUpdate(coords.lat, coords.lng);
            setIsEditing(false);
        } catch (err) {
            console.error('Error updating location:', err);
            setError(err.response?.data?.message || err.message || 'Failed to update location');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="location-box">
            <div className="location-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#1F4E36" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
            </div>
            <div className="location-content">
                <p className="location-label">Current Location</p>
                {isEditing ? (
                    <div className="location-edit-form">
                        <div className="location-inputs">
                            <div className="input-group">
                                <label>Address:</label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Enter your address (e.g., Colombo, Sri Lanka)"
                                    disabled={isUpdating}
                                />
                            </div>
                        </div>
                        {error && (
                            <div className="location-error">
                                {error}
                            </div>
                        )}
                        <div className="location-actions">
                            <button
                                type="button"
                                onClick={handleUseCurrentLocation}
                                disabled={isUpdating}
                                className="btn-use-location"
                            >
                                {isUpdating ? 'Getting Location...' : 'Use Current Location'}
                            </button>
                            <div className="btn-group">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={isUpdating}
                                    className="btn-cancel"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isUpdating || !address.trim()}
                                    className="btn-save"
                                >
                                    {isUpdating ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="location-name">
                            {isLoadingAddress ? 'Loading...' : currentAddress}
                        </p>
                        <button
                            type="button"
                            onClick={handleEditClick}
                            className="btn-edit-location"
                        >
                            Edit Location
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default LocationBox;
