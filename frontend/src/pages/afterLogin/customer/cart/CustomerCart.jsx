import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerNavbar from '../../../../components/afterLogin/customer/navbar/CustomerNavbar';
import Footer from '../../../../components/beforeLogin/footer/Footer';
import { useMarketplace } from '../../../../contexts/MarketplaceContext';
import './CustomerCart.css';

const CustomerCart = () => {
    const { cart, updateQuantity, removeFromCart, getCartTotal, getDeliveryFee, clearCart } = useMarketplace();
    const navigate = useNavigate();

    const handleCheckout = () => {
        navigate('/customer/payment');
    };

    return (
        <div className="customer-layout">
            <CustomerNavbar />
            
            <main className="cart-container">
                <div className="cart-header">
                    <Link to="/customer/marketplace" className="back-link">&larr; Continue Shopping</Link>
                    <h1>Your Shopping Cart</h1>
                </div>

                {cart.length === 0 ? (
                    <div className="empty-cart">
                        <h2>Your cart is empty.</h2>
                        <p>Go back to the marketplace to add some fresh items.</p>
                        <Link to="/customer/marketplace" className="shop-now-btn">Shop Now</Link>
                    </div>
                ) : (
                    <div className="cart-content">
                        <div className="cart-items">
                            {cart.map(item => (
                                <div key={item.id} className="cart-item">
                                    <div className="cart-item-img">
                                        <img src={item.image} alt={item.name} />
                                    </div>
                                    <div className="cart-item-details">
                                        <h3>{item.name}</h3>
                                        <p>{item.vendorName}</p>
                                    </div>
                                    <div className="cart-item-quantity">
                                        <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                                    </div>
                                    <div className="cart-item-price">
                                        LKR {(item.price * item.quantity).toLocaleString()}
                                    </div>
                                    <button className="remove-btn" onClick={() => removeFromCart(item.id)}>×</button>
                                </div>
                            ))}
                        </div>
                        
                        <div className="cart-summary">
                            <h3>Order Summary</h3>
                            <div className="summary-row">
                                <span>Subtotal</span>
                                <span>LKR {getCartTotal().toLocaleString()}</span>
                            </div>
                            <div className="summary-row">
                                <span>Delivery Fee</span>
                                <span>LKR {getDeliveryFee().toLocaleString()}</span>
                            </div>
                            <div className="summary-row total">
                                <span>Total</span>
                                <span>LKR {(getCartTotal() + getDeliveryFee()).toLocaleString()}</span>
                            </div>
                            <button className="checkout-btn" onClick={handleCheckout}>
                                Proceed to Checkout
                            </button>
                        </div>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default CustomerCart;
