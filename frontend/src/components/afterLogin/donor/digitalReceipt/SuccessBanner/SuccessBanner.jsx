import tick from "../../../../../assets/icons/afterLogin/donor/digital-reciept/Check-Mark.png"
import './SuccessBanner.css';

const SuccessBanner = ({ deliveryDate }) => {
    return (
        <div className="success-banner">
            <div className="success-icon-container">
                <div className="success-icon-circle">
                    <img src={tick} alt="Tick-icon" />
                </div>
            </div>
            <div className="success-text-content">
                <h1>Donation Successfully Completed</h1>
                <p>Your contribution has reached those in need.</p>
                <div className="success-status-badge">
                    Journey Status: Delivered{deliveryDate ? ` • ${deliveryDate}` : ''}
                </div>
            </div>
        </div>
    );
};

export default SuccessBanner;
