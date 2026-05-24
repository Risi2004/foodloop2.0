import scooterIcon from "../../../../../assets/icons/afterLogin/donor/digital-reciept/scooter.png";
import profileIcon from "../../../../../assets/icons/afterLogin/navbar/profile.svg";
import './DriverSummary.css';

const DriverSummary = ({ driver, receipt }) => {
    const dropLocation = receipt?.dropLocation || '—';
    const vehicleType = driver?.vehicleType ? String(driver.vehicleType).toLowerCase() : '—';
    const driverName = driver?.name ? `${driver.name} (Volunteer)` : 'Driver';
    const vehicleNumber = driver?.vehicleNumber || '—';
    const driverImage = driver?.profileImageUrl || profileIcon;

    return (
        <div className="driver-summary-container">
            <h3 className="section-title text-right-mobile">Driver Information</h3>
            <div className="summary-card driver-card-layout">
                <div className="driver-info-left">
                    <div className="info-row">
                        <div className="icon-c circle-blue">
                            <img src={scooterIcon} alt="Scooter" />
                        </div>
                        <div className="info-text-group">
                            <div className="label-tiny">Drop Location</div>
                            <div className="value-small">{dropLocation}</div>
                        </div>
                    </div>

                    <div className="info-row">
                        <div className="icon-c">
                            <img src={scooterIcon} alt="Scooter" />
                        </div>
                        <div className="info-text-group">
                            <div className="label-tiny">Vehicle Type</div>
                            <div className="value-small">{vehicleType}</div>
                        </div>
                    </div>
                </div>

                <div className="driver-info-right">
                    <div className="info-row end">
                        <div className="info-text-group text-right">
                            <div className="value-small">{driverName}</div>
                        </div>
                        <div className="driver-avatar">
                            <img src={driverImage} alt="Driver" />
                        </div>
                    </div>
                    <div className="info-row end">
                        <div className="info-text-group text-right">
                            <div className="label-tiny">Vehicle Number</div>
                            <div className="value-small">{vehicleNumber}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="action-buttons-wrapper" />
        </div>
    );
};

export default DriverSummary;
