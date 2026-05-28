import { useState } from 'react';
import { createPortal } from 'react-dom';
import { confirmCustomerPayment } from '../../../../services/paymentApi';
import './CustomerPaymentModal.css';

const formatCardNumber = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

function CustomerPaymentModal({ isOpen, onClose, checkout, onSuccess }) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !checkout) return null;

  const { orderId, amount, currency } = checkout;

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
      await confirmCustomerPayment({
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

  const modalContent = (
    <div
      className="customer-payment-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-payment-title"
      onClick={handleOverlayClick}
      onKeyDown={(e) => e.key === 'Escape' && !isProcessing && onClose()}
    >
      <div className="customer-payment-modal">
        <header className="customer-payment-header">
          <h2 id="customer-payment-title">Complete payment</h2>
          <button
            type="button"
            className="customer-payment-close"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close"
          >
            &times;
          </button>
        </header>

        <div className="customer-payment-demo-badge">Demo payment — no real charge</div>
        <div className="customer-payment-summary">
          <p className="customer-payment-amount">
            {(currency || 'LKR')} {Number(amount || 0).toLocaleString()}
          </p>
        </div>

        <form className="customer-payment-form" onSubmit={handleSubmit}>
          <label className="customer-payment-label">
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

          <div className="customer-payment-row">
            <label className="customer-payment-label">
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
            <label className="customer-payment-label">
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
            <p className="customer-payment-error" role="alert">
              {error}
            </p>
          )}

          <div className="customer-payment-actions">
            <button
              type="button"
              className="customer-payment-btn customer-payment-btn-secondary"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="customer-payment-btn customer-payment-btn-primary"
              disabled={!isFormValid() || isProcessing}
            >
              {isProcessing ? 'Processing…' : 'Pay now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
}

export default CustomerPaymentModal;
