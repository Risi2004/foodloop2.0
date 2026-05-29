import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { confirmClaimPayment } from '../../../../../services/paymentApi';
import './ClaimPaymentModal.css';

const formatCardNumber = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

/**
 * FoodLoop card payment gateway (receivers, suppliers, etc.).
 * Pass `confirmPayment` to override the default claim confirm API.
 */
const ClaimPaymentModal = ({
  isOpen,
  onClose,
  checkout,
  onSuccess,
  title = 'Pay for listing',
  submitLabel = 'Pay & continue',
  confirmPayment,
  footerNote,
  showAutoRenewOption = false,
  subscriptionTerms,
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setCardNumber('');
    setExpiry('');
    setCvv('');
    setAutoRenew(false);
    setError(null);
  }, [isOpen, checkout?.orderId]);

  if (!isOpen || !checkout) return null;

  const {
    orderId,
    amount,
    currency,
    itemName,
    breakdown,
    discountStatus,
    summaryLines,
  } = checkout;
  const currencyLabel = currency || 'LKR';
  const note = footerNote ?? checkout.footerNote;
  const terms =
    subscriptionTerms ??
    (showAutoRenewOption
      ? 'One month of access per payment. No refunds for the current billing period. Cancel auto-renew anytime; access continues until the period ends.'
      : null);

  const formatMoney = (value) =>
    `${currencyLabel} ${Number(value || 0).toLocaleString('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const isFormValid = () => {
    const digits = cardNumber.replace(/\D/g, '');
    return digits.length >= 16 && expiry.length >= 5 && cvv.replace(/\D/g, '').length === 3;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid() || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    const cardPayload = {
      orderId,
      cardNumber: cardNumber.replace(/\D/g, ''),
      expiry,
      cvv,
      cardLast4: cardNumber.replace(/\D/g, '').slice(-4),
      autoRenew: showAutoRenewOption ? autoRenew : undefined,
    };

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (confirmPayment) {
        await confirmPayment(cardPayload);
      } else {
        await confirmClaimPayment(cardPayload);
      }
      onSuccess(orderId);
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isProcessing) onClose();
  };

  const modalContent = (
    <div
      className="claim-payment-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-payment-title"
      onClick={handleOverlayClick}
      onKeyDown={(e) => e.key === 'Escape' && !isProcessing && onClose()}
    >
      <div className="claim-payment-modal">
        <header className="claim-payment-header">
          <h2 id="claim-payment-title">{title}</h2>
          <button
            type="button"
            className="claim-payment-close"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close"
          >
            &times;
          </button>
        </header>

        <div className="claim-payment-summary">
          <p className="claim-payment-item">{itemName}</p>
          {Array.isArray(summaryLines) && summaryLines.length > 0 ? (
            <div className="claim-payment-breakdown">
              {summaryLines.map((line) => (
                <div className="claim-payment-line" key={line.label}>
                  <span>{line.label}</span>
                  <span>{formatMoney(line.amount)}</span>
                </div>
              ))}
              <div className="claim-payment-line claim-payment-line--total">
                <span>Total</span>
                <span>{formatMoney(amount)}</span>
              </div>
            </div>
          ) : breakdown ? (
            <div className="claim-payment-breakdown">
              {breakdown.claimQuantity > 1 && breakdown.unitPriceAmount != null && (
                <div className="claim-payment-line">
                  <span>
                    {breakdown.claimQuantity} servings × {formatMoney(breakdown.unitPriceAmount)}
                  </span>
                  <span>{formatMoney(breakdown.foodSubtotal)}</span>
                </div>
              )}
              {(!breakdown.claimQuantity || breakdown.claimQuantity <= 1) && (
                <div className="claim-payment-line">
                  <span>Food subtotal</span>
                  <span>{formatMoney(breakdown.foodSubtotal)}</span>
                </div>
              )}
              <div className="claim-payment-line">
                <span>
                  Delivery ({Number(breakdown.deliveryDistanceKm || 0).toFixed(1)} km × LKR 100/km)
                </span>
                <span>{formatMoney(breakdown.deliveryFee)}</span>
              </div>
              {breakdown.deliveryDiscount > 0 && (
                <div className="claim-payment-line claim-payment-line--discount">
                  <span>Low-income delivery discount (20%)</span>
                  <span>- {formatMoney(breakdown.deliveryDiscount)}</span>
                </div>
              )}
              <div className="claim-payment-line claim-payment-line--total">
                <span>Total</span>
                <span>{formatMoney(breakdown.total ?? amount)}</span>
              </div>
            </div>
          ) : (
            <p className="claim-payment-amount">{formatMoney(amount)}</p>
          )}
          {discountStatus?.eligible && (
            <p className="claim-payment-discount-note">
              {discountStatus.remaining} of {discountStatus.monthlyLimit} discounted deliveries left
              this month
            </p>
          )}
          {note && <p className="claim-payment-discount-note">{note}</p>}
        </div>

        <form className="claim-payment-form" onSubmit={handleSubmit}>
          <label className="claim-payment-label">
            Card number
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              disabled={isProcessing}
            />
          </label>

          <div className="claim-payment-row">
            <label className="claim-payment-label">
              Expiry
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                disabled={isProcessing}
              />
            </label>
            <label className="claim-payment-label">
              CVV
              <input
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                maxLength={3}
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                disabled={isProcessing}
              />
            </label>
          </div>

          {showAutoRenewOption && (
            <label className="claim-payment-auto-renew">
              <input
                type="checkbox"
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
                disabled={isProcessing}
              />
              <span>Renew automatically every month</span>
            </label>
          )}

          {terms && <p className="claim-payment-terms">{terms}</p>}

          {error && (
            <p className="claim-payment-error" role="alert">
              {error}
            </p>
          )}

          <div className="claim-payment-actions">
            <button
              type="button"
              className="claim-payment-btn claim-payment-btn-secondary"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="claim-payment-btn claim-payment-btn-primary"
              disabled={!isFormValid() || isProcessing}
            >
              {isProcessing ? 'Processing…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
};

export default ClaimPaymentModal;
