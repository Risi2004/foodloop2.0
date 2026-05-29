import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getSupplierAiStatus,
  getTomorrowInsights,
  startSubscriptionCheckout,
  confirmSubscriptionPayment,
  cancelSubscriptionAutoRenew,
} from '../../../../../services/supplierAiInsightsApi';
import { getCurrentWeather } from '../../../../../services/weatherApi';
import { resolveWeatherLocation } from '../../../../../utils/weatherLocationResolver';
import ClaimPaymentModal from '../../../receiver/findFood/claimPayment/ClaimPaymentModal';
import './SupplierAiInsightsPanel.css';

function formatPeriodEnd(expiresAt) {
  if (!expiresAt) return '—';
  return new Date(expiresAt).toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function SupplierAiInsightsPanel({ draftCoords, foodCategory, itemName }) {
  const [status, setStatus] = useState(null);
  const [weatherStrip, setWeatherStrip] = useState(null);
  const [insightsResult, setInsightsResult] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [error, setError] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [cancellingRenew, setCancellingRenew] = useState(false);
  const [resultsExpanded, setResultsExpanded] = useState(true);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const s = await getSupplierAiStatus();
      setStatus(s);
    } catch (err) {
      setError(err.message || 'Could not load AI access status.');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const loadWeatherStrip = useCallback(async () => {
    try {
      let lat;
      let lng;
      if (draftCoords?.lat != null && draftCoords?.lng != null) {
        lat = draftCoords.lat;
        lng = draftCoords.lng;
      } else {
        const loc = await resolveWeatherLocation();
        lat = loc.lat;
        lng = loc.lng;
      }
      const res = await getCurrentWeather(lat, lng, 'metric', false);
      setWeatherStrip(res?.weather || null);
    } catch {
      setWeatherStrip(null);
    }
  }, [draftCoords?.lat, draftCoords?.lng]);

  useEffect(() => {
    loadStatus();
    loadWeatherStrip();
  }, [loadStatus, loadWeatherStrip]);

  const statusMeta = useMemo(() => {
    if (!status) return null;
    if (status.unlimited) {
      const isBundle = status.source === 'bundle' || status.bundleActive;
      return {
        variant: 'pro',
        label: isBundle ? 'Premium bundle' : 'Unlimited',
        detail: isBundle
          ? `Included until ${formatPeriodEnd(status.expiresAt)}`
          : `Active until ${formatPeriodEnd(status.expiresAt)}`,
      };
    }
    const remaining = status.remainingToday ?? 0;
    const limit = status.freeDailyLimit ?? 2;
    return {
      variant: 'free',
      label: `${remaining} of ${limit} free today`,
      detail: 'Upgrade for unlimited forecasts',
    };
  }, [status]);

  const handleRunForecast = async () => {
    setLoadingInsights(true);
    setError(null);
    try {
      const body = {
        foodCategory: foodCategory || undefined,
        itemName: itemName || undefined,
      };
      if (draftCoords?.lat != null && draftCoords?.lng != null) {
        body.lat = draftCoords.lat;
        body.lng = draftCoords.lng;
      }
      const res = await getTomorrowInsights(body);
      setInsightsResult(res);
      setResultsExpanded(true);
      if (res.status) setStatus(res.status);
    } catch (err) {
      setError(err.message || 'Failed to generate forecast.');
      setInsightsResult(null);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleUnlock = async () => {
    setLoadingCheckout(true);
    setError(null);
    try {
      const res = await startSubscriptionCheckout();
      if (res.alreadySubscribed) {
        if (res.status) setStatus(res.status);
        return;
      }
      setCheckout(res.checkout);
      setShowPayModal(true);
    } catch (err) {
      setError(err.message || 'Could not start checkout.');
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPayModal(false);
    setCheckout(null);
    await loadStatus();
  };

  const handleCancelAutoRenew = async () => {
    const until = formatPeriodEnd(status?.expiresAt);
    const confirmed = window.confirm(
      `Cancel AI subscription renewal?\n\n` +
        `• No refund for this month\n` +
        `• Unlimited AI access continues until ${until}\n` +
        `• You will not be charged again after this period`
    );
    if (!confirmed) return;

    setCancellingRenew(true);
    setError(null);
    try {
      const res = await cancelSubscriptionAutoRenew();
      if (res.status) setStatus(res.status);
      else await loadStatus();
      if (res.message) setError(null);
      alert(res.message || `Cancelled. Access continues until ${until}. No refund.`);
    } catch (err) {
      setError(err.message || 'Could not cancel subscription.');
    } finally {
      setCancellingRenew(false);
    }
  };

  const showPaywall =
    status && !status.unlimited && status.remainingToday === 0 && !loadingInsights;

  const insights = insightsResult?.insights;
  const subscriptionLkr = (status?.subscriptionAmountLkr ?? 5000).toLocaleString('en-LK');

  return (
    <section className="supplier-ai-panel" aria-labelledby="supplier-ai-title">
      <header className="supplier-ai-panel__header">
        <div className="supplier-ai-panel__intro">
          <span className="supplier-ai-panel__icon" aria-hidden="true">
            ✦
          </span>
          <div>
            <h2 id="supplier-ai-title" className="supplier-ai-panel__title">
              Tomorrow AI Insights
            </h2>
            <p className="supplier-ai-panel__subtitle">
              Weather-aware ideas for what to prepare and list tomorrow.
            </p>
          </div>
        </div>
        {!loadingStatus && statusMeta && (
          <div
            className={`supplier-ai-panel__status supplier-ai-panel__status--${statusMeta.variant}`}
          >
            <span className="supplier-ai-panel__status-label">{statusMeta.label}</span>
            <span className="supplier-ai-panel__status-detail">{statusMeta.detail}</span>
          </div>
        )}
      </header>

      <div className="supplier-ai-panel__body">
        {weatherStrip?.current && (
          <div className="supplier-ai-panel__weather" role="status">
            {weatherStrip.current.icon ? (
              <img
                className="supplier-ai-panel__weather-icon"
                src={weatherStrip.current.icon}
                alt=""
              />
            ) : (
              <span className="supplier-ai-panel__weather-icon supplier-ai-panel__weather-icon--fallback">
                °
              </span>
            )}
            <div className="supplier-ai-panel__weather-main">
              <span className="supplier-ai-panel__weather-temp">
                {Math.round(weatherStrip.current.temperature)}°C
              </span>
              <span className="supplier-ai-panel__weather-desc">
                {weatherStrip.current.description || weatherStrip.current.condition}
              </span>
            </div>
            {weatherStrip.location?.name && (
              <span className="supplier-ai-panel__weather-location">
                {weatherStrip.location.name}
              </span>
            )}
          </div>
        )}

        <div className="supplier-ai-panel__toolbar">
          <button
            type="button"
            className="supplier-ai-panel__btn supplier-ai-panel__btn--primary"
            onClick={handleRunForecast}
            disabled={loadingInsights || loadingStatus || showPaywall}
          >
            {loadingInsights ? 'Generating…' : "Get tomorrow's forecast"}
          </button>
          {showPaywall && !status?.bundleActive && (
            <button
              type="button"
              className="supplier-ai-panel__btn supplier-ai-panel__btn--outline"
              onClick={handleUnlock}
              disabled={loadingCheckout}
            >
              {loadingCheckout ? 'Please wait…' : `Subscribe · LKR ${subscriptionLkr}/mo`}
            </button>
          )}
        </div>

        {status?.unlimited && status?.source === 'bundle' && (
          <p className="supplier-ai-panel__bundle-note">
            Included in your Premium bundle. Manage renewal on your{' '}
            <a href="/supplier/dashboard">supplier home</a>.
          </p>
        )}

        {status?.unlimited && status?.source === 'ai' && (
          <div className="supplier-ai-panel__subscription">
            <p className="supplier-ai-panel__subscription-text">
              <strong>
                {status.autoRenew ? 'Renews monthly' : 'Active until period end'}
              </strong>
              <span>
                LKR {subscriptionLkr} / month · cancel anytime — no refund; access stays until{' '}
                {formatPeriodEnd(status.expiresAt)}
              </span>
            </p>
            <button
              type="button"
              className="supplier-ai-panel__subscription-cancel"
              onClick={handleCancelAutoRenew}
              disabled={cancellingRenew}
            >
              {cancellingRenew ? 'Cancelling…' : 'Cancel subscription'}
            </button>
          </div>
        )}

        {error && (
          <div className="supplier-ai-panel__error" role="alert">
            <p>{error}</p>
            {showPaywall && !status?.bundleActive && !loadingCheckout && (
              <button
                type="button"
                className="supplier-ai-panel__btn supplier-ai-panel__btn--outline"
                onClick={handleUnlock}
              >
                Subscribe for unlimited
              </button>
            )}
          </div>
        )}

        {insights && (
          <div
            className={`supplier-ai-panel__results ${
              resultsExpanded ? 'supplier-ai-panel__results--open' : 'supplier-ai-panel__results--closed'
            }`}
          >
            <div className="supplier-ai-panel__results-bar">
              <h3 className="supplier-ai-panel__results-heading">Forecast results</h3>
              <button
                type="button"
                className="supplier-ai-panel__results-toggle"
                onClick={() => setResultsExpanded((v) => !v)}
                aria-expanded={resultsExpanded}
                aria-controls="supplier-ai-forecast-content"
              >
                {resultsExpanded ? 'Hide' : 'Show'}
              </button>
            </div>

            {!resultsExpanded && (
              <p className="supplier-ai-panel__results-preview">
                {insights.tomorrowWeatherSummary
                  ? insights.tomorrowWeatherSummary.slice(0, 120) +
                    (insights.tomorrowWeatherSummary.length > 120 ? '…' : '')
                  : 'Your forecast is ready.'}
              </p>
            )}

            <div
              id="supplier-ai-forecast-content"
              className="supplier-ai-panel__results-content"
              hidden={!resultsExpanded}
            >
            <article className="supplier-ai-panel__result-block">
              <h4>Tomorrow&apos;s weather</h4>
              <p>{insights.tomorrowWeatherSummary || 'No weather summary available.'}</p>
            </article>
            {insights.weatherTips && (
              <article className="supplier-ai-panel__result-block">
                <h4>Weather tips</h4>
                <p>{insights.weatherTips}</p>
              </article>
            )}
            {insights.recommendedProducts?.length > 0 && (
              <article className="supplier-ai-panel__result-block">
                <h4>Recommended products</h4>
                <ul className="supplier-ai-panel__products">
                  {insights.recommendedProducts.map((p) => (
                    <li key={`${p.name}-${p.category}`}>
                      <span className="supplier-ai-panel__product-name">{p.name}</span>
                      {p.category ? ` · ${p.category}` : ''}
                      {p.suggestedQuantity ? ` · ${p.suggestedQuantity}` : ''}
                      {p.reason ? (
                        <span className="supplier-ai-panel__product-reason"> — {p.reason}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </article>
            )}
            {insights.bulkSellAdvice && (
              <article className="supplier-ai-panel__result-block">
                <h4>Bulk sell advice</h4>
                <p>{insights.bulkSellAdvice}</p>
              </article>
            )}
            {insights.confidence && (
              <span className="supplier-ai-panel__confidence">
                Confidence: {insights.confidence}
              </span>
            )}
            </div>
          </div>
        )}
      </div>

      <ClaimPaymentModal
        isOpen={showPayModal}
        onClose={() => !loadingCheckout && setShowPayModal(false)}
        checkout={
          checkout
            ? {
                ...checkout,
                itemName:
                  checkout.itemName || 'Supplier Tomorrow AI — unlimited this month',
                summaryLines: [
                  {
                    label: 'Unlimited AI forecasts (1 month)',
                    amount: checkout.amount,
                  },
                ],
              }
            : null
        }
        confirmPayment={confirmSubscriptionPayment}
        showAutoRenewOption
        submitLabel="Pay & unlock"
        onSuccess={handlePaymentSuccess}
      />
    </section>
  );
}

export default SupplierAiInsightsPanel;
