import { useState } from 'react';
import EsgReportPrintView from './EsgReportPrintView';

const PERIODS = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_30', label: 'Last 30 days' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'all_time', label: 'All time' },
];

function KpiCard({ label, value, sub }) {
  return (
    <article className="esg-kpi">
      <span className="esg-kpi__label">{label}</span>
      <strong className="esg-kpi__value">{value}</strong>
      {sub && <span className="esg-kpi__sub">{sub}</span>}
    </article>
  );
}

function EsgDashboard({
  report,
  status,
  period,
  onPeriodChange,
  onRefresh,
  loading,
  onPrint,
  onDownload,
  downloading,
  onCancelAutoRenew,
  cancellingRenew,
}) {
  const [activePillar, setActivePillar] = useState('environmental');
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  if (!report) return null;

  const e = report.environmental;
  const s = report.social;
  const g = report.governance;
  const maxCat = Math.max(...(s.topCategories?.map((c) => c.quantity) || [1]), 1);

  return (
    <>
      <div className="esg-dashboard no-print">
        <div className="esg-dashboard__toolbar">
          <div className="esg-dashboard__period">
            <label htmlFor="esg-period">Period</label>
            <select
              id="esg-period"
              value={period}
              onChange={(ev) => onPeriodChange(ev.target.value)}
              disabled={loading}
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="esg-dashboard__actions">
            <button type="button" className="esg-btn esg-btn--outline" onClick={onRefresh} disabled={loading}>
              {loading ? 'Updating…' : 'Refresh'}
            </button>
            <button
              type="button"
              className="esg-btn esg-btn--primary"
              onClick={onDownload}
              disabled={loading || downloading}
            >
              {downloading ? 'Preparing PDF…' : 'Download report'}
            </button>
            <button type="button" className="esg-btn esg-btn--outline" onClick={onPrint}>
              Print
            </button>
          </div>
        </div>

        {(status?.source === 'bundle' || status?.bundleActive) && (
          <div className="esg-dashboard__renew esg-dashboard__renew--bundle">
            <span>Included in your Premium bundle on the supplier home page.</span>
          </div>
        )}

        {status?.source === 'esg' && (
          <div className="esg-dashboard__renew">
            <span>
              {status.autoRenew
                ? `Renews monthly · LKR ${(status.subscriptionAmountLkr ?? 5000).toLocaleString('en-LK')}/mo`
                : `Active until ${status.expiresAt ? new Date(status.expiresAt).toLocaleDateString('en-LK') : 'period end'} · no further charges`}
              {' · '}
              No refund if you cancel; access stays for the paid month.
            </span>
            <button
              type="button"
              className="esg-btn esg-btn--ghost"
              onClick={onCancelAutoRenew}
              disabled={cancellingRenew}
            >
              {cancellingRenew ? 'Cancelling…' : 'Cancel subscription'}
            </button>
          </div>
        )}

        <div className="esg-kpi-grid">
          <KpiCard label="Meals shared" value={e.mealsShared} />
          <KpiCard label="Food saved" value={`${e.foodSavedKg} kg`} />
          <KpiCard label="CO₂ offset" value={`${e.co2OffsetKg} kg`} />
          <KpiCard label="People fed" value={s.peopleFed} />
          <KpiCard label="Receivers reached" value={s.uniqueReceivers} />
          <KpiCard label="Fulfillment" value={g.fulfillmentRate != null ? `${g.fulfillmentRate}%` : '—'} />
        </div>

        {report.summary?.executiveSummary && (
          <section className="esg-card esg-card--highlight">
            <h2>Executive summary</h2>
            <p>{report.summary.executiveSummary}</p>
          </section>
        )}

        <div className="esg-pillar-tabs">
          {[
            ['environmental', 'Environmental'],
            ['social', 'Social'],
            ['governance', 'Governance'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`esg-pillar-tab ${activePillar === key ? 'esg-pillar-tab--active' : ''}`}
              onClick={() => setActivePillar(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {activePillar === 'environmental' && (
          <section className="esg-card">
            <h3>Environmental impact</h3>
            <p className="esg-card__lead">{report.summary?.executiveSummary?.slice(0, 120)}…</p>
            <ul className="esg-metric-list">
              <li>Waste diverted: <strong>{e.wasteDivertedKg} kg</strong></li>
              <li>Estimated CO₂ avoided: <strong>{e.co2OffsetKg} kg</strong></li>
            </ul>
          </section>
        )}

        {activePillar === 'social' && (
          <section className="esg-card">
            <h3>Social impact</h3>
            <p>
              Donated <strong>{s.donateQuantity}</strong> portions · Sold{' '}
              <strong>{s.sellQuantity}</strong> · <strong>{s.listingsPublished}</strong> listings
              in period.
            </p>
            {s.topCategories?.length > 0 && (
              <div className="esg-bars">
                {s.topCategories.map((c) => (
                  <div key={c.category} className="esg-bar-row">
                    <span>{c.category}</span>
                    <div className="esg-bar-track">
                      <div
                        className="esg-bar-fill"
                        style={{ width: `${Math.round((c.quantity / maxCat) * 100)}%` }}
                      />
                    </div>
                    <span className="esg-bar-val">{c.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activePillar === 'governance' && (
          <section className="esg-card">
            <h3>Governance</h3>
            <ul className="esg-metric-list">
              <li>Deliveries completed: <strong>{g.deliveriesCompleted}</strong></li>
              <li>Status: <strong>{g.foodLoopCompliance}</strong></li>
            </ul>
          </section>
        )}

        {report.summary?.recommendations?.length > 0 && (
          <section className="esg-card">
            <h3>Recommendations</h3>
            <ol className="esg-recommendations">
              {report.summary.recommendations.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
          </section>
        )}

        <section className="esg-card esg-card--methodology">
          <button
            type="button"
            className="esg-methodology-toggle"
            onClick={() => setMethodologyOpen((v) => !v)}
            aria-expanded={methodologyOpen}
          >
            Methodology &amp; disclaimers {methodologyOpen ? '▲' : '▼'}
          </button>
          {methodologyOpen && (
            <div className="esg-methodology-body">
              <p>{report.methodology?.note}</p>
              <p>
                Conversion: {report.methodology?.foodKgPerMeal} kg per meal; CO₂ factor{' '}
                {report.methodology?.co2KgPerFoodKg} kg per kg food saved.
              </p>
            </div>
          )}
        </section>
      </div>

      <div className="esg-print-only">
        <EsgReportPrintView report={report} />
      </div>
    </>
  );
}

export default EsgDashboard;
