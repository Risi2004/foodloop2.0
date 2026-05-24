import foodImage from "../../../../assets/icons/afterLogin/receiver/img.png";
import organicFoodIcon from "../../../../assets/icons/afterLogin/receiver/Organic Food.svg";
import './DonationCards.css';

const LookingForReceiverCard = ({ donation, onEdit, onDelete }) => {
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
        return `${quantity}${quantity === 1 ? 'pc' : 'pcs'}`;
    };

    const itemName = donation.itemName || 'Food Item';
    const quantity = donation.quantity || 0;
    const listedTime = getTimeAgo(donation.createdAt);
    const expiryDate = formatExpiryDate(donation.expiryDate);
    const imageUrl = donation.imageUrl || foodImage;

    // Show edit/delete when pending or approved (no receiver yet)
    const canEdit = donation.status === 'pending' || donation.status === 'approved';

    return (
        <div className="donation-card">
            <div className="top">
                <div className="div-flex">
                    <div className="span-bg-orange-100-receiver">
                        <div className="span-size-1-5-orange"></div>
                        <div className="in-transit-orange-receiver">Looking for Receiver</div>
                    </div>
                </div>
                {canEdit && (
                    <div className="tool">
                        {onEdit && (
                            <div className="edit-icon" onClick={() => onEdit(donation)} title="Edit">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#3b82f6"/>
                                </svg>
                            </div>
                        )}
                        {onDelete && (
                            <div className="delete-icon" onClick={() => onDelete(donation)} title="Delete">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#ef4444"/>
                                </svg>
                            </div>
                        )}
                    </div>
                )}
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

export default LookingForReceiverCard;
