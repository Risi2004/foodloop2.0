import './FoodCard.css';
import { useState } from 'react';
import sunIcon from '../../../../../assets/icons/afterLogin/donor/new-donation/Sun.svg';
import winterIcon from '../../../../../assets/icons/afterLogin/donor/new-donation/Winter.svg';
import blurIcon from '../../../../../assets/icons/afterLogin/donor/new-donation/Blur.svg';
import { getListingPriceDisplay } from '../../../../../utils/donationDisplay';

const FoodCard = ({ item, onCardClick, onClaim, selected = false, claimQuantity, onClaimQuantityChange }) => {
    const donation = item.donation || item;
    const [isClaiming, setIsClaiming] = useState(false);
    const maxQty = item.impactPeople ?? donation.quantity ?? 1;
    const qty = claimQuantity ?? 1;
    const storageText = donation.storageRecommendation || 'N/A';
    const storageIconSrc = donation.storageRecommendation === 'Hot' ? sunIcon :
                           donation.storageRecommendation === 'Cold' ? winterIcon :
                           blurIcon;
    
    // Show AI verified badge if quality score is >= 0.8
    const showAIBadge = donation.aiQualityScore !== null && 
                       donation.aiQualityScore !== undefined && 
                       donation.aiQualityScore >= 0.8;
    const priceDisplay = getListingPriceDisplay(donation, { perServing: true });

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
            await onClaim(donationId, qty);
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
            {priceDisplay.hasPrice && (
                <div className="card-badge card-badge--price">
                    {priceDisplay.hasDiscountApplied && (
                        <span className="card-badge-text card-price-old">{priceDisplay.previous}</span>
                    )}
                    <span className="card-badge-text">{priceDisplay.current}</span>
                </div>
            )}
            {item.estimatedDeliveryFee > 0 && (
                <div className="card-badge delivery-fee">
                    <span className="card-badge-text">Delivery from LKR {item.estimatedDeliveryFee.toLocaleString('en-LK')}</span>
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
                {isClaiming
                    ? (item.listingType === 'sell' ? 'Paying...' : 'Claiming...')
                    : (item.listingType === 'sell' && (item.priceAmount > 0 || donation.priceAmount > 0)
                        ? 'Pay & claim'
                        : 'Claim now')}
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
                    {priceDisplay.hasPrice && (
                        <p className="card-meta card-meta--price">
                            Price per serving:{' '}
                            {priceDisplay.hasDiscountApplied && (
                                <span className="card-price-old">{priceDisplay.previous} </span>
                            )}
                            <span>{priceDisplay.current}</span>
                        </p>
                    )}

                    {maxQty > 1 && onClaimQuantityChange && (
                        <div className="card-claim-qty" onClick={(e) => e.stopPropagation()}>
                            <label htmlFor={`claim-qty-${item.id}`}>Servings to claim</label>
                            <input
                                id={`claim-qty-${item.id}`}
                                type="number"
                                min={1}
                                max={maxQty}
                                value={qty}
                                onChange={(e) => {
                                    const next = Math.min(maxQty, Math.max(1, parseInt(e.target.value, 10) || 1));
                                    onClaimQuantityChange(item.id, next);
                                }}
                            />
                        </div>
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
