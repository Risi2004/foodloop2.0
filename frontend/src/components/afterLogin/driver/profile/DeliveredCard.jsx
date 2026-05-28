import schedule from "../../../../assets/icons/afterLogin/driver/schedule.svg";
import checkIcon from "../../../../assets/icons/afterLogin/driver/check_circle.svg";
import './DeliveredCard.css';

function DeliveredCard({ donation }) {
    if (!donation) {
        return null;
    }

    // Format quantity display
    const formatQuantity = (quantity) => {
        if (!quantity) return 'N/A';
        return `${quantity} ${quantity === 1 ? 'serving' : 'servings'}`;
    };

    // Format delivery date
    const formatDeliveryDate = (deliveredAt) => {
        if (!deliveredAt) return 'Recently';
        
        const deliveryDate = new Date(deliveredAt);
        const now = new Date();
        const diffTime = Math.abs(now - deliveryDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
            if (diffHours === 0) {
                const diffMinutes = Math.floor(diffTime / (1000 * 60));
                if (diffMinutes < 1) return 'Just now';
                return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
            }
            return `Today`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
        } else {
            return deliveryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
    };

    const itemName = donation.itemName || 'Food Item';
    const quantity = donation.quantity || 0;
    const donorName = donation.donorName || 'Supplier';
    const deliveryDate = formatDeliveryDate(donation.deliveredAt);

    return (
        <>
            <div className="delivered__card">
                <div className="delivered__card__sub">
                    <img src={checkIcon} alt="check" />
                    <p>Supplied</p>
                </div>
                <div className="delivery__card__s1">
                    <div style={{ flex: 1 }}>
                        <h4>{donorName}</h4>
                        <h5>{donation.receiverName || 'Receiver'}</h5>
                    </div>
                    <div className="delivery__earnings-badge earned">
                        Earned: LKR {donation.earnings || 350}
                    </div>
                </div>
                <p style={{ marginBottom: "15px" }}>{itemName} • {formatQuantity(quantity)}</p>
                <div className="delivery__card__s2">
                    <img src={schedule} alt="schedule" />
                    <p>Delivered {deliveryDate}</p>
                </div>
            </div >
        </>
    )
}

export default DeliveredCard;