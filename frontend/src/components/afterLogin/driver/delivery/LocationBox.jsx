import './LocationBox.css';

const LocationBox = ({ driverLocation, driverAddress, onOpenLocationModal }) => {
    const hasLocation =
        driverLocation?.latitude != null && driverLocation?.longitude != null;

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
                <p className="location-name">
                    {hasLocation ? driverAddress || 'Location set' : 'Not set'}
                </p>
                <button
                    type="button"
                    onClick={onOpenLocationModal}
                    className="btn-edit-location"
                >
                    {hasLocation ? 'Change location' : 'Set location'}
                </button>
            </div>
        </div>
    );
};

export default LocationBox;
