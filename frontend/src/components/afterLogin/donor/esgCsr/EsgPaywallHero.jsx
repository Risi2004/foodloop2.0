const SAMPLE_KPIS = [
  { label: 'Meals shared', value: '128' },
  { label: 'Food saved', value: '76 kg' },
  { label: 'CO₂ offset', value: '190 kg' },
  { label: 'People fed', value: '128' },
];

function EsgPaywallHero({ amountLkr, onSubscribe, loading }) {
  return (
    <div className="esg-paywall">
      <div className="esg-paywall__preview" aria-hidden="true">
        <div className="esg-paywall__preview-grid">
          {SAMPLE_KPIS.map((k) => (
            <div key={k.label} className="esg-paywall__preview-card">
              <span>{k.label}</span>
              <strong>{k.value}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="esg-paywall__cta">
        <h2>Unlock your ESG &amp; CSR dashboard</h2>
        <p>
          Premium impact reporting for stakeholders — environmental, social, and governance
          metrics from your FoodLoop activity, plus a printable PDF report.
        </p>
        <ul className="esg-paywall__features">
          <li>Real metrics from your listings and deliveries</li>
          <li>Period filters: month, quarter, all time</li>
          <li>AI executive summary for CSR committees</li>
          <li>Print / save as PDF for audits and reports</li>
        </ul>
        <button
          type="button"
          className="esg-btn esg-btn--primary esg-btn--lg"
          onClick={onSubscribe}
          disabled={loading}
        >
          {loading ? 'Starting checkout…' : `Subscribe — LKR ${amountLkr.toLocaleString('en-LK')} / month`}
        </button>
        <p className="esg-paywall__note">Separate from Tomorrow AI Insights. Cancel auto-renew anytime.</p>
      </div>
    </div>
  );
}

export default EsgPaywallHero;
