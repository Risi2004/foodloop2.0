import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketplace } from '../../../../contexts/MarketplaceContext';
import { getUser } from '../../../../utils/auth';

// Icons (reusing Donor icons for that premium look)
import autoFixHighIcon from '../../../../assets/icons/afterLogin/donor/new-donation/auto_fix_high.svg';
import editIcon from '../../../../assets/icons/afterLogin/donor/new-donation/Edit.svg';
import lightningBoltIcon from '../../../../assets/icons/afterLogin/donor/new-donation/Lightning Bolt.svg';
import plusMathIcon from '../../../../assets/icons/afterLogin/donor/new-donation/Plus Math.svg';
import subtractIcon from '../../../../assets/icons/afterLogin/donor/new-donation/Subtract.svg';
import calendarIcon from '../../../../assets/icons/afterLogin/donor/new-donation/Tear-Off Calendar.svg';
import truckIcon from '../../../../assets/icons/afterLogin/donor/new-donation/local_shipping.svg';
import clockIcon from '../../../../assets/icons/afterLogin/donor/new-donation/Clock.svg';

import './VendorProductForm.css';

const VendorProductForm = ({ aiPredictions, imageUrl, error }) => {
    const navigate = useNavigate();
    const { addProduct } = useMarketplace();
    const user = getUser();

    const [isDonation, setIsDonation] = useState(false);
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Food');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [expiryDate, setExpiryDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        return d.toISOString().split('T')[0];
    });

    const [pickupDate, setPickupDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    });
    const [pickupTimeFrom, setPickupTimeFrom] = useState('09:00');
    const [pickupTimeTo, setPickupTimeTo] = useState('18:00');

    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // Auto-fill from AI predictions
    useEffect(() => {
        if (aiPredictions) {
            if (aiPredictions.itemName) setName(aiPredictions.itemName);
            if (aiPredictions.foodCategory) setCategory(aiPredictions.foodCategory);
            if (aiPredictions.description) setDescription(aiPredictions.description);
            if (aiPredictions.quantity) setQuantity(aiPredictions.quantity);
        }
    }, [aiPredictions]);

    const handleQuantityChange = (delta) => {
        setQuantity(prev => Math.max(1, prev + delta));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const productData = {
                name,
                category,
                description,
                isDonation,
                price: isDonation ? 0 : parseFloat(price || 0),
                quantity: parseInt(quantity),
                expiryDate,
                pickupDate,
                pickupTimeFrom,
                pickupTimeTo,
                position: [6.9271 + (Math.random() - 0.5) * 0.1, 79.8612 + (Math.random() - 0.5) * 0.1], // Randomized Colombo area
                image: imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
                vendorId: 'vendor-1', // Mock vendor ID
                vendorName: user?.username || 'Premium Vendor',
            };

            await addProduct(productData);
            navigate('/vendor/products');
        } catch (err) {
            setSubmitError('Failed to add product. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFormValid = () => {
        return name && category && (isDonation || price) && description && imageUrl;
    };

    return (
        <div className="product-form-container">
            {/* Sale vs Donation Toggle */}
            <div className="mode-toggle">
                <button 
                    className={`mode-btn ${!isDonation ? 'active sale' : ''}`}
                    onClick={() => setIsDonation(false)}
                >
                    Storefront Sale
                </button>
                <button 
                    className={`mode-btn ${isDonation ? 'active donation' : ''}`}
                    onClick={() => setIsDonation(true)}
                >
                    Community Donation
                </button>
            </div>

            {/* AI Analysis Banner */}
            {aiPredictions && (
                <div className="ai-analysis-banner">
                    <div className="analysis-status">
                        <span className="check-icon-circle">✓</span>
                        <span className="analysis-text">
                            AI Analysis: <span className="confidence">{Math.round((aiPredictions.confidence || 0.90) * 100)}% confidence</span> — Quality Verified
                        </span>
                    </div>
                    <div className="safety-badge">
                        <img src={lightningBoltIcon} alt="" className="form-icon safety-icon" />
                        High Quality
                    </div>
                </div>
            )}

            {error && <div className="error-banner"><span className="error-text">{error}</span></div>}
            {submitError && <div className="error-banner"><span className="error-text">{submitError}</span></div>}

            <div className="form-section-header">
                <div className="section-title">
                    <img src={autoFixHighIcon} alt="" className="form-icon magic-wand-icon" />
                    <h2>Product Details</h2>
                </div>
                <button className="edit-all-btn" onClick={() => setIsEditing(!isEditing)}>
                    {isEditing ? 'View Suggestions' : 'Edit All Fields'}
                </button>
            </div>

            <div className="form-grid">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Product Name</label>
                    <div className="input-with-icon">
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Fresh Organic Tomatoes"
                            required
                        />
                        <img src={editIcon} alt="" className="form-icon edit-icon-img" />
                    </div>
                </div>

                <div className="form-group">
                    <label>Category</label>
                    <div className="input-with-icon">
                        <select value={category} onChange={(e) => setCategory(e.target.value)}>
                            <option value="Food">Food</option>
                            <option value="Vegetables">Vegetables</option>
                            <option value="Bakery">Bakery</option>
                            <option value="Fruits">Fruits</option>
                            <option value="Meals">Ready Meals</option>
                        </select>
                    </div>
                </div>

                {!isDonation && (
                    <div className="form-group">
                        <label>Price ($)</label>
                        <div className="input-with-icon">
                            <input 
                                type="number" 
                                step="0.01" 
                                value={price} 
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0.00"
                                required={!isDonation}
                            />
                        </div>
                    </div>
                )}

                <div className="form-group">
                    <label>Available Quantity</label>
                    <div className="quantity-control">
                        <button className="qty-btn" onClick={() => handleQuantityChange(-1)}>
                            <img src={subtractIcon} alt="-" className="form-icon qty-icon" />
                        </button>
                        <input 
                            type="number" 
                            value={quantity}
                            className="qty-input"
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        />
                        <button className="qty-btn plus" onClick={() => handleQuantityChange(1)}>
                            <img src={plusMathIcon} alt="+" className="form-icon qty-icon" />
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label>Expiry Date</label>
                    <div className="input-with-icon">
                        <input 
                            type="date" 
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            required
                        />
                        <img src={calendarIcon} alt="" className="form-icon edit-icon-img" style={{ right: '40px' }} />
                    </div>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Description</label>
                    <div className="input-with-icon">
                        <textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Tell customers about your product..."
                            rows="3"
                            style={{ 
                                width: '100%', 
                                padding: '14px', 
                                border: 'none', 
                                borderRadius: '12px', 
                                outline: 'none',
                                fontFamily: 'inherit'
                            }}
                            required
                        />
                    </div>
                </div>
            </div>

            <div className="form-section-header" style={{ marginTop: '20px' }}>
                <div className="section-title">
                    <img src={truckIcon} alt="" className="form-icon truck-icon" />
                    <h2>Logistics & Pickup</h2>
                </div>
            </div>

            <div className="logistics-grid">
                <div className="pickup-column">
                    <label>Preferred Pickup Window</label>
                    <div className="pickup-datetime-container" style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                        <div className="pickup-input-group">
                            <img src={calendarIcon} alt="" className="form-icon pickup-icon-img" />
                            <input 
                                type="date" 
                                className="pickup-date-input"
                                value={pickupDate}
                                onChange={(e) => setPickupDate(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div className="pickup-input-group" style={{ flex: 1 }}>
                                <img src={clockIcon} alt="" className="form-icon pickup-icon-img" />
                                <span className="pickup-time-label">From:</span>
                                <input 
                                    type="time" 
                                    className="pickup-date-input"
                                    value={pickupTimeFrom}
                                    onChange={(e) => setPickupTimeFrom(e.target.value)}
                                />
                            </div>
                            <div className="pickup-input-group" style={{ flex: 1 }}>
                                <img src={clockIcon} alt="" className="form-icon pickup-icon-img" />
                                <span className="pickup-time-label">To:</span>
                                <input 
                                    type="time" 
                                    className="pickup-date-input"
                                    value={pickupTimeTo}
                                    onChange={(e) => setPickupTimeTo(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="form-footer">
                <button 
                    className="post-product-btn"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !isFormValid()}
                >
                    {isSubmitting ? 'Adding Product...' : `Post for ${isDonation ? 'Donation' : 'Sale'} ▶`}
                </button>
            </div>
        </div>
    );
};

export default VendorProductForm;
