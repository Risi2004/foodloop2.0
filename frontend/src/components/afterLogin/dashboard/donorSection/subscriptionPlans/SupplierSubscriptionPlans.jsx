import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ClaimPaymentModal from '../../../receiver/findFood/claimPayment/ClaimPaymentModal';
import {
  getBundleStatus,
  startBundleSubscriptionCheckout,
  confirmBundleSubscriptionPayment,
  cancelBundleAutoRenew,
} from '../../../../../services/supplierBundleApi';
import { supplierRoutes } from '../../../../../constants/supplierRoutes';
import { dispatchSupplierBundleUpdated } from '../../../../../utils/supplierPremiumEvents';
import './SupplierSubscriptionPlans.css';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function SupplierSubscriptionPlans() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancellingRenew, setCancellingRenew] = useState(false);
  const [cancelMessage, setCancelMessage] = useState(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await getBundleStatus();
      setStatus(s);
    } catch (err) {
      setError(err.message || 'Could not load plan status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const amountLkr = status?.subscriptionAmountLkr ?? 8000;
  const bundleActive = status?.active;

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await startBundleSubscriptionCheckout();
      if (res.alreadySubscribed) {
        if (res.status) setStatus(res.status);
        return;
      }
      setCheckout(res.checkout);
      setShowPayModal(true);
    } catch (err) {
      setError(err.message || 'Checkout failed.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPayModal(false);
    setCheckout(null);
    await loadStatus();
    dispatchSupplierBundleUpdated();
  };

  const handleCancelSubscription = async () => {
    const until = formatDate(status?.expiresAt);
    const confirmed = window.confirm(
      `Cancel your Premium subscription?\n\n` +
        `• No refund for this month (payment already made)\n` +
        `• You keep full Premium access until ${until}\n` +
        `• You will not be charged again after this period`
    );
    if (!confirmed) return;

    setCancellingRenew(true);
    setError(null);
    setCancelMessage(null);
    try {
      const res = await cancelBundleAutoRenew();
      if (res.status) setStatus(res.status);
      setCancelMessage(
        res.message ||
          `Cancelled. No refund. Premium access continues until ${until}.`
      );
      dispatchSupplierBundleUpdated();
    } catch (err) {
      setError(err.message || 'Could not cancel subscription.');
    } finally {
      setCancellingRenew(false);
    }
  };

  return (
    <section className="supplier-plans" id="supplier-plans" aria-labelledby="supplier-plans-title">
      <div className="supplier-plans__heading">
        <h2 id="supplier-plans-title">Grow with FoodLoop</h2>
        <p>
          Choose a plan for your listings — unlock AI forecasting and ESG reporting in one
          subscription.
        </p>
      </div>

      <div className="supplier-plans__cards">
        <article className="supplier-plans__card">
          {!bundleActive && (
            <span className="supplier-plans__badge supplier-plans__badge--current">Current plan</span>
          )}
          <h3>Free plan</h3>
          <p className="supplier-plans__price">
            LKR 0 <span>/ month</span>
          </p>
          <ul className="supplier-plans__features">
            <li>2 AI tomorrow forecasts per day on My Listings</li>
            <li>Standard food listings &amp; status tiers</li>
            <li>ESG &amp; CSR dashboard preview (subscribe to unlock)</li>
          </ul>
        </article>

        <article className="supplier-plans__card supplier-plans__card--premium">
          {bundleActive && (
            <span className="supplier-plans__badge supplier-plans__badge--active">Active</span>
          )}
          <h3>Premium bundle</h3>
          <p className="supplier-plans__price">
            LKR {amountLkr.toLocaleString('en-LK')} <span>/ month</span>
          </p>
          <ul className="supplier-plans__features">
            <li>Unlimited tomorrow AI insights on food listings</li>
            <li>Full ESG &amp; CSR impact dashboard</li>
            <li>Downloadable CSR report (PDF)</li>
            <li>No separate LKR 5,000 AI or ESG fees</li>
          </ul>

          <div className="supplier-plans__actions">
            {bundleActive ? (
              <>
                <p className="supplier-plans__active-note">
                  Active until {formatDate(status.expiresAt)}
                  {status.autoRenew ? ' · Renews monthly' : ' · Will not renew'}
                </p>
                <p className="supplier-plans__refund-note">
                  Payments are non-refundable. Cancelling stops future charges only; access
                  stays active for the full month you paid for.
                </p>
                <div className="supplier-plans__links">
                  <Link to={supplierRoutes.myDonation()}>AI insights</Link>
                  <Link to={supplierRoutes.esgCsr()}>ESG &amp; CSR</Link>
                </div>
                <button
                  type="button"
                  className="supplier-plans__btn supplier-plans__btn--cancel"
                  onClick={handleCancelSubscription}
                  disabled={cancellingRenew}
                >
                  {cancellingRenew ? 'Cancelling…' : 'Cancel subscription'}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="supplier-plans__btn supplier-plans__btn--primary"
                onClick={handleSubscribe}
                disabled={loading || checkoutLoading}
              >
                {checkoutLoading ? 'Starting checkout…' : 'Subscribe'}
              </button>
            )}
          </div>
        </article>
      </div>

      {cancelMessage && (
        <p className="supplier-plans__success" role="status">
          {cancelMessage}
        </p>
      )}

      {error && (
        <p className="supplier-plans__error" role="alert">
          {error}
        </p>
      )}

      <ClaimPaymentModal
        isOpen={showPayModal}
        onClose={() => !checkoutLoading && setShowPayModal(false)}
        checkout={
          checkout
            ? {
                ...checkout,
                itemName: checkout.itemName || 'Supplier Premium bundle',
                summaryLines: [
                  {
                    label: 'Premium bundle (1 month)',
                    amount: checkout.amount,
                  },
                ],
              }
            : null
        }
        confirmPayment={confirmBundleSubscriptionPayment}
        showAutoRenewOption
        submitLabel="Pay & activate"
        title="Premium bundle"
        subscriptionTerms="One month of access. Non-refundable. You may cancel renewal anytime; access continues until the paid month ends."
        onSuccess={handlePaymentSuccess}
      />
    </section>
  );
}

export default SupplierSubscriptionPlans;
