import icon1 from '../../../../../assets/icons/1.svg';
import icon2 from '../../../../../assets/icons/2.svg';
import './WhatsNextCard.css';

function WhatsNextCard({ trackingData }) {
    const status = trackingData?.donation?.status;
    const isDelivered = status === 'delivered';

    const description = isDelivered
        ? 'Delivery completed. You will receive a digital proof of delivery and your Impact Score will be updated.'
        : 'Once the volunteer reaches the destination, you will receive a digital proof of delivery and your Impact Score will be updated.';

    const pillText = isDelivered ? 'Delivery completed • Receipt pending' : 'Awaiting digital receipt';

    return (
        <div className="whats-next-card">
            <div className="card-header">
                <span className="card-header-icon">
                    <img src={icon1} alt="" className="icon-img" />
                </span>
                <h4>What's Next?</h4>
            </div>
            <p className="card-desc">
                {description}
            </p>
            <div className="status-pill">
                <img src={icon2} alt="" className="icon-img" /> {pillText}
            </div>
        </div>
    );
}

export default WhatsNextCard;
