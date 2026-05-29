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

  const plMax = useMemo(() => {
    if (!summary) return 1;
    return Math.max(
      summary.commissionRevenue || 0,
      summary.totalExpenses || 0,
      summary.netPlatformPosition || 0,
      1
    );
  }, [summary]);

  const commissionPct = summary ? ((summary.commissionRevenue || 0) / plMax) * 100 : 0;
  const expensePct = summary ? ((summary.totalExpenses || 0) / plMax) * 100 : 0;

  return (
    <div className="admin-page-shell admin__finance__page">
      <AdminSideNavbar />
      <div className="admin-page-content">
        <div className="page-header">
          <h1>Platform Finance</h1>
          <p>
            Track FoodLoop commission, card account inflows, free-donation driver subsidies, and payout outflows.
          </p>
        </div>

        <div className="admin-filters admin-finance-filters">
          <label>
            Period
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="admin-error">{error}</p>}

        {loadingSummary && !summary && (
          <p className="admin-message">Loading platform finance...</p>
        )}

        {summary && (
          <>
            <div
              className={`admin-finance-health admin-finance-health--${summary.healthStatus}`}
            >
              <div>
                <strong>{financeHealthLabel(summary.healthStatus)}</strong>
                <p>
                  Net platform position: {formatLkr(summary.netPlatformPosition)}
                  {' '}
                  (commission minus free-donation subsidies)
                </p>
              </div>
              {trend && (
                <span className="admin-finance-health__trend">
                  Commission trend: {trend.commissionTrend >= 0 ? '+' : ''}
                  {trend.commissionTrend}% vs last month
                </span>
              )}
            </div>

            <section className="admin-finance-kpis" aria-label="Financial overview">
              <article className="admin-finance-kpi">
                <span>Platform commission</span>
                <strong>{formatLkr(summary.commissionRevenue)}</strong>
                <small>FoodLoop&apos;s 20% cut on sell listings (retained)</small>
              </article>
              <article className="admin-finance-kpi">
                <span>Card account (gross)</span>
                <strong>{formatLkr(summary.cardInflows)}</strong>
                <small>All card payments received (includes pass-through to suppliers &amp; drivers)</small>
              </article>
              <article className="admin-finance-kpi admin-finance-kpi--expense">
                <span>Free donation subsidies</span>
                <strong>{formatLkr(summary.freeDonationSubsidies)}</strong>
                <small>Delivery fees paid to drivers for platform-funded donations</small>
              </article>
              <article className="admin-finance-kpi admin-finance-kpi--expense">
                <span>Payouts sent</span>
                <strong>{formatLkr(summary.payoutOutflows)}</strong>
                <small>Withdrawals marked paid to suppliers and drivers</small>
              </article>
            </section>

            <section className="admin-finance-secondary" aria-label="Secondary metrics">
              <div className="admin-finance-chip">
                <span>Pending liabilities</span>
                <strong>{formatLkr(summary.pendingLiabilities)}</strong>
              </div>
              <div className="admin-finance-chip">
                <span>Commission this month</span>
                <strong>{formatLkr(summary.thisMonthCommission)}</strong>
              </div>
              <div className="admin-finance-chip">
                <span>Card received this month</span>
                <strong>{formatLkr(summary.thisMonthCard)}</strong>
              </div>
            </section>

            <section className="admin-finance-pl">
              <h2>P&amp;L breakdown</h2>
              <div className="admin-finance-pl-row">
                <span>Revenue (commission)</span>
                <div className="admin-finance-pl-bar-track">
                  <div
                    className="admin-finance-pl-bar admin-finance-pl-bar--revenue"
                    style={{ width: `${commissionPct}%` }}
                  />
                </div>
                <strong>{formatLkr(summary.commissionRevenue)}</strong>
              </div>
              <div className="admin-finance-pl-row">
                <span>Expenses (subsidies + payouts)</span>
                <div className="admin-finance-pl-bar-track">
                  <div
                    className="admin-finance-pl-bar admin-finance-pl-bar--expense"
                    style={{ width: `${expensePct}%` }}
                  />
                </div>
                <strong>{formatLkr(summary.totalExpenses)}</strong>
              </div>
              <div className="admin-finance-pl-net">
                Net position (commission − subsidies):{' '}
                <strong>{formatLkr(summary.netPlatformPosition)}</strong>
              </div>
            </section>
          </>
        )}

        <section className="admin-finance-ledger">
          <div className="admin-finance-ledger__head">
            <h2>Financial ledger</h2>
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
