import foodImage from "../../../../assets/icons/afterLogin/receiver/img.png";
import organicFoodIcon from "../../../../assets/icons/afterLogin/receiver/Organic Food.svg";
import './MyClaimsCards.css';

const LookingForDriverCard = ({ donation }) => {
    if (!donation) {
        return null;
    }

    // Format time ago
    const getTimeAgo = (date) => {
        if (!date) return 'Recently';
        const now = new Date();
        const donationDate = new Date(date);
        const diffInSeconds = Math.floor((now - donationDate) / 1000);
        
        if (diffInSeconds < 60) return `${diffInSeconds} sec${diffInSeconds !== 1 ? 's' : ''} ago`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min${Math.floor(diffInSeconds / 60) !== 1 ? 's' : ''} ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr${Math.floor(diffInSeconds / 3600) !== 1 ? 's' : ''} ago`;
        return `${Math.floor(diffInSeconds / 86400)} day${Math.floor(diffInSeconds / 86400) !== 1 ? 's' : ''} ago`;
    };

    // Format expiry date
    const formatExpiryDate = (date) => {
        if (!date) return 'N/A';
        const expiryDate = new Date(date);
        const month = (expiryDate.getMonth() + 1).toString().padStart(2, '0');
        const year = expiryDate.getFullYear();
        return `${month}/${year}`;
    };

    // Format quantity display
    const formatQuantity = (quantity) => {
        if (!quantity) return 'N/A';
        return `${quantity} ${quantity === 1 ? 'serving' : 'servings'}`;
    };

    const itemName = donation.itemName || 'Food Item';
    const quantity = donation.quantity || 0;
    const listedTime = getTimeAgo(donation.createdAt);
    const expiryDate = formatExpiryDate(donation.expiryDate);
    const imageUrl = donation.imageUrl || foodImage;

    return (
        <div className="donation-card">
            <div className="top">
                <div className="div-flex">
                    <div className="span-bg-orange-100">
                        <div className="span-size-1-5-orange"></div>
                        <div className="in-transit-orange">Looking for Driver</div>
                    </div>
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
                        <div className="listed-2-mins-ago">Listed {listedTime}</div>
                        <div className="listed-2-mins-ago">EXP: {expiryDate}</div>
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

export default LookingForDriverCard;
