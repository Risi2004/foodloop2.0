import schedule from "../../../../assets/icons/afterLogin/driver/schedule.svg";
import transit from "../../../../assets/icons/afterLogin/driver/transit.svg";
import './DeliveryCard.css';

function DeliveryCard({
    donation,
    isSelected,
    onClick,
    onAcceptOrder,
    isAccepting,
    hasActiveDelivery,
    canAcceptOrder = false,
}) {
    if (!donation) {
        return null;
    }

    const formatQuantity = (quantity) => {
        if (!quantity) return 'N/A';
        return `${quantity} ${quantity === 1 ? 'serving' : 'servings'}`;
    };

    const donorName = donation.donorName || 'Supplier';
    const itemName = donation.itemName || 'Food Item';
    const quantity = formatQuantity(donation.quantity);
    const expiryText = donation.expiryText || 'Expiry unknown';
    const totalRoute = donation.totalRouteDistanceFormatted;
    const totalEta = donation.totalEtaFormatted;

    let acceptTitle = 'Accept order';
    if (hasActiveDelivery) {
        acceptTitle = 'Complete your current delivery first';
    } else if (!isSelected) {
        acceptTitle = 'Select this order to view route distance';
    } else if (!canAcceptOrder) {
        acceptTitle = 'Set your location and select this order to see route distance';
    }

    return (
        <div
            className="delivery__card"
            onClick={onClick}
            style={{
                cursor: 'pointer',
                border: isSelected ? '2px solid #1F4E36' : undefined,
                borderRadius: '12px',
                transition: 'all 0.2s ease',
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
            {isSelected && (totalRoute || totalEta) && (
                <p className="delivery__card__route-total">
                    {totalEta && (
                        <>
                            Est. time: <strong>{totalEta}</strong>
                            {donation.trafficLabel ? ` (${donation.trafficLabel})` : ''}
                            {totalRoute ? ' · ' : ''}
                        </>
                    )}
                    {totalRoute && (
                        <>
                            Route: <strong>{totalRoute}</strong>
                            {donation.approximateRoute ? ' (approx.)' : ''}
                        </>
                    )}
                </p>
            )}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (canAcceptOrder) onAcceptOrder?.(donation);
                }}
                disabled={isAccepting || !canAcceptOrder}
                title={acceptTitle}
            >
                <p>
                    {isAccepting
                        ? 'Accepting...'
                        : hasActiveDelivery
                          ? 'Complete current delivery first'
                          : canAcceptOrder
                            ? 'Accept order'
                            : isSelected
                              ? 'Set location for distance'
                              : 'Select to view route'}
                </p>
                <img src={transit} alt="pickup" />
            </button>
        </div>
    );
}

export default DeliveryCard;
