import DriverInfoCard from './DriverInfoCard';
import JourneyTimeline from './JourneyTimeline';
import WhatsNextCard from './WhatsNextCard';
import dotIcon from '../../../../../assets/icons/afterLogin/driver/dot.svg';
import defaultFoodImage from '../../../../../assets/images/driver/food-image.svg';
import './TrackingSidebar.css';

function TrackingSidebar({ trackingData, driverLocation }) {
    const donation = trackingData?.donation;
    const driver = trackingData?.driver;
    const receiver = trackingData?.receiver;
    const isCustomerOrder = donation?.sourceType === 'customer_order';
    const itemName = donation?.itemName || 'Food item';
    const quantity = donation?.quantity ?? 0;
    const quantityLabel = quantity === 1 ? '1 serving' : `${quantity} servings`;
    const imageUrl = donation?.imageUrl;
    const hasDriver = !!driver;
    const status = donation?.status;
    const receiverName = receiver?.name || 'Customer';
    const driverName = driver?.name || 'Driver';

    const subtitle = isCustomerOrder
        ? `Ordered by ${receiverName}${hasDriver ? ` • Driver: ${driverName}` : ''}`
        : (hasDriver ? `Claimed by ${driverName}` : 'Awaiting driver');

    const availabilityLabel = status === 'delivered'
        ? 'Delivered'
        : isCustomerOrder
            ? (status === 'picked_up' || status === 'assigned' ? 'In delivery' : 'Available')
            : 'Available';

    return (
        <div className="tracking-sidebar">
            {/* Driver & Delivery Info Card */}
            <DriverInfoCard trackingData={trackingData} driverLocation={driverLocation} />

            {/* Item Info - dynamic from trackingData */}
            <div className="donation-summary-card">
                <div className="donation-image-circle">
                    <img
                        src={imageUrl || defaultFoodImage}
                        alt={itemName}
                        onError={(e) => { e.target.src = defaultFoodImage; }}
                    />
                </div>
                <div className="donation-details">
                    <h3>{itemName} ({quantityLabel})</h3>
                    <p className="claimed-text">{subtitle}</p>
                    <div className="availability">
                        <img src={dotIcon} alt="" className="icon-img availability-dot" /> {quantityLabel} {availabilityLabel}
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
