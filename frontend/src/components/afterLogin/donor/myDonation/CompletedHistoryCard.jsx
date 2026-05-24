import foodImage from "../../../../assets/icons/afterLogin/receiver/img.png";
import organicFoodIcon from "../../../../assets/icons/afterLogin/receiver/Organic Food.svg";
import checkCircleIcon from "../../../../assets/icons/afterLogin/receiver/check_circle.svg";
import receipt from "../../../../assets/icons/afterLogin/receiver/Receipt.svg";
import { Link } from "react-router-dom";
import './DonationCards.css';

const CompletedHistoryCard = ({ donation }) => {
    if (!donation) {
        return null;
    }

    // Format quantity display
    const formatQuantity = (quantity) => {
        if (!quantity) return 'N/A';
        return `${quantity}${quantity === 1 ? 'pc' : 'pcs'}`;
    };

    // Format delivery date
    const formatDeliveryDate = (date) => {
        if (!date) return 'N/A';
        const deliveryDate = new Date(date);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[deliveryDate.getMonth()];
        const day = deliveryDate.getDate();
        const year = deliveryDate.getFullYear();
        return `${month} ${day}, ${year}`;
    };

    const itemName = donation.itemName || 'Food Item';
    const quantity = donation.quantity || 0;
    const receiverName = donation.receiverName || 'Receiver';
    const deliveryDate = formatDeliveryDate(donation.actualPickupDate || donation.updatedAt);
    const imageUrl = donation.imageUrl || foodImage;

    return (
        <div className="donation-card">
            <div className="top">
                <div className="div-flex">
                    <div className="span-bg-emerald-100">
                        <img
                            className="check-circle"
                            src={checkCircleIcon}
                            alt="Supplied"
                        />
                        <div className="supplied">Supplied</div>
                    </div>
                </div>
                <div className="tool">
                    <Link to={`/donor/digital-receipt?donationId=${donation.id}`}>
                        <div className="edit">
                            <img
                                className="receipt"
                                src={receipt}
                                alt="View receipt"
                            />
                            <div className="supplied2">
                                View Receipt
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
            <div className="fed">
                <img 
                    className="img" 
                    src={imageUrl} 
                    alt={itemName}
                    onError={(e) => {
                        e.target.src = foodImage;
                    }}
                />
                <div className="detail">
                    <div className="name">
                        <div className="bag-of-fuji-apples">{itemName} ({formatQuantity(quantity)})</div>
                        <div className="listed-2-mins-ago">Delivered on {deliveryDate}</div>
                        <div className="listed-2-mins-ago">To: {receiverName}</div>
                    </div>
                    <div className="wight">
                        <div className="wight2">
                            <img
                                className="organic-food"
                                src={organicFoodIcon}
                                alt="Organic food"
                            />
                            <div className="_5-kg-available">
                                <span>
                                    <span className="_5-kg-available-span">{quantity}</span>
                                    <span className="_5-kg-available-span2">Delivered</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompletedHistoryCard;
