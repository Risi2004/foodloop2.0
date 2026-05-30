import foodImage from "../../../../assets/icons/afterLogin/receiver/img.png";
import organicFoodIcon from "../../../../assets/icons/afterLogin/receiver/Organic Food.svg";
import swapIcon from "../../../../assets/icons/afterLogin/receiver/Swap.svg";
import './MyClaimsCards.css';
import ListingPriceLine from '../../../common/ListingPriceLine/ListingPriceLine';
import { Link } from 'react-router-dom';

const InTransitCard = ({ donation }) => {
    const donationId = donation?.id || donation?._id || '';
    const trackOrderUrl = donationId ? `/receiver/track-order?donationId=${donationId}` : '#';

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
    
    // Resolve driverName from populated driverId, or fallback
    const resolvedDriver = donation.driverId && typeof donation.driverId === 'object' ? donation.driverId : null;
    const driverName = donation.driverName || (resolvedDriver ? (resolvedDriver.driverName || resolvedDriver.username) : null) || `Driver #${donation.assignedDriverId?.slice(-3) || 'N/A'}`;
    
    const isPickedUp = donation.status === 'picked_up' || donation.status === 'in_transit';
    const statusText = isPickedUp ? `Picked up by ${driverName}` : `Driver assigned: ${driverName}`;
    const badgeText = isPickedUp ? 'In Transit' : 'Assigned';
    const imageUrl = donation.imageUrl || foodImage;

    return (
        <div className="donation-card">
            <div className="top">
                <div className="div-flex">
                    <div className="span-bg-blue-100" style={{ width: badgeText === 'Assigned' ? '85px' : '97.22px' }}>
                        <div className="span-size-1-5"></div>
                        <div className="in-transit" style={{ width: badgeText === 'Assigned' ? '55px' : '63.23px' }}>{badgeText}</div>
                    </div>
                </div>
                <div className="tool">
                    <Link to={trackOrderUrl} className="edit" style={{ textDecoration: 'none', color: 'inherit', cursor: donationId ? 'pointer' : 'default' }} aria-label="Follow map to track delivery">
                        <img className="swap" src={swapIcon} alt="Follow map" />
                        <div className="supplied">View Map</div>
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
                        <div className="listed-2-mins-ago">{statusText}</div>
                        <ListingPriceLine donation={donation} className="listed-2-mins-ago listing-price-line" />
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

export default InTransitCard;
