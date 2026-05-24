import schedule from "../../../../assets/icons/afterLogin/driver/schedule.svg";
import transit from "../../../../assets/icons/afterLogin/driver/transit.svg";
import './DeliveryCard.css';

function DeliveryCard({ donation, isSelected, onClick, onAcceptOrder, isAccepting, hasActiveDelivery }) {
    if (!donation) {
        return null;
    }

    // Format quantity display
    const formatQuantity = (quantity) => {
        if (!quantity) return 'N/A';
        return `${quantity} ${quantity === 1 ? 'serving' : 'servings'}`;
    };

    const donorName = donation.donorName || 'Donor';
    const itemName = donation.itemName || 'Food Item';
    const quantity = formatQuantity(donation.quantity);
    const expiryText = donation.expiryText || 'Expired';

    return (
        <div
            className="delivery__card"
            onClick={onClick}
            style={{
                cursor: 'pointer',
                border: isSelected ? '2px solid #1F4E36' : undefined,
                borderRadius: '12px',
                transition: 'all 0.2s ease'
            }}
        >
            <div className="delivery__card__s1">
                <h4>{donorName}</h4>
                <div className="delivery__earnings-badge">
                    Earn: LKR {donation.earnings || 350}
                </div>
            </div>
            <p style={{ marginBottom: "15px" }}>{itemName} • {quantity}</p>
            <div className="delivery__card__s2">
                <img src={schedule} alt="schedule" />
                <p>{expiryText}</p>
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (!hasActiveDelivery) onAcceptOrder?.(donation);
                }}
                disabled={isAccepting || hasActiveDelivery}
                title={hasActiveDelivery ? 'You can only have 1 order at a time. Complete your current delivery first.' : undefined}
            >
                <p>
                    {isAccepting ? 'Accepting...' : hasActiveDelivery ? 'Complete current delivery first' : 'Accept order'}
                </p>
                <img src={transit} alt="pickup" />
            </button>
        </div>
    )
}

export default DeliveryCard;