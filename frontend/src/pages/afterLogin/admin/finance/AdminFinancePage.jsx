import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminSideNavbar from '../../../../components/afterLogin/admin/navbar/AdminSideNavbar';
import {
  getAdminFinanceSummary,
  getAdminFinanceLedger,
  formatLkr,
  ledgerTypeLabel,
  contextLabel,
  financeHealthLabel,
} from '../../../../services/adminFinanceApi';
import './AdminFinancePage.css';
import '../shared/AdminPageTheme.css';

const PERIOD_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_30', label: 'Last 30 days' },
];

const LEDGER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'card_payment', label: 'Card inflows' },
  { value: 'commission', label: 'Commission' },
  { value: 'free_donation_subsidy', label: 'Subsidies' },
  { value: 'payout', label: 'Payouts' },
];

function getPeriodRange(period) {
  const now = new Date();
  if (period === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      from: start.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    };
  }
  if (period === 'last_30') {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return {
      from: start.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    };
  }
  return { from: undefined, to: undefined };
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function buildFinanceModel(summary) {
  const totalCollected = summary.cardInflows || 0;
  const commissionRevenue = summary.commissionRevenue || 0;
  const subscriptionRevenue = summary.subscriptionRevenue || 0;
  const platformGross =
    summary.platformGrossRevenue ?? roundCurrency(commissionRevenue + subscriptionRevenue);
  const platformSubsidies = summary.freeDonationSubsidies || 0;
  const platformNet = summary.netPlatformPosition || 0;
  const userPaidOut = summary.payoutOutflows || 0;
  const userPending = summary.pendingLiabilities || 0;
  const userPassThrough =
    summary.userShareFromMarketplace ??
    Math.max(0, (summary.marketplaceCardInflows || 0) - commissionRevenue);

  const splitTotal = Math.max(totalCollected, 1);
  const userSharePct = (userPassThrough / splitTotal) * 100;
  const commissionPct = (commissionRevenue / splitTotal) * 100;
  const subscriptionPct = (subscriptionRevenue / splitTotal) * 100;
  const platformSharePct = commissionPct + subscriptionPct;

  return {
    totalCollected,
    commissionRevenue,
    subscriptionRevenue,
    platformGross,
    platformSubsidies,
    platformNet,
    userPaidOut,
    userPending,
    userPassThrough,
    userSharePct,
    commissionPct,
    subscriptionPct,
    platformSharePct,
  };
}

function roundCurrency(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function AdminFinancePage() {
  const [period, setPeriod] = useState('all');
  const [ledgerTab, setLedgerTab] = useState('all');
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [error, setError] = useState('');

  const dateRange = useMemo(() => getPeriodRange(period), [period]);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setError('');
    try {
      const res = await getAdminFinanceSummary(dateRange);
      setSummary(res.summary || null);
      setTrend(res.trend || null);
    } catch (err) {
      setError(err.message || 'Failed to load finance summary.');
    } finally {
      setLoadingSummary(false);
    }
  }, [dateRange]);

  const loadLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      const res = await getAdminFinanceLedger({
        type: ledgerTab,
        ...dateRange,
        page,
        limit: 25,
      });
      setLedger(res.ledger || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load finance ledger.');
    } finally {
      setLoadingLedger(false);
    }
  }, [ledgerTab, dateRange, page]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  useEffect(() => {
    setPage(1);
  }, [period, ledgerTab]);

  const model = useMemo(
    () => (summary ? buildFinanceModel(summary) : null),
    [summary]
  );

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label || 'All time';

  return (
    <div className="admin-page-shell admin__finance__page">
      <AdminSideNavbar />
      <div className="admin-page-content">
        <div className="admin-finance-header">
          <div className="page-header">
            <h1>Platform Finance</h1>
            <p>How money flows through FoodLoop — collected, shared with users, and retained by the platform.</p>
          </div>
          <div className="admin-finance-header__actions">
            <label className="admin-finance-period">
              <span>Period</span>
              <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error && <p className="admin-error">{error}</p>}

        {loadingSummary && !summary && (
          <p className="admin-message">Loading platform finance...</p>
        )}

        {summary && model && (
          <>
            <div className={`admin-finance-status admin-finance-status--${summary.healthStatus}`}>
              <div className="admin-finance-status__main">
                <span className="admin-finance-status__label">{financeHealthLabel(summary.healthStatus)}</span>
                <p>
                  Platform net earnings for <strong>{periodLabel.toLowerCase()}</strong>:{' '}
                  <strong>{formatLkr(model.platformNet)}</strong>
                  {' '}(commission + subscriptions − subsidies)
                </p>
              </div>
              {trend && (
                <div className="admin-finance-status__trend">
                  <span>Commission vs last month</span>
                  <strong>
                    {trend.commissionTrend >= 0 ? '+' : ''}
                    {trend.commissionTrend}%
                  </strong>
                </div>
              )}
            </div>

            <section className="admin-finance-overview" aria-label="Money flow overview">
              <div className="admin-finance-overview__hero">
                <article className="admin-finance-tile admin-finance-tile--total">
                  <span className="admin-finance-tile__eyebrow">Total collected</span>
                  <strong className="admin-finance-tile__value">{formatLkr(model.totalCollected)}</strong>
                  <p>All card payments received through the platform account</p>
                </article>
                <article className="admin-finance-tile admin-finance-tile--users">
                  <span className="admin-finance-tile__eyebrow">Goes to users</span>
                  <strong className="admin-finance-tile__value">{formatLkr(model.userPassThrough)}</strong>
                  <p>Supplier &amp; driver share from marketplace orders only</p>
                </article>
                <article className="admin-finance-tile admin-finance-tile--platform">
                  <span className="admin-finance-tile__eyebrow">Platform keeps (net)</span>
                  <strong className="admin-finance-tile__value">{formatLkr(model.platformNet)}</strong>
                  <p>Commission + subscription fees, minus free-donation subsidies</p>
                </article>
              </div>

              <div className="admin-finance-split">
                <div className="admin-finance-split__labels">
                  <span>Users {model.userSharePct.toFixed(0)}%</span>
                  <span>Commission {model.commissionPct.toFixed(0)}%</span>
                  <span>Subscriptions {model.subscriptionPct.toFixed(0)}%</span>
                </div>
                <div className="admin-finance-split__track" role="img" aria-label="Split of collected funds">
                  <div
                    className="admin-finance-split__segment admin-finance-split__segment--users"
                    style={{ width: `${model.userSharePct}%` }}
                  />
                  <div
                    className="admin-finance-split__segment admin-finance-split__segment--commission"
                    style={{ width: `${model.commissionPct}%` }}
                  />
                  <div
                    className="admin-finance-split__segment admin-finance-split__segment--subscription"
                    style={{ width: `${model.subscriptionPct}%` }}
                  />
                </div>
                <p className="admin-finance-split__hint">
                  Of {formatLkr(model.totalCollected)} collected:{' '}
                  {formatLkr(model.userPassThrough)} goes to suppliers &amp; drivers from marketplace sales;{' '}
                  {formatLkr(model.commissionRevenue)} is marketplace commission;{' '}
                  {formatLkr(model.subscriptionRevenue)} is subscription revenue (AI, ESG &amp; Premium — 100% platform).
                </p>
              </div>
            </section>

            <section className="admin-finance-details" aria-label="Detailed breakdown">
              <article className="admin-finance-panel admin-finance-panel--platform">
                <header>
                  <h2>Platform (Admin)</h2>
                  <p>What FoodLoop earns and spends</p>
                </header>
                <ul className="admin-finance-panel__list">
                  <li>
                    <span>Marketplace commission</span>
                    <strong>{formatLkr(model.commissionRevenue)}</strong>
                    <small>20% cut on sell listings &amp; checkout orders</small>
                  </li>
                  <li>
                    <span>Subscription revenue</span>
                    <strong>{formatLkr(model.subscriptionRevenue)}</strong>
                    <small>Tomorrow AI, ESG &amp; CSR, and Premium bundle — kept by FoodLoop</small>
                  </li>
                  <li>
                    <span>Gross platform revenue</span>
                    <strong>{formatLkr(model.platformGross)}</strong>
                    <small>Commission + subscriptions before expenses</small>
                  </li>
                  <li>
                    <span>Free-donation subsidies</span>
                    <strong className="is-expense">− {formatLkr(model.platformSubsidies)}</strong>
                    <small>Delivery fees covered for platform-funded donations</small>
                  </li>
                  <li className="admin-finance-panel__total">
                    <span>Net platform earnings</span>
                    <strong>{formatLkr(model.platformNet)}</strong>
                  </li>
                </ul>
              </article>

              <article className="admin-finance-panel admin-finance-panel--users">
                <header>
                  <h2>Users (Suppliers &amp; Drivers)</h2>
                  <p>What participants earn and withdraw</p>
                </header>
                <ul className="admin-finance-panel__list">
                  <li>
                    <span>Share from marketplace sales</span>
                    <strong>{formatLkr(model.userPassThrough)}</strong>
                    <small>Marketplace card payments minus platform commission (excludes subscriptions)</small>
                  </li>
                  <li>
                    <span>Already paid out</span>
                    <strong>{formatLkr(model.userPaidOut)}</strong>
                    <small>Withdrawals marked as paid</small>
                  </li>
                  <li>
                    <span>Pending withdrawal</span>
                    <strong>{formatLkr(model.userPending)}</strong>
                    <small>Available balance not yet requested</small>
                  </li>
                </ul>
              </article>
            </section>

            <section className="admin-finance-month" aria-label="This month snapshot">
              <h2>This month</h2>
              <div className="admin-finance-month__grid">
                <div className="admin-finance-month__item">
                  <span>Card received</span>
                  <strong>{formatLkr(summary.thisMonthCard)}</strong>
                </div>
                <div className="admin-finance-month__item">
                  <span>Commission</span>
                  <strong>{formatLkr(summary.thisMonthCommission)}</strong>
                </div>
                <div className="admin-finance-month__item">
                  <span>Subscriptions</span>
                  <strong>{formatLkr(summary.thisMonthSubscription ?? 0)}</strong>
                </div>
                <div className="admin-finance-month__item">
                  <span>Subsidies</span>
                  <strong>{formatLkr(summary.thisMonthSubsidies)}</strong>
                </div>
              </div>
            </section>
          </>
        )}

        <section className="admin-finance-ledger">
          <div className="admin-finance-ledger__head">
            <div>
              <h2>Transaction ledger</h2>
              <p className="admin-finance-ledger__sub">Detailed record of every inflow and outflow</p>
            </div>
            <div className="admin-finance-tabs">
              {LEDGER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={`admin-finance-tab${ledgerTab === tab.value ? ' admin-finance-tab--active' : ''}`}
                  onClick={() => setLedgerTab(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loadingLedger ? (
            <p className="admin-message">Loading ledger...</p>
          ) : ledger.length === 0 ? (
            <p className="admin-message">No transactions in this period.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-finance-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Reference</th>
                    <th>Context</th>
                    <th>In</th>
                    <th>Out</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.date)}</td>
                      <td>
                        <span className={`admin-finance-badge admin-finance-badge--${row.type}`}>
                          {ledgerTypeLabel(row.type)}
                        </span>
                      </td>
                      <td>{row.referenceLabel || '—'}</td>
                      <td>{contextLabel(row.context)}</td>
                      <td className="admin-finance-in">
                        {row.direction === 'in' ? formatLkr(row.amount) : '—'}
                      </td>
                      <td className="admin-finance-out">
                        {row.direction === 'out' ? formatLkr(row.amount) : '—'}
                      </td>
                      <td>{row.status || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="admin-pagination">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
              </span>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminFinancePage;
