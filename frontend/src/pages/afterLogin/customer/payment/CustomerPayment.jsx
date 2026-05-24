import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerNavbar from '../../../../components/afterLogin/customer/navbar/CustomerNavbar';
import Footer from '../../../../components/beforeLogin/footer/Footer';
import { useMarketplace } from '../../../../contexts/MarketplaceContext';
import { getUser } from '../../../../utils/auth';
import './CustomerPayment.css';

const CustomerPayment = () => {
    const { cart, getCartTotal, getDeliveryFee, clearCart } = useMarketplace();
    const navigate = useNavigate();
    const user = getUser();

    const [paymentMethod, setPaymentMethod] = useState('card');
    const [address, setAddress] = useState(user?.address || '123 Main Street, Colombo, Sri Lanka');
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    
    // Card states
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Redirect if cart is empty and not showing success
    useEffect(() => {
        if (cart.length === 0 && !showSuccess) {
            navigate('/customer/marketplace');
        }
    }, [cart, showSuccess, navigate]);

    const handleConfirmPayment = () => {
        setIsProcessing(true);
        // Simulate network delay
        setTimeout(() => {
            setIsProcessing(false);
            setShowSuccess(true);
            clearCart();
            // Redirect after 3 seconds
            setTimeout(() => {
                navigate('/customer/marketplace');
            }, 3000);
        }, 2000);
    };

    const isFormValid = () => {
        if (paymentMethod === 'cod') return address.length > 5;
        return cardNumber.length >= 16 && expiry.length >= 5 && cvv.length === 3 && address.length > 5;
    };

    return (
        <div className="customer-layout">
            <CustomerNavbar />
            
            <main className="payment-container">
                <div className="payment-header">
                    <Link to="/customer/cart" className="back-link">&larr; Back to Cart</Link>
                    <h1>Secure Checkout</h1>
                </div>

                <div className="payment-content">
                    <div className="payment-options-section">
                        {/* Address Section */}
                        <div className="payment-card address-box">
                            <div className="card-header">
                                <h3>Delivery Address</h3>
                                <button 
                                    className="edit-btn" 
                                    onClick={() => setIsEditingAddress(!isEditingAddress)}
                                >
                                    {isEditingAddress ? 'Save' : 'Edit'}
                                </button>
                            </div>
                            {isEditingAddress ? (
                                <textarea 
                                    value={address} 
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="address-textarea"
                                    rows="3"
                                />
                            ) : (
                                <p className="address-display">{address}</p>
                            )}
                        </div>

                        {/* Payment Method Selector */}
                        <div className="payment-method-selector">
                            <button 
                                className={`method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                                onClick={() => setPaymentMethod('card')}
                            >
                                <span className="icon">💳</span>
                                Card Payment
                            </button>
                            <button 
                                className={`method-btn ${paymentMethod === 'cod' ? 'active' : ''}`}
                                onClick={() => setPaymentMethod('cod')}
                            >
                                <span className="icon">💵</span>
                                Cash on Delivery
                            </button>
                        </div>

                        {/* Payment Details Card */}
                        <div className="payment-card">
                            {paymentMethod === 'card' ? (
                                <div className="card-form">
                                    <h3>Card Details</h3>
                                    <div className="form-group">
                                        <label>Card Number</label>
                                        <input 
                                            type="text" 
                                            placeholder="XXXX XXXX XXXX XXXX" 
                                            value={cardNumber}
                                            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0,16))}
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Expiry Date</label>
                                            <input 
                                                type="text" 
                                                placeholder="MM/YY" 
                                                value={expiry}
                                                onChange={(e) => setExpiry(e.target.value.slice(0,5))}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>CVV</label>
                                            <input 
                                                type="text" 
                                                placeholder="123" 
                                                value={cvv}
                                                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0,3))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="cod-info">
                                    <h3>Cash on Delivery</h3>
                                    <p>Pay exactly <strong>LKR {(getCartTotal() + getDeliveryFee()).toLocaleString()}</strong> when your items are delivered to your doorstep.</p>
                                    <div className="cod-notice">
                                        <span className="info-icon">ℹ️</span>
                                        <p>Please have the exact amount ready to speed up delivery.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="payment-summary-section">
                        <div className="payment-card summary-box">
                            <h3>Order Review</h3>
                            <div className="mini-item-list">
                                {cart.map(item => (
                                    <div key={item.id} className="mini-item">
                                        <img src={item.image} alt="" />
                                        <div className="mini-item-info">
                                            <p className="mini-name">{item.name}</p>
                                            <p className="mini-price">x{item.quantity} • LKR {(item.price * item.quantity).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="summary-divider"></div>
                            
                            <div className="summary-row">
                                <span>Subtotal</span>
                                <span>LKR {getCartTotal().toLocaleString()}</span>
                            </div>
                            <div className="summary-row">
                                <span>Delivery Fee</span>
                                <span>LKR {getDeliveryFee().toLocaleString()}</span>
                            </div>
                            <div className="summary-row total">
                                <span>Total to Pay</span>
                                <span>LKR {(getCartTotal() + getDeliveryFee()).toLocaleString()}</span>
                            </div>

                            <button 
                                className="confirm-btn" 
                                onClick={handleConfirmPayment}
                                disabled={isProcessing || !isFormValid()}
                            >
                                {isProcessing ? (
                                    <span className="loader">Processing...</span>
                                ) : (
                                    <>Confirm Order & Pay</>
                                )}
                            </button>
                            <p className="security-note">🔒 Secured by FoodLoop Payment Gateway</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Success Overlay */}
            {showSuccess && (
                <div className="success-overlay">
                    <div className="success-content">
                        <div className="success-icon-circle">
                            <span className="check-mark">L</span> {/* Reversed L looks like check if styled right or use SVG */}
                            <div className="check-svg-container">
                                <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                                    <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                                    <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                                </svg>
                            </div>
                        </div>
                        <h2>Order Placed Successfully!</h2>
                        <p>Your fresh meal is being prepared and will be with you shortly.</p>
                        <div className="success-summary">
                            <p>Transaction ID: #FL-{Math.floor(Math.random() * 900000 + 100000)}</p>
                        </div>
                        <button onClick={() => navigate('/customer/marketplace')} className="return-btn">
                            Back to Marketplace
                        </button>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default CustomerPayment;
