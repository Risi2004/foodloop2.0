import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerPageLayout from '../../../../components/afterLogin/dashboard/customerSection/layout/CustomerPageLayout';
import { useMarketplace } from '../../../../contexts/MarketplaceContext';
import { customerRoutes } from '../../../../constants/customerRoutes';
import './CustomerCart.css';

const CustomerCart = () => {
  const { cart, updateQuantity, removeFromCart, getCartTotal, getDeliveryFee } = useMarketplace();
  const navigate = useNavigate();

  const handleCheckout = () => {
    navigate(customerRoutes.payment());
  };

  return (
    <CustomerPageLayout>
      <div className="customer-page cart-page">
        <header className="customer-page-hero cart-hero">
          <Link to={customerRoutes.marketplace()} className="back-link">
            &larr; Continue Shopping
          </Link>
          <h1>Your Shopping Cart</h1>
          <p>{cart.length} {cart.length === 1 ? 'item' : 'items'} in your cart</p>
        </header>

        {cart.length === 0 ? (
          <div className="empty-cart customer-panel">
            <div className="empty-cart__icon" aria-hidden>
              🛒
            </div>
            <h2>Your cart is empty</h2>
            <p>Browse the marketplace and add fresh items to get started.</p>
            <Link to={customerRoutes.marketplace()} className="shop-now-btn">
              Shop Marketplace
            </Link>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items">
              {cart.map((item) => (
                <div key={item.id} className="cart-item customer-panel">
                  <div className="cart-item-img">
                    <img src={item.image} alt={item.name} />
                  </div>
                  <div className="cart-item-details">
                    <h3>{item.name}</h3>
                    <p>{item.vendorName}</p>
                  </div>
                  <div className="cart-item-quantity">
                    <button type="button" onClick={() => updateQuantity(item.id, -1)} aria-label="Decrease quantity">
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.id, 1)} aria-label="Increase quantity">
                      +
                    </button>
                  </div>
                  <div className="cart-item-price">LKR {(item.price * item.quantity).toLocaleString()}</div>
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <aside className="cart-summary customer-summary-panel">
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
              <button type="button" className="customer-btn-primary checkout-btn" onClick={handleCheckout}>
                Proceed to Checkout
              </button>
            </aside>
          </div>
        )}
      </div>
    </CustomerPageLayout>
  );
};

export default CustomerCart;
