import foodImage from "../../../../../assets/images/driver/food-image.svg";
import foodIcon from "../../../../../assets/icons/afterLogin/driver/organic-food.svg"
import './Food.css';

function Food({ tracking }) {
    const itemName = tracking?.donation?.itemName ?? 'Food item';
    const quantity = tracking?.donation?.quantity ?? 0;
    const imageUrl = tracking?.donation?.imageUrl;
    const driverName = tracking?.driver?.name ?? 'Driver';

    return (
        <div className='food'>
            <img src={imageUrl || foodImage} alt="Food-Image" onError={(e) => { e.target.src = foodImage; }} />
            <div className="food__s1">
                <h2>{itemName}</h2>
                <p>Claimed by {driverName}</p>
                <div className="food__s1__sub">
                    <img src={foodIcon} alt="Food" />
                    <p>{quantity} pcs Available</p>
                </div>
            </div>
        </div>
    )
}

export default Food;