import locationIcon from '../../../../../assets/icons/afterLogin/driver/location.svg';
import scooterIcon from '../../../../../assets/icons/afterLogin/driver/scooter.svg';
import receivedIcon from '../../../../../assets/icons/afterLogin/driver/received.svg';
import './JourneyTimeline.css';

function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

function JourneyTimeline({ trackingData }) {
    const status = trackingData?.donation?.status;
    const driver = trackingData?.driver;
    const receiver = trackingData?.receiver;
    const timestamps = trackingData?.timestamps || {};
    const createdAt = timestamps.createdAt;
    const actualPickupDate = timestamps.actualPickupDate;

    const step1Done = ['assigned', 'picked_up', 'delivered'].includes(status);
    const step2Active = status === 'assigned' || status === 'picked_up';
    const step2Done = status === 'picked_up' || status === 'delivered';
    const step3Done = status === 'delivered';

    return (
        <div className="journey-timeline-card">
            <h4 className="timeline-title">((●)) Live Journey</h4>

            <div className="timeline-container">
                {/* Step 1: Item Listed */}
                <div className={`timeline-item ${step1Done ? 'completed' : 'active'}`}>
                    <div className="timeline-marker green">
                        <img src={locationIcon} alt="" className="icon-img" />
                    </div>
                    <div className="timeline-content">
                        <span className="status-label green">Item Listed</span>
                        <p className="status-desc">Donation confirmed by Donor</p>
                        <span className="time-stamp">
                            {formatDate(createdAt) ? `${formatDate(createdAt)} • Listed` : 'Donation listed'}
                        </span>
                    </div>
                </div>

                {/* Step 2: With Volunteer */}
                <div className={`timeline-item ${step2Done ? 'completed' : step2Active ? 'active' : 'next'}`}>
                    <div className="timeline-marker blue">
                        <img src={scooterIcon} alt="" className="icon-img" />
                    </div>
                    <div className="timeline-content">
                        <span className="status-label blue">With Volunteer</span>
                        <p className="status-desc">
                            {driver?.name ? `Picked up by ${driver.name}` : 'Assigned to driver'}
                        </p>
                        <span className="time-stamp">
                            {actualPickupDate
                                ? `${formatDate(actualPickupDate)} • ${status === 'picked_up' || status === 'delivered' ? 'Picked up' : 'On the way'}`
                                : status === 'assigned'
                                    ? 'On the way to pickup'
                                    : 'With driver'}
                        </span>
                    </div>
                </div>

                {/* Step 3: Reached the Needy */}
                <div className={`timeline-item ${step3Done ? 'completed' : 'next'}`}>
                    <div className="timeline-marker red">
                        <img src={receivedIcon} alt="" className="icon-img" />
                    </div>
                    <div className="timeline-content">
                        <span className="status-label gray">Reached the Needy</span>
                        <p className="status-desc">
                            {step3Done ? 'Delivered' : 'Pending Drop-off'}
                        </p>
                        <span className="time-stamp">
                            {step3Done
                                ? (receiver?.name ? `Delivered to ${receiver.name}` : 'Delivery completed')
                                : (receiver?.name ? `Destination: ${receiver.name}` : 'Awaiting delivery')}
                        </span>
                    </div>
                </div>

                {/* Timeline Line Connector */}
                <div className="timeline-line"></div>
            </div>
        </div>
    );
}

export default JourneyTimeline;
