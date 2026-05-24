import scooterIcon from '../../../../../assets/icons/afterLogin/driver/scooter.svg';
import profileIcon from '../../../../../assets/icons/afterLogin/navbar/profile.svg';
import './DriverInfoCard.css';

function formatStatusMessage(status, receiverName, _driverLocation) {
    if (!status) return 'Awaiting driver';
    if (status === 'assigned') return `On the way to pickup${receiverName ? ` • Delivery to ${receiverName}` : ''}`;
    if (status === 'picked_up') return receiverName ? `On the way to ${receiverName}` : 'On the way to recipient';
    if (status === 'delivered') return 'Delivery completed';
    return 'Tracking...';
}

function DriverInfoCard({ trackingData, driverLocation }) {
    const driver = trackingData?.driver;
    const receiver = trackingData?.receiver;
    const status = trackingData?.donation?.status;
    const receiverName = receiver?.name || null;
    const hasDriver = !!driver;

    const locationText = hasDriver
        ? formatStatusMessage(status, receiverName, driverLocation)
        : 'No driver assigned yet';
    const vehicleType = driver?.vehicleType ? String(driver.vehicleType).toLowerCase() : '—';
    const vehicleNumber = driver?.vehicleNumber || '—';
    const driverName = driver?.name || 'Driver';

    return (
        <div className="driver-info-card">
            <div className="info-row">
                <div className="icon-box blue">
                    <img src={scooterIcon} alt="" className="icon-img" />
                </div>
                <div className="info-content">
                    <span className="label">Current Location</span>
                    <span className="value">{locationText}</span>
                </div>
                <div className="driver-profile">
                    <img src={driver?.profileImageUrl ? driver.profileImageUrl : profileIcon} alt={driverName} className="driver-profile-img" />
                    <span className="driver-name">{driverName}</span>
                </div>
            </div>

            <div className="divider"></div>

            <div className="info-row">
                <div className="icon-box blue-outline">
                    <img src={scooterIcon} alt="" className="icon-img" />
                </div>
                <div className="info-content">
                    <span className="label">Vehicle Type</span>
                    <span className="value">{vehicleType}</span>
                </div>
                <div className="vehicle-number">
                    <span className="label">Vehicle Number</span>
                    <span className="value">{vehicleNumber}</span>
                </div>
            </div>
        </div>
    );
}

export default DriverInfoCard;
