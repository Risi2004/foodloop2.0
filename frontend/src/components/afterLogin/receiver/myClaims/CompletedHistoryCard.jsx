import foodImage from "../../../../assets/icons/afterLogin/receiver/img.png";
import organicFoodIcon from "../../../../assets/icons/afterLogin/receiver/Organic Food.svg";
import checkCircleIcon from "../../../../assets/icons/afterLogin/receiver/check_circle.svg";
import receipt from "../../../../assets/icons/afterLogin/receiver/Receipt.svg"
import { Link } from "react-router-dom";
import './MyClaimsCards.css';

const CompletedHistoryCard = ({ donation }) => {
    if (!donation) {
        return null;
    }

    // Format quantity display
    const formatQuantity = (quantity) => {
        if (!quantity) return 'N/A';
        return `${quantity} ${quantity === 1 ? 'serving' : 'servings'}`;
    };

    const itemName = donation.itemName || 'Food Item';
    const quantity = donation.quantity || 0;
    const driverName = donation.driverName || `Driver #${donation.assignedDriverId?.slice(-3) || 'N/A'}`;
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
                    <Link to={`/receiver/digital-receipt?donationId=${donation.id}`}>
                        <div className="edit">
                            <img
                                className="receipt"
                                src={receipt}
                                alt="Create receipt"
                            />

                            <div className="supplied2">
                                Create Receipt
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
                        <div className="listed-2-mins-ago">Delivered by {driverName}</div>
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
                                    <span className="_5-kg-available-span2">Available</span>
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
