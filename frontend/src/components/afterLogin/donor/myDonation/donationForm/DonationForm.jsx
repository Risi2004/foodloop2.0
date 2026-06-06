import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitDonation, updateDonation, getDonorStatistics } from '../../../../../services/donationApi';
import { clearAuth } from '../../../../../utils/auth';
import { getBadgeIconSrc, BADGE_KEYS_ORDER } from '../../../../../utils/badgeIcons';
import LocationMapModal from '../locationMapModal/LocationMapModal';
import { useMaintenance } from '../../../../../contexts/MaintenanceContext';
import { MAINTENANCE_BLOCK_MESSAGE } from '../../../../../services/maintenanceApi';
import autoFixHighIcon from '../../../../../assets/icons/afterLogin/donor/new-donation/auto_fix_high.svg';
import editIcon from '../../../../../assets/icons/afterLogin/donor/new-donation/Edit.svg';
import lightningBoltIcon from '../../../../../assets/icons/afterLogin/donor/new-donation/Lightning Bolt.svg';
import plusMathIcon from '../../../../../assets/icons/afterLogin/donor/new-donation/Plus Math.svg';
import subtractIcon from '../../../../../assets/icons/afterLogin/donor/new-donation/Subtract.svg';
import protectIcon from '../../../../../assets/icons/afterLogin/donor/new-donation/Protect.svg';
import sunIcon from '../../../../../assets/icons/afterLogin/donor/new-donation/Sun.svg';
import winterIcon from '../../../../../assets/icons/afterLogin/donor/new-donation/Winter.svg';
import blurIcon from '../../../../../assets/icons/afterLogin/donor/new-donation/Blur.svg';
import './DonationForm.css';

function DonationForm({ aiPredictions, imageUrl, error, editDonationId, initialData, isAnalyzing = false, manualEntryMode = false }) {
    const navigate = useNavigate();
    const { blockNewOrders } = useMaintenance();
    const isEditMode = !!editDonationId && !!initialData;
    const isFormLocked = !isEditMode && (!imageUrl || isAnalyzing);

    // Form state (defaults; edit mode will overwrite via useEffect)
    const [foodCategory, setFoodCategory] = useState('Cooked Meals');
    const [itemName, setItemName] = useState('Vegetable Curry with Rice');
    const [quantity, setQuantity] = useState(15);
    const [storage, setStorage] = useState('hot'); // hot, cold, dry
    const [listingType, setListingType] = useState('donate'); // donate | sell
    const [priceAmount, setPriceAmount] = useState('');
    const [aiSuggestedPrice, setAiSuggestedPrice] = useState(null);
    const [aiConfidence, setAiConfidence] = useState(null);
    const [aiQualityScore, setAiQualityScore] = useState(null);
    const [isAiFilled, setIsAiFilled] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [submitSuccess, setSubmitSuccess] = useState(null);
    const [safetyConfirmed, setSafetyConfirmed] = useState(false);
    const [userProvidedExpiryDate, setUserProvidedExpiryDate] = useState('');
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [selectedLatitude, setSelectedLatitude] = useState(null);
    const [selectedLongitude, setSelectedLongitude] = useState(null);
    const [pickupAddress, setPickupAddress] = useState('');
    const [donorStats, setDonorStats] = useState(null);
    const [userHasEdited, setUserHasEdited] = useState(false);
    const aiAutoFilledRef = useRef(false);

    const markUserEdited = () => {
        setUserHasEdited(true);
        setIsEditing(true);
    };

    // Reset AI auto-fill tracking when a new image/analysis session starts
    useEffect(() => {
        if (isEditMode) return;
        aiAutoFilledRef.current = false;
        setUserHasEdited(false);
    }, [imageUrl, isEditMode]);

    // Initialize form from initialData when in edit mode
    useEffect(() => {
        if (!initialData) return;
        const d = initialData;
        setFoodCategory(d.foodCategory || 'Cooked Meals');
        setItemName(d.itemName || '');
        setQuantity(d.quantity ?? 1);
        const storageVal = (d.storageRecommendation || '').toLowerCase();
        setStorage(storageVal === 'hot' || storageVal === 'cold' || storageVal === 'dry' ? storageVal : 'hot');
        setUserProvidedExpiryDate(d.expiryDate || d.userProvidedExpiryDate || '');
        setListingType(d.listingType === 'sell' ? 'sell' : 'donate');
        setPriceAmount(d.priceAmount != null ? String(d.priceAmount) : '');
        setAiSuggestedPrice(d.aiSuggestedPrice ?? null);
        const savedPickup =
            d.pickupAddress || d.donorAddress || '';
        if (savedPickup) setPickupAddress(savedPickup);
        if (d.donorLatitude != null && d.donorLongitude != null) {
            setSelectedLatitude(d.donorLatitude);
            setSelectedLongitude(d.donorLongitude);
        }
        setIsEditing(true);
        setIsAiFilled(false);
        setUserHasEdited(true);
    }, [initialData]);

    useEffect(() => {
        const fetchBadge = async () => {
            try {
                const res = await getDonorStatistics();
                if (res?.success && res?.statistics) {
                    setDonorStats(res.statistics);
                }
            } catch (_) {
                setDonorStats(null);
            }
        };
        fetchBadge();
    }, []);

    // Validation: Check if form is valid and can be submitted
    const isFormValid = () => {
        // Check all required fields
        const hasImage = !!imageUrl;
        const hasFoodCategory = !!foodCategory && foodCategory.trim() !== '';
        const hasItemName = !!itemName && itemName.trim() !== '';
        const hasQuantity = quantity > 0;
        const hasStorage = !!storage;
        const hasSafetyConfirm = safetyConfirmed;
        
        // Validate time range (From should be before To)
        const qualityScore = manualEntryMode ? null : (aiQualityScore || aiPredictions?.qualityScore);
        const hasValidQuality = qualityScore === null || qualityScore === undefined || qualityScore >= 0.8;
        
        // Check if expiry date is provided (required for all products)
        const hasExpiryDate = !!userProvidedExpiryDate;
        const sellPriceValid =
            listingType !== 'sell' || (Number(priceAmount) > 0 && !Number.isNaN(Number(priceAmount)));
        
        return hasImage && hasFoodCategory && hasItemName && hasQuantity && 
               hasStorage && hasSafetyConfirm && hasValidQuality && hasExpiryDate &&
               sellPriceValid;
    };
    
    const getDisabledReasons = () => {
        const reasons = [];

        if (isAnalyzing) reasons.push('Wait for AI analysis to finish');
        if (!imageUrl) reasons.push('Please upload an image');
        if (!foodCategory || foodCategory.trim() === '') reasons.push('Food category is required');
        if (!itemName || itemName.trim() === '') reasons.push('Item name is required');
        if (quantity <= 0) reasons.push('Quantity must be greater than 0');
        if (!storage) reasons.push('Storage instruction is required');
        if (!userProvidedExpiryDate) reasons.push('Expiry date is required');
        if (!safetyConfirmed) reasons.push('Please confirm safety standards');
        if (listingType === 'sell') {
            const p = Number(priceAmount);
            if (!priceAmount || Number.isNaN(p) || p <= 0) {
                reasons.push('Enter a valid price (LKR) for cash listings');
            }
        }
        const qualityScore = manualEntryMode ? null : (aiQualityScore || aiPredictions?.qualityScore);
        if (qualityScore !== null && qualityScore !== undefined && qualityScore < 0.8) {
            const qualityPercent = Math.round(qualityScore * 100);
            reasons.push(`Food quality score is ${qualityPercent}% (minimum 80% required)`);
        }

        return reasons;
    };

    const formCanSubmit = !isFormLocked && isFormValid();
    const disabledReasons = getDisabledReasons();
    const fieldsEditable = manualEntryMode || isEditing || userHasEdited || !isAiFilled || isEditMode;
    const fieldReadOnly = isFormLocked || (!manualEntryMode && isAiFilled && !fieldsEditable);
    const fieldDisabled = isFormLocked || (!manualEntryMode && isAiFilled && !fieldsEditable);

    useEffect(() => {
        if (manualEntryMode && !isEditMode) {
            setIsEditing(true);
            setIsAiFilled(false);
            setUserHasEdited(true);
        }
    }, [manualEntryMode, isEditMode]);

    // Auto-fill form once when AI predictions are first received (never overwrite user edits)
    useEffect(() => {
        if (isEditMode || !aiPredictions || aiAutoFilledRef.current || userHasEdited) {
            return;
        }

        aiAutoFilledRef.current = true;

        if (aiPredictions.foodCategory) {
            setFoodCategory(aiPredictions.foodCategory);
        }
        if (aiPredictions.itemName) {
            setItemName(aiPredictions.itemName);
        }
        if (aiPredictions.quantity) {
            setQuantity(aiPredictions.quantity);
        }
        if (aiPredictions.storageRecommendation) {
            const storageLower = aiPredictions.storageRecommendation.toLowerCase();
            if (storageLower === 'hot' || storageLower === 'cold' || storageLower === 'dry') {
                setStorage(storageLower);
            }
        }
        if (aiPredictions.confidence) {
            setAiConfidence(aiPredictions.confidence);
        }
        if (aiPredictions.qualityScore) {
            setAiQualityScore(aiPredictions.qualityScore);
        }
        if (aiPredictions.suggestedPrice != null && !Number.isNaN(Number(aiPredictions.suggestedPrice))) {
            setAiSuggestedPrice(Math.round(Number(aiPredictions.suggestedPrice)));
        }

        if (!userProvidedExpiryDate) {
            const productType = aiPredictions.productType || 'cooked';

            if (productType === 'packed' && aiPredictions.expiryDateFromPackage) {
                try {
                    const expiryDate = new Date(aiPredictions.expiryDateFromPackage);
                    const formattedDate = expiryDate.toISOString().split('T')[0];
                    setUserProvidedExpiryDate(formattedDate);
                } catch (error) {
                    console.error('[DonationForm] Error formatting expiry date from package:', error);
                }
            } else if (productType === 'cooked') {
                const today = new Date();
                const expiryDate = new Date(today);
                expiryDate.setDate(expiryDate.getDate() + 2);
                setUserProvidedExpiryDate(expiryDate.toISOString().split('T')[0]);
            } else {
                const today = new Date();
                const expiryDate = new Date(today);
                expiryDate.setDate(expiryDate.getDate() + 3);
                setUserProvidedExpiryDate(expiryDate.toISOString().split('T')[0]);
            }
        }

        setIsAiFilled(true);
    }, [aiPredictions, isEditMode, userHasEdited]);

    // Handle quantity increment/decrement
    const handleQuantityChange = (delta) => {
        markUserEdited();
        setQuantity(prev => Math.max(1, prev + delta));
    };

    const handleApplyAiPrice = () => {
        if (aiSuggestedPrice != null && aiSuggestedPrice > 0) {
            setPriceAmount(String(aiSuggestedPrice));
            markUserEdited();
        }
    };

    const handleListingTypeChange = (type) => {
        setListingType(type);
        markUserEdited();
        if (type === 'donate') {
            setPriceAmount('');
        }
    };

    // Toggle edit UI only — does not commit or discard changes
    const handleEditAll = () => {
        setIsEditing(prev => !prev);
    };

    const handlePostDonation = async () => {
        if (isFormLocked || !isFormValid() || isSubmitting) {
            return;
        }

        if (!isEditMode && blockNewOrders) {
            setSubmitError(MAINTENANCE_BLOCK_MESSAGE);
            return;
        }

        // Preserve any in-progress edits through submit (no "Done Editing" required)
        setUserHasEdited(true);

        // Validate required fields
        if (!imageUrl) {
            setSubmitError('Please upload an image first');
            return;
        }

        if (!itemName || !foodCategory || !quantity) {
            setSubmitError('Please fill in all required fields');
            return;
        }

        setSubmitError(null);
        setShowLocationModal(true);
    };

    const getResolvedExpiryDate = () =>
        (userProvidedExpiryDate || aiPredictions?.expiryDateFromPackage || '').trim();

    const buildCreatePayload = (latitude, longitude, address) => {
        const storageCapitalized = storage.charAt(0).toUpperCase() + storage.slice(1);
        return {
            foodCategory: foodCategory.trim(),
            itemName: itemName.trim(),
            quantity: Number(quantity),
            storageRecommendation: storageCapitalized,
            imageUrl,
            aiConfidence: aiConfidence ?? aiPredictions?.confidence ?? null,
            aiQualityScore: aiQualityScore ?? aiPredictions?.qualityScore ?? null,
            aiFreshness: aiPredictions?.freshness || null,
            aiDetectedItems: aiPredictions?.detectedItems || [],
            productType: aiPredictions?.productType || null,
            expiryDateFromPackage: aiPredictions?.expiryDateFromPackage || null,
            userProvidedExpiryDate: getResolvedExpiryDate(),
            listingType,
            priceAmount: listingType === 'sell' ? Number(priceAmount) : null,
            priceCurrency: 'LKR',
            aiSuggestedPrice: aiSuggestedPrice ?? aiPredictions?.suggestedPrice ?? null,
            pickupAddress: address,
            donorLatitude: latitude,
            donorLongitude: longitude,
        };
    };

    const buildUpdatePayload = (latitude, longitude, address) => {
        const storageCapitalized = storage.charAt(0).toUpperCase() + storage.slice(1);
        return {
            foodCategory: foodCategory.trim(),
            itemName: itemName.trim(),
            quantity: Number(quantity),
            storageRecommendation: storageCapitalized,
            imageUrl: imageUrl || undefined,
            userProvidedExpiryDate: getResolvedExpiryDate(),
            listingType,
            priceAmount: listingType === 'sell' ? Number(priceAmount) : null,
            priceCurrency: 'LKR',
            pickupAddress: address,
            donorLatitude: latitude,
            donorLongitude: longitude,
        };
    };

    const handleLocationConfirm = async (lat, lng, confirmedAddress) => {
        const address = String(confirmedAddress || '').trim();
        const latitude = Number(lat);
        const longitude = Number(lng);

        if (!address) {
            setSubmitError('Pickup address is required.');
            return;
        }
        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
            setSubmitError('Valid pickup coordinates are required.');
            return;
        }
        if (!imageUrl) {
            setSubmitError('Please upload an image first.');
            return;
        }

        setSelectedLatitude(latitude);
        setSelectedLongitude(longitude);
        setPickupAddress(address);
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            if (isEditMode && editDonationId) {
                const response = await updateDonation(
                    editDonationId,
                    buildUpdatePayload(latitude, longitude, address)
                );
                if (response?.success) {
                    setShowLocationModal(false);
                    navigate('/supplier/my-donation', { replace: true });
                } else {
                    throw new Error(response?.message || 'Failed to update donation');
                }
                return;
            }

            const response = await submitDonation(
                buildCreatePayload(latitude, longitude, address)
            );

            if (response?.success || response?.donation) {
                setShowLocationModal(false);
                setSubmitSuccess('Donation saved successfully. Redirecting…');
                setTimeout(() => {
                    navigate('/supplier/my-donation', { replace: true });
                }, 600);
            } else {
                throw new Error(response?.message || 'Failed to submit donation');
            }
        } catch (error) {
            console.error('[DonationForm] Error submitting donation:', error);
            console.error('[DonationForm] Error response:', error.response?.data);
            
            // Handle token expiration - redirect to login
            if (error.response?.data?.code === 'TOKEN_EXPIRED' || 
                error.response?.data?.message?.includes('expired') ||
                error.response?.data?.message?.includes('session')) {
                clearAuth();
                alert('Your session has expired. Please log in again to continue.');
                navigate('/login');
                return;
            }
            
            let errorMessage = isEditMode ? 'Failed to update donation. Please try again.' : 'Failed to submit donation. Please try again.';
            
            if (error.response?.data) {
                // Check for validation errors array
                if (error.response.data.errors && Array.isArray(error.response.data.errors) && error.response.data.errors.length > 0) {
                    errorMessage = error.response.data.errors.map(err => err.message || `${err.field}: ${err.message}`).join(', ');
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response.data.error) {
                    errorMessage = error.response.data.error;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setSubmitError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLocationModalClose = () => {
        if (isSubmitting) return;
        setShowLocationModal(false);
        setSubmitError(null);
    };

    return (
        <div className={`donation-form-container${isFormLocked ? ' donation-form-container--locked' : ''}`}>
            {isFormLocked && (
                <div className="form-lock-banner" role="status">
                    {isAnalyzing
                        ? 'AI is analyzing your photo. The form will unlock when analysis finishes.'
                        : 'Upload a food photo on the left to unlock this form.'}
                </div>
            )}
            {/* AI Analysis Banner (hide in edit mode) */}
            {!isEditMode && aiPredictions && (
                <div className="ai-analysis-banner">
                    <div className="analysis-status">
                        <span className="check-icon-circle">✓</span>
                        <span className="analysis-text">
                            AI Analysis: <span className="confidence">{Math.round((aiConfidence || aiPredictions.confidence || 0.90) * 100)}% confidence</span> — <span className="quality">{Math.round((aiQualityScore || aiPredictions.qualityScore || 0.85) * 100)}% quality</span> — Freshness Verified
                        </span>
                    </div>
                    <div className="safety-badge">
                        <img src={lightningBoltIcon} alt="" className="form-icon safety-icon" />
                        High Safety
                    </div>
                </div>
            )}
            {error && (
                <div className="error-banner">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">{error}</span>
                </div>
            )}
            {aiPredictions?.isSpoiled && (
                <div className="spoilage-advisory-banner">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">
                        AI detected possible spoilage or quality concerns. Review the item before posting.
                    </span>
                </div>
            )}
            {submitSuccess && (
                <div className="success-banner">
                    <span className="success-icon">✓</span>
                    <span className="success-text">{submitSuccess}</span>
                </div>
            )}
            {submitError && (
                <div className="error-banner">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">{submitError}</span>
                </div>
            )}

            <fieldset disabled={isFormLocked} className="donation-form-fieldset">
            {/* Core Details Header */}
            <div className="form-section-header">
                <div className="section-title">
                    <img src={autoFixHighIcon} alt="" className="form-icon magic-wand-icon" />
                    <h2>Core Details</h2>
                    {isAiFilled && <span className="ai-filled-badge">(AI-Filled)</span>}
                </div>
                <button type="button" className="edit-all-btn" onClick={handleEditAll} disabled={isFormLocked}>
                    {isEditing ? 'Done Editing' : 'Edit All Fields'}
                </button>
            </div>

            {/* Core Details Form */}
            <div className="form-grid">
                <div className="form-group">
                    <label>Food Category <span className="required-asterisk">*</span></label>
                    <div className="input-with-icon">
                        <input 
                            type="text" 
                            value={foodCategory}
                            onChange={(e) => {
                                setFoodCategory(e.target.value);
                                markUserEdited();
                            }}
                            readOnly={fieldReadOnly}
                            required
                        />
                        {(!fieldReadOnly) && <img src={editIcon} alt="" className="form-icon edit-icon-img" />}
                    </div>
                </div>

                <div className="form-group">
                    <label>Item Name <span className="required-asterisk">*</span></label>
                    <div className="input-with-icon">
                        <input 
                            type="text" 
                            value={itemName}
                            onChange={(e) => {
                                setItemName(e.target.value);
                                markUserEdited();
                            }}
                            readOnly={fieldReadOnly}
                            required
                        />
                        {(!fieldReadOnly) && <img src={editIcon} alt="" className="form-icon edit-icon-img" />}
                    </div>
                </div>

                <div className="form-group">
                    <label>Quantity / Servings <span className="required-asterisk">*</span></label>
                    <div className="quantity-control">
                        <button 
                            type="button"
                            className="qty-btn minus" 
                            onClick={() => handleQuantityChange(-1)}
                            disabled={fieldDisabled}
                        >
                            <img src={subtractIcon} alt="Decrease" className="form-icon qty-icon" />
                        </button>
                        <input 
                            type="text" 
                            value={fieldsEditable ? quantity : `${quantity} Plates`}
                            className="qty-input"
                            readOnly={fieldReadOnly}
                            onChange={(e) => {
                                const text = e.target.value.replace(/\D/g, ''); // Remove non-digits
                                const value = parseInt(text) || 1;
                                setQuantity(value);
                                markUserEdited();
                            }}
                            onFocus={(e) => {
                                if (fieldReadOnly) {
                                    e.target.blur();
                                } else {
                                    e.target.value = quantity.toString();
                                }
                            }}
                        />
                        <button 
                            type="button"
                            className="qty-btn plus" 
                            onClick={() => handleQuantityChange(1)}
                            disabled={fieldDisabled}
                        >
                            <img src={plusMathIcon} alt="Increase" className="form-icon qty-icon" />
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label>Storage Instructions <span className="required-asterisk">*</span></label>
                    <div className="toggle-group">
                        <button
                            type="button"
                            className={`toggle-btn hot ${storage === 'hot' ? 'active' : ''}`}
                            onClick={() => {
                                setStorage('hot');
                                markUserEdited();
                            }}
                            disabled={isFormLocked}
                        >
                            <img src={sunIcon} alt="" className="form-icon storage-icon" />
                            Hot
                        </button>
                        <button
                            type="button"
                            className={`toggle-btn cold ${storage === 'cold' ? 'active' : ''}`}
                            onClick={() => {
                                setStorage('cold');
                                markUserEdited();
                            }}
                            disabled={isFormLocked}
                        >
                            <img src={winterIcon} alt="" className="form-icon storage-icon" />
                            Cold
                        </button>
                        <button
                            type="button"
                            className={`toggle-btn dry ${storage === 'dry' ? 'active' : ''}`}
                            onClick={() => {
                                setStorage('dry');
                                markUserEdited();
                            }}
                            disabled={isFormLocked}
                        >
                            <img src={blurIcon} alt="" className="form-icon storage-icon" />
                            Dry
                        </button>
                    </div>
                </div>

                <div className="form-group form-group-full">
                    <label>Listing type <span className="required-asterisk">*</span></label>
                    <div className="toggle-group listing-type-toggle">
                        <button
                            type="button"
                            className={`toggle-btn ${listingType === 'donate' ? 'active' : ''}`}
                            onClick={() => handleListingTypeChange('donate')}
                        >
                            Donate
                        </button>
                        <button
                            type="button"
                            className={`toggle-btn sell ${listingType === 'sell' ? 'active' : ''}`}
                            onClick={() => handleListingTypeChange('sell')}
                        >
                            Sell for cash
                        </button>
                    </div>
                </div>

                {listingType === 'sell' && (
                    <div className="form-group form-group-full">
                        <label>Total price for all servings (LKR) <span className="required-asterisk">*</span></label>
                        <div className="price-input-row">
                            <input
                                type="number"
                                className="price-input"
                                min="1"
                                step="1"
                                placeholder="e.g. 500"
                                value={priceAmount}
                                onChange={(e) => {
                                    setPriceAmount(e.target.value);
                                    markUserEdited();
                                }}
                                required
                            />
                            {aiSuggestedPrice != null && aiSuggestedPrice > 0 && (
                                <button
                                    type="button"
                                    className="use-ai-price-btn"
                                    onClick={handleApplyAiPrice}
                                >
                                    <img src={autoFixHighIcon} alt="" className="form-icon use-ai-price-icon" />
                                    Use AI price (Rs. {aiSuggestedPrice.toLocaleString()})
                                </button>
                            )}
                        </div>
                        {quantity > 1 && Number(priceAmount) > 0 && (
                            <p className="price-hint">
                                Receivers will see Rs. {Math.round(Number(priceAmount) / quantity).toLocaleString()} per serving
                            </p>
                        )}
                        {aiSuggestedPrice != null && aiSuggestedPrice > 0 && (
                            <p className="price-hint">
                                AI suggested Rs. {aiSuggestedPrice.toLocaleString()} based on the photo
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Expiry Date Input (always visible) */}
            <div className="form-section-header" style={{ marginTop: '20px' }}>
                <div className="section-title">
                    <img src={protectIcon} alt="" className="form-icon section-icon" />
                    <h2>Expiry Date</h2>
                </div>
            </div>
            <div className="form-grid">
                <div className="form-group">
                    <label>Expiry Date <span className="required-asterisk">*</span></label>
                    <div className="input-with-icon">
                        <input
                            type="date"
                            value={userProvidedExpiryDate}
                            onChange={(e) => {
                                setUserProvidedExpiryDate(e.target.value);
                                markUserEdited();
                            }}
                            min={new Date().toISOString().split('T')[0]}
                            required
                        />
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                        {aiPredictions?.productType === 'packed' 
                            ? 'Enter the expiry date from the package label (or use AI-detected date if available)'
                            : 'Enter the expiry date for this food item'}
                        {aiPredictions?.expiryDateFromPackage && (
                            <span style={{ display: 'block', marginTop: '4px', color: '#10b981' }}>
                                💡 AI detected expiry: {new Date(aiPredictions.expiryDateFromPackage).toLocaleDateString()}
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="form-footer">
                <div className="checkbox-group">
                    <input 
                        type="checkbox" 
                        id="safety-confirm" 
                        checked={safetyConfirmed}
                        onChange={(e) => setSafetyConfirmed(e.target.checked)}
                        required
                    />
                    <label htmlFor="safety-confirm">I confirm that all detected AI details are accurate and the food meets safety standards.</label>
                </div>

                <div
                    className={`post-button-wrapper${!formCanSubmit && !isSubmitting ? ' has-disabled-hint' : ''}`}
                >
                    <button
                        type="button"
                        className={`post-donation-btn ${!formCanSubmit || isSubmitting ? 'disabled' : ''}`}
                        onClick={handlePostDonation}
                        disabled={isSubmitting}
                        aria-disabled={!formCanSubmit || isSubmitting}
                        aria-describedby={!formCanSubmit && !isSubmitting ? 'post-donation-disabled-hint' : undefined}
                    >
                        {isSubmitting ? (
                            isEditMode ? 'Updating...' : 'Submitting...'
                        ) : isEditMode ? (
                            listingType === 'sell' ? 'Update Product' : 'Update Donation'
                        ) : listingType === 'sell' ? (
                            'Sell Product ▶'
                        ) : (
                            'Post Donation ▶'
                        )}
                    </button>
                    {!formCanSubmit && !isSubmitting && disabledReasons.length > 0 && (
                        <div
                            id="post-donation-disabled-hint"
                            className="disabled-tooltip"
                            role="tooltip"
                        >
                            <span className="disabled-tooltip-title">
                                {listingType === 'sell' ? 'Complete these to sell:' : 'Complete these to post:'}
                            </span>
                            <ul className="disabled-tooltip-list">
                                {disabledReasons.map((reason) => (
                                    <li key={reason}>{reason}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {donorStats?.badgeProgress && (
                    <div className="progress-status">
                        <div className="progress-text">
                            {(() => {
                                const bp = donorStats.badgeProgress;
                                const nextIndex = bp.timeline?.findIndex((t) => !t.achieved) ?? -1;
                                const nextKey = nextIndex >= 0 ? BADGE_KEYS_ORDER[nextIndex] : null;
                                const iconKey = bp.currentBadgeKey || nextKey;
                                const badgeIconSrc = iconKey ? getBadgeIconSrc(iconKey) : null;
                                return (
                                    <>
                                        {badgeIconSrc && (
                                            <img src={badgeIconSrc} alt="" className="progress-status__badge-icon" />
                                        )}
                                        {bp.nextBadge ? (
                                            bp.remaining === 0 ? (
                                                <>You're one donation away from your <strong>{bp.nextBadge}</strong> badge!</>
                                            ) : bp.remaining === 1 ? (
                                                <>You are 1 donation away from your <strong>{bp.nextBadge}</strong> badge!</>
                                            ) : (
                                                <>You are {bp.remaining} donations away from your <strong>{bp.nextBadge}</strong> badge!</>
                                            )
                                    ) : (
                                        <>You've earned all donation badges! Congratulations!</>
                                    )}
                                    {bp.nextMilestone != null ? (
                                        <span className="progress-fraction">
                                            {donorStats.totalDonationsDelivered ?? 0}/{bp.nextMilestone} Completed
                                        </span>
                                    ) : (
                                        <span className="progress-fraction">
                                            {donorStats.totalDonationsDelivered ?? 0}+ Completed
                                        </span>
                                    )}
                                    </>
                                );
                            })()}
                        </div>
                        {donorStats.badgeProgress.nextMilestone != null && donorStats.badgeProgress.remaining != null && (
                            <div className="progress-bar-bg">
                                <div
                                    className="progress-bar-fill"
                                    style={{
                                        width: `${Math.min(
                                            100,
                                            ((donorStats.badgeProgress.nextMilestone - donorStats.badgeProgress.remaining) / donorStats.badgeProgress.nextMilestone) * 100
                                        )}%`,
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
            </fieldset>

            {/* Location Confirmation Modal */}
            <LocationMapModal
                isOpen={showLocationModal}
                onClose={handleLocationModalClose}
                onConfirm={handleLocationConfirm}
                saving={isSubmitting}
                saveError={submitError}
                initialPickupAddress={
                    isEditMode
                        ? pickupAddress ||
                          initialData?.pickupAddress ||
                          initialData?.donorAddress ||
                          ''
                        : pickupAddress || ''
                }
                defaultLat={selectedLatitude ?? (isEditMode ? initialData?.donorLatitude : undefined)}
                defaultLng={selectedLongitude ?? (isEditMode ? initialData?.donorLongitude : undefined)}
                autoFetchOnOpen={
                    !isEditMode &&
                    selectedLatitude == null &&
                    selectedLongitude == null
                }
            />
        </div>
    );
}

export default DonationForm;
