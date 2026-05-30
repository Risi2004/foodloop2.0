import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerPageLayout from '../../../../components/afterLogin/dashboard/customerSection/layout/CustomerPageLayout';
import { useMarketplace } from '../../../../contexts/MarketplaceContext';
import { customerRoutes } from '../../../../constants/customerRoutes';
import { getCustomerDiscountOfferStatus } from '../../../../services/paymentApi';
import './CustomerCart.css';

const CustomerCart = () => {
  const {
    cart,
    updateQuantity,
    removeFromCart,
    getCartTotal,
    getDiscountedSubtotal,
    getDeliveryFee,
    discountOfferEnabled,
    setOfferEnabled,
    discountOfferSelections,
    toggleOfferSelection,
    activeSupplier,
  } = useMarketplace();
  const navigate = useNavigate();
  const [offerStatus, setOfferStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getCustomerDiscountOfferStatus()
      .then((res) => {
        if (!cancelled) setOfferStatus(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const discountedUnitsSelected = useMemo(
    () =>
      cart.reduce((acc, item) => {
        if (!discountOfferEnabled) return acc;
        return discountOfferSelections[String(item.id)] ? acc + Number(item.quantity || 0) : acc;
      }, 0),
    [cart, discountOfferEnabled, discountOfferSelections]
  );

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
          {activeSupplier?.name && (
            <p className="cart-supplier-note">Supplier: <strong>{activeSupplier.name}</strong></p>
          )}
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
              {offerStatus?.eligible && (
                <div className="cart-offer-banner customer-panel">
                  <label className="cart-offer-toggle">
                    <input
                      type="checkbox"
                      checked={discountOfferEnabled}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        if (enabled && !window.confirm('Enable low-income monthly 20% discount offer now?')) return;
                        setOfferEnabled(enabled);
                      }}
                    />
                    <span>Enable low-income offer (20% off selected products)</span>
                  </label>
                  <p>
                    Remaining this month: <strong>{offerStatus.remaining}</strong> / {offerStatus.monthlyLimit}
                  </p>
                  {discountOfferEnabled && (
                    <p className="cart-offer-hint">
                      Selected discounted units: {discountedUnitsSelected}
                    </p>
                  )}
                </div>
              )}
              {cart.map((item) => (
                <div key={item.id} className="cart-item customer-panel">
                  <div className="cart-item-img">
                    <img src={item.image} alt={item.name} />
                  </div>
                  <div className="cart-item-details">
                    <h3>{item.name}</h3>
                    <p>{item.vendorName}</p>
                    {offerStatus?.eligible && discountOfferEnabled && (
                      <label className="cart-item-offer-select">
                        <input
                          type="checkbox"
                          checked={!!discountOfferSelections[String(item.id)]}
                          onChange={() => toggleOfferSelection(item.id)}
                        />
                        Apply 20% offer to this product
                      </label>
                    )}
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
                  <div className="cart-item-price">
                    {offerStatus?.eligible &&
                    discountOfferEnabled &&
                    discountOfferSelections[String(item.id)] ? (
                      <>
                        <span className="cart-item-price-old">
                          LKR {(item.price * item.quantity).toLocaleString()}
                        </span>
                        <span>LKR {(item.price * item.quantity * 0.8).toLocaleString()}</span>
                      </>
                    ) : (
                      <>LKR {(item.price * item.quantity).toLocaleString()}</>
                    )}
                  </div>
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
                <span>LKR {(discountOfferEnabled ? getDiscountedSubtotal() : getCartTotal()).toLocaleString()}</span>
              </div>
              <div className="summary-row">
                <span>Delivery Fee</span>
                <span>LKR {getDeliveryFee().toLocaleString()}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>
                  LKR {((discountOfferEnabled ? getDiscountedSubtotal() : getCartTotal()) + getDeliveryFee()).toLocaleString()}
                </span>
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
