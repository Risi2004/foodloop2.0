import { useState } from 'react';
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

const ClaimPaymentModal = ({
  isOpen,
  onClose,
  checkout,
  onSuccess,
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !checkout) return null;

  const { orderId, amount, currency, itemName } = checkout;
  const currencyLabel = currency || 'LKR';

  const isFormValid = () => {
    const digits = cardNumber.replace(/\D/g, '');
    return digits.length >= 16 && expiry.length >= 5 && cvv.replace(/\D/g, '').length === 3;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid() || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await confirmClaimPayment({
        orderId,
        cardNumber: cardNumber.replace(/\D/g, ''),
        expiry,
        cvv,
        cardLast4: cardNumber.replace(/\D/g, '').slice(-4),
      });
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

  return (
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
          <h2 id="claim-payment-title">Pay for listing</h2>
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

        <div className="claim-payment-demo-badge">Demo payment — no real charge</div>

        <div className="claim-payment-summary">
          <p className="claim-payment-item">{itemName}</p>
          <p className="claim-payment-amount">
            {currencyLabel} {Number(amount).toLocaleString()}
          </p>
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
              {isProcessing ? 'Processing…' : 'Pay & continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClaimPaymentModal;
