import './FoodCard.css';
import { useState } from 'react';
import sunIcon from '../../../../../assets/icons/afterLogin/donor/new-donation/Sun.svg';
import winterIcon from '../../../../../assets/icons/afterLogin/donor/new-donation/Winter.svg';
import blurIcon from '../../../../../assets/icons/afterLogin/donor/new-donation/Blur.svg';
import { formatListingPrice } from '../../../../../utils/donationDisplay';

const FoodCard = ({ item, onCardClick, onClaim, selected = false }) => {
    const donation = item.donation || item;
    const [isClaiming, setIsClaiming] = useState(false);
    const storageText = donation.storageRecommendation || 'N/A';
    const storageIconSrc = donation.storageRecommendation === 'Hot' ? sunIcon :
                           donation.storageRecommendation === 'Cold' ? winterIcon :
                           blurIcon;
    
    // Show AI verified badge if quality score is >= 0.8
    const showAIBadge = donation.aiQualityScore !== null && 
                       donation.aiQualityScore !== undefined && 
                       donation.aiQualityScore >= 0.8;
    const priceText = item.priceLabel || formatListingPrice(donation);

    const handleCardClick = () => {
        if (onCardClick) {
            onCardClick(item);
        }
    };

    const handleClaimClick = async (e) => {
        e.stopPropagation(); // Prevent card click event
        
        if (!onClaim || isClaiming) {
            return;
        }

        const donationId = item.id || donation._id || donation.id;
        if (!donationId) {
            console.error('[FoodCard] No donation ID found');
            return;
        }

        setIsClaiming(true);
        try {
            await onClaim(donationId);
        } catch (error) {
            console.error('[FoodCard] Error claiming donation:', error);
            // Error handling is done in parent component
        } finally {
            setIsClaiming(false);
        }
    };

    return (
        <div
            className={`food-card${selected ? ' food-card--selected' : ''}`}
            onClick={handleCardClick}
            style={{ cursor: 'pointer' }}
        >
            {showAIBadge && (
                <div className="card-badge verified">
                    <span className="card-badge-text">AI Verified</span>
                </div>
            )}
            {priceText ? (
                <div className="card-badge card-badge--price">
                    <span className="card-badge-text">{priceText}</span>
                </div>
            ) : (
                <div className="card-badge delivery-fee">
                    <span className="card-badge-text">Delivery: LKR 200</span>
                </div>
            )}
            <button 
                className="claim-btn" 
                onClick={handleClaimClick}
                disabled={isClaiming || !onClaim}
                style={{ 
                    opacity: isClaiming ? 0.6 : 1,
                    cursor: isClaiming ? 'not-allowed' : 'pointer'
                }}
            >
                {isClaiming ? 'Claiming...' : 'Claim now'}
            </button>

            <div className="card-content">
                <div className="card-image-container">
                    <img 
                        src={item.image || donation.imageUrl || '/placeholder-food.jpg'} 
                        alt={item.title || donation.itemName} 
                        className="card-image"
                        onError={(e) => {
                            e.target.src = '/placeholder-food.jpg';
                        }}
                    />
                </div>

                <div className="card-details">
                    <h3 className="card-title">{item.title || donation.itemName || 'Food Item'}</h3>
                    <p className="card-meta">Listed {item.listedTime || 'Recently'}</p>
                    <p className="card-meta highlight">EXP: {item.expiry || 'N/A'}</p>
                    {item.distanceLabel && (
                        <p className="card-meta card-meta--distance">{item.distanceLabel} away</p>
                    )}
                    {priceText && (
                        <p className="card-meta card-meta--price">Price: {priceText}</p>
                    )}

                    <div className="card-qty">
                        <span className="icon">🟢</span> {item.quantity || 'N/A'}
                    </div>
                </div>

                <div className="card-impact-section">
                    <div className="impact-box">
                        <span className="impact-label">Impact Estimate</span>
                        <div className="impact-value">
                            <span className="number">{item.impactPeople || donation.quantity || 0}</span>
                            <span className="unit">People</span>
                        </div>
                    </div>
                    <div className="storage-type">
                        <img src={storageIconSrc} alt="" className="storage-type-icon" aria-hidden />
                        <span>{storageText}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FoodCard;
