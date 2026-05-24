import DriverInfoCard from './DriverInfoCard';
import JourneyTimeline from './JourneyTimeline';
import WhatsNextCard from './WhatsNextCard';
import dotIcon from '../../../../../assets/icons/afterLogin/driver/dot.svg';
import './TrackingSidebar.css';

function TrackingSidebar({ trackingData, driverLocation }) {
    const donation = trackingData?.donation;
    const driver = trackingData?.driver;
    const itemName = donation?.itemName || 'Food item';
    const quantity = donation?.quantity ?? 0;
    const quantityLabel = quantity === 1 ? '1 serving' : `${quantity} servings`;
    const imageUrl = donation?.imageUrl;
    const hasDriver = !!driver;
    const status = donation?.status;

    return (
        <div className="tracking-sidebar">
            {/* Driver & Delivery Info Card */}
            <DriverInfoCard trackingData={trackingData} driverLocation={driverLocation} />

            {/* Item Info - dynamic from trackingData */}
            <div className="donation-summary-card">
                <div className="donation-image-circle">
                    <img src={imageUrl || 'https://via.placeholder.com/60'} alt={itemName} />
                </div>
                <div className="donation-details">
                    <h3>{itemName} ({quantityLabel})</h3>
                    <p className="claimed-text">
                        {hasDriver ? `Claimed by ${driver.name || 'Driver'}` : 'Awaiting driver'}
                    </p>
                    <div className="availability">
                        <img src={dotIcon} alt="" className="icon-img availability-dot" /> {quantityLabel} {status === 'delivered' ? 'Delivered' : 'Available'}
                    </div>
                </div>
            </div>

            {/* Timeline Section */}
            <JourneyTimeline trackingData={trackingData} />

            {/* What's Next / Footer Card */}
            <WhatsNextCard trackingData={trackingData} />
        </div>
    );
}

export default TrackingSidebar;
