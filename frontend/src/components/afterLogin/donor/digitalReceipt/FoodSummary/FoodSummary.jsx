import breakableIcon from '../../../../../assets/impact-receipt/Breakable.svg';
import './FoodSummary.css';

const FoodSummary = ({ donation, driver }) => {
    const itemName = donation?.itemName || 'Food item';
    const quantity = donation?.quantity ?? 0;
    const quantityLabel = quantity === 1 ? '1 serving' : `${quantity} servings`;
    const imageUrl = donation?.imageUrl || 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80';
    const driverLabel = driver?.name ? `Claimed by ${driver.name}` : 'Driver assigned';

    return (
        <div className="food-summary-container">
            <h3 className="section-title">Food Information</h3>
            <div className="summary-card">
                <div className="food-image-container">
                    <img src={imageUrl} alt={itemName} className="food-image" />
                </div>
                <div className="food-details">
                    <h4 className="food-name">{itemName} ({quantity === 1 ? '1pc' : `${quantity}pcs`})</h4>
                    <div className="driver-claim-status">{driverLabel}</div>
                    <div className="availability-tag">
                        <img src={breakableIcon} alt="" className="availability-tag-icon" /> {quantityLabel} Delivered
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FoodSummary;
