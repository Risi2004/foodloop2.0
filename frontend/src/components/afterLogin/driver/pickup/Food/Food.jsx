import foodImage from "../../../../../assets/images/driver/food-image.svg";
import foodIcon from "../../../../../assets/icons/afterLogin/driver/organic-food.svg"
import './Food.css';

function Food({ tracking }) {
    const isCustomerOrder = tracking?.donation?.sourceType === 'customer_order';
    const itemName = tracking?.donation?.itemName ?? 'Food item';
    const quantity = tracking?.donation?.quantity ?? 0;
    const imageUrl = tracking?.donation?.imageUrl;
    const customerName = tracking?.receiver?.name ?? 'Customer';
    const itemCount = tracking?.donation?.itemCount ?? null;
    const unitLabel = isCustomerOrder ? 'units' : 'pcs';

    return (
        <div className='food'>
            <img src={imageUrl || foodImage} alt="Food-Image" onError={(e) => { e.target.src = foodImage; }} />
            <div className="food__s1">
                <h2>{itemName}</h2>
                <p>{isCustomerOrder ? `Ordered by ${customerName}` : `Claimed by ${customerName}`}</p>
                <div className="food__s1__sub">
                    <img src={foodIcon} alt="Food" />
                    <p>
                        {quantity} {unitLabel} {isCustomerOrder ? 'to deliver' : 'Available'}
                        {isCustomerOrder && itemCount ? ` • ${itemCount} item(s)` : ''}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Food;