import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import CustomerPageLayout from '../../../../components/afterLogin/dashboard/customerSection/layout/CustomerPageLayout';
import LocationMapModal from '../../../../components/afterLogin/donor/myDonation/locationMapModal/LocationMapModal';
import { useMarketplace } from '../../../../contexts/MarketplaceContext';
import { getUser } from '../../../../utils/auth';
import { customerRoutes } from '../../../../constants/customerRoutes';
import CustomerPaymentModal from '../../../../components/afterLogin/customer/payment/CustomerPaymentModal';
import {
  createCustomerCheckout,
  placeCustomerCodOrder,
  getCustomerDiscountOfferStatus,
} from '../../../../services/paymentApi';
import './CustomerPayment.css';

const CustomerPayment = () => {
  const {
    cart,
    getCartTotal,
    getDiscountedSubtotal,
    getDeliveryFee,
    clearCart,
    discountOfferEnabled,
    getSelectedDiscountItemIds,
  } = useMarketplace();
  const navigate = useNavigate();
  const user = getUser();

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [address, setAddress] = useState(user?.address || '');
  const [deliveryLat, setDeliveryLat] = useState(null);
  const [deliveryLng, setDeliveryLng] = useState(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState('card');
  const [locationModalPurpose, setLocationModalPurpose] = useState('payment');

  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pageError, setPageError] = useState('');
  const [placedOrderId, setPlacedOrderId] = useState('');
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

  const discountOfferPayload =
    offerStatus?.eligible && discountOfferEnabled
      ? {
          enabled: true,
          selectedItemIds: getSelectedDiscountItemIds(),
        }
      : { enabled: false, selectedItemIds: [] };

  const subtotal = discountOfferPayload.enabled ? getDiscountedSubtotal() : getCartTotal();
  const total = subtotal + getDeliveryFee();

  useEffect(() => {
    if (cart.length === 0 && !showSuccess) {
      navigate(customerRoutes.marketplace());
    }
  }, [cart, showSuccess, navigate]);

  const buildCheckoutPayload = (method = 'card', lat = deliveryLat, lng = deliveryLng, deliveryAddress = address) => {
    const items = cart.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: Number(item.price || 0),
    }));
    return {
      items,
      subtotal,
      deliveryFee: getDeliveryFee(),
      total,
      address: deliveryAddress,
      customerLatitude: lat,
      customerLongitude: lng,
      paymentMethod: method,
      discountOffer: discountOfferPayload,
    };
  };

  const proceedWithPayment = (method, lat, lng, deliveryAddress) => {
    setPageError('');

    if (method === 'cod') {
      setIsProcessing(true);
      placeCustomerCodOrder(buildCheckoutPayload('cod', lat, lng, deliveryAddress))
        .then((res) => {
          setPlacedOrderId(res?.orderId || '');
          setShowSuccess(true);
          clearCart();
        })
        .catch((err) => {
          setPageError(err.message || 'Unable to place COD order. Please try again.');
        })
        .finally(() => {
          setIsProcessing(false);
        });
      return;
    }

    setIsProcessing(true);
    createCustomerCheckout(buildCheckoutPayload('card', lat, lng, deliveryAddress))
      .then((res) => {
        setCheckout(res);
        setIsPaymentModalOpen(true);
      })
      .catch((err) => {
        setPageError(err.message || 'Unable to start online payment. Please try again.');
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  const handleConfirmPayment = () => {
    if (isProcessing) return;
    setPageError('');
    setPendingPaymentMethod(paymentMethod);
    setLocationModalPurpose('payment');
    setLocationModalOpen(true);
  };

  const handleLocationConfirm = async (lat, lng, confirmedAddress) => {
    setDeliveryLat(lat);
    setDeliveryLng(lng);
    setAddress(confirmedAddress);
    setLocationConfirmed(true);
    setLocationModalOpen(false);

    if (locationModalPurpose === 'payment') {
      proceedWithPayment(pendingPaymentMethod, lat, lng, confirmedAddress);
    }
  };

  const openLocationPreview = () => {
    setLocationModalPurpose('preview');
    setLocationModalOpen(true);
  };

  const handleCardPaymentSuccess = () => {
    setPlacedOrderId(checkout?.orderId || '');
    setIsPaymentModalOpen(false);
    setCheckout(null);
    setShowSuccess(true);
    clearCart();
  };

  const isFormValid = () => cart.length > 0;

  const locationConfirmLabel =
    locationModalPurpose === 'payment'
      ? pendingPaymentMethod === 'cod'
        ? 'Confirm & place order'
        : 'Confirm & continue to payment'
      : 'Save delivery location';

  const successPopup = showSuccess ? (
    <div className="success-overlay">
      <div className="success-content">
        <div className="success-icon-circle">
          <div className="check-svg-container">
            <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
              <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>
        </div>
        <h2>Order Placed Successfully!</h2>
        <p>Your order has been placed. Tracking will update once a driver accepts it.</p>
        <div className="success-summary">
          <p>Order ID: {placedOrderId || 'Created successfully'}</p>
        </div>
        <button type="button" onClick={() => navigate(customerRoutes.orderTracking())} className="return-btn">
          Go to Order Tracking
        </button>
      </div>
    </div>
  ) : null;

  return (
    <CustomerPageLayout>
      <div className="customer-page payment-page">
        <header className="customer-page-hero">
          <Link to={customerRoutes.cart()} className="back-link">
            &larr; Back to Cart
          </Link>
          <h1>Secure Checkout</h1>
          <p>Review your order and complete payment</p>
        </header>

        <div className="payment-content">
          <div className="payment-options-section">
            <div className="payment-card customer-panel address-box">
              <div className="card-header">
                <h3>Delivery Location</h3>
                <button
                  type="button"
                  className="edit-btn"
                  onClick={openLocationPreview}
                >
                  {locationConfirmed ? 'Change on map' : 'Set on map'}
                </button>
              </div>
              {locationConfirmed && address ? (
                <p className="address-display">{address}</p>
              ) : (
                <p className="address-display address-display--hint">
                  You will confirm your delivery location on the map when you proceed to payment.
                  Live location is used to pin your address accurately.
                </p>
              )}
            </div>

            <div className="payment-method-selector">
              <button
                type="button"
                className={`method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                <span className="icon">💳</span>
                Card Payment
              </button>
              <button
                type="button"
                className={`method-btn ${paymentMethod === 'cod' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('cod')}
              >
                <span className="icon">💵</span>
                Cash on Delivery
              </button>
            </div>

            {paymentMethod === 'card' ? (
              <div className="payment-inline-note customer-panel">
                Card details will open in a popup after you click <strong>Continue to Payment</strong>.
              </div>
            ) : (
              <div className="payment-card customer-panel">
                <div className="cod-info">
                  <h3>Cash on Delivery</h3>
                  <p>
                    Pay exactly <strong>LKR {total.toLocaleString()}</strong> when
                    {' '}
                    delivered to your doorstep.
                  </p>
                  {discountOfferPayload.enabled && (
                    <p className="payment-offer-note">
                      Low-income offer applied to selected items.
                    </p>
                  )}
                  <div className="cod-notice">
                    <span className="info-icon">ℹ️</span>
                    <p>Please have the exact amount ready to speed up delivery.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="payment-summary-section">
            <div className="customer-summary-panel payment-summary-box">
              <h3>Order Review</h3>
              <div className="mini-item-list">
                {cart.map((item) => (
                  <div key={item.id} className="mini-item">
                    <img src={item.image} alt="" />
                    <div className="mini-item-info">
                      <p className="mini-name">{item.name}</p>
                      <p className="mini-price">
                        x{item.quantity} • LKR {(item.price * item.quantity).toLocaleString()}
                        {discountOfferPayload.enabled &&
                          discountOfferPayload.selectedItemIds.includes(String(item.id)) && (
                            <span className="mini-discounted-price">
                              {' '}→ LKR {(item.price * item.quantity * 0.8).toLocaleString()}
                            </span>
                          )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="summary-divider" />

              <div className="summary-row">
                <span>Subtotal</span>
                <span>LKR {subtotal.toLocaleString()}</span>
              </div>
              <div className="summary-row">
                <span>Delivery Fee</span>
                <span>LKR {getDeliveryFee().toLocaleString()}</span>
              </div>
              <div className="summary-row total">
                <span>Total to Pay</span>
                <span>LKR {total.toLocaleString()}</span>
              </div>
              {offerStatus?.eligible && (
                <p className="payment-offer-remaining">
                  Offer remaining this month: {offerStatus.remaining} / {offerStatus.monthlyLimit}
                </p>
              )}

              <button
                type="button"
                className="customer-btn-primary confirm-btn"
                onClick={handleConfirmPayment}
                disabled={isProcessing || !isFormValid()}
              >
                {isProcessing ? (
                  <span className="loader">Processing...</span>
                ) : (
                  <>{paymentMethod === 'cod' ? 'Confirm location & place order' : 'Confirm location & pay'}</>
                )}
              </button>
              {pageError && <p className="payment-page-error">{pageError}</p>}
              <p className="security-note">Secured by FoodLoop Payment Gateway</p>
            </div>
          </aside>
        </div>
      </div>

      {typeof document !== 'undefined' ? createPortal(successPopup, document.body) : successPopup}

      <CustomerPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          if (isProcessing) return;
          setIsPaymentModalOpen(false);
        }}
        checkout={checkout}
        onSuccess={handleCardPaymentSuccess}
      />

      <LocationMapModal
        isOpen={locationModalOpen}
        onClose={() => {
          if (isProcessing) return;
          setLocationModalOpen(false);
        }}
        onConfirm={handleLocationConfirm}
        defaultLat={deliveryLat ?? undefined}
        defaultLng={deliveryLng ?? undefined}
        autoFetchOnOpen
        saving={isProcessing}
        saveError={pageError}
        title="Confirm delivery location"
        confirmLabel={locationConfirmLabel}
        addressLabel="Delivery address"
        addressPlaceholder="Enter your delivery address"
        instructions="Allow live location or drag the marker to set where your order should be delivered."
        savingMessage="Placing order…"
      />
    </CustomerPageLayout>
  );
};

export default CustomerPayment;
