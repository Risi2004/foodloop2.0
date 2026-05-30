import foodImage from "../../../../assets/icons/afterLogin/receiver/img.png";
import organicFoodIcon from "../../../../assets/icons/afterLogin/receiver/Organic Food.svg";
import './DonationCards.css';
import ListingPriceLine from '../../../common/ListingPriceLine/ListingPriceLine';
import { getDonationExpiryDisplay } from '../../../../utils/donationDisplay';

const LookingForDriverCard = ({ donation, onCancelClaim, onAiSuggestDiscount, aiBusy }) => {
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

    // Format quantity display
    const formatQuantity = (quantity) => {
        if (!quantity) return 'N/A';
        return `${quantity}${quantity === 1 ? 'pc' : 'pcs'}`;
    };

    const itemName = donation.itemName || 'Food Item';
    const quantity = donation.quantity || 0;
    const listedTime = getTimeAgo(donation.createdAt);
    const expiryDate = getDonationExpiryDisplay(donation);
    const imageUrl = donation.imageUrl || foodImage;

    return (
        <div className="donation-card">
            <div className="top">
                <div className="div-flex">
                    <div className="span-bg-orange-100">
                        <div className="in-transit-orange">Looking for Driver</div>
                    </div>
                </div>
                {onCancelClaim && (
                    <button
                        type="button"
                        className="claim-cancel-btn"
                        onClick={() => onCancelClaim(donation)}
                        title="Cancel claim before driver pickup"
                    >
                        Cancel claim
                    </button>
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
                        <ListingPriceLine donation={donation} className="listed-2-mins-ago listing-price-line" />
                        {donation.listingType === 'sell' && (
                            <button
                                type="button"
                                className="ai-discount-btn"
                                onClick={() => onAiSuggestDiscount?.(donation)}
                                disabled={aiBusy}
                            >
                                {aiBusy ? 'Getting AI discount...' : 'AI suggesting this much discount'}
                            </button>
                        )}
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
                                    <span className="_5-kg-available-span2"> Claimed</span>
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
