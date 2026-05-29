import React, { useCallback, useEffect, useState } from 'react';
import {
  getEarningsSummary,
  getEarningsTransactions,
  getPayoutRequests,
  createPayoutRequest,
  updatePayoutProfile,
  formatLkr,
  sourceTypeLabel,
  statusLabel,
  driverPaymentTypeLabel,
  getDriverBankPayout,
  getDriverCashCollected,
} from '../../../../services/earningsApi';
import { getCurrentUser } from '../../../../services/api';
import './EarningsPage.css';

function EarningsPage({ roleLabel = 'Account', variant = 'supplier' }) {
  const isDriver = variant === 'driver';
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [bankForm, setBankForm] = useState({
    bankAccountName: '',
    bankName: '',
    bankAccountNumber: '',
    bankBranch: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, txRes, payoutRes, meRes] = await Promise.all([
        getEarningsSummary(),
        getEarningsTransactions({ limit: 20, page: 1 }),
        getPayoutRequests(),
        getCurrentUser().catch(() => null),
      ]);
      setSummary(summaryRes.summary || null);
      setTransactions(txRes.transactions || []);
      setPayoutRequests(payoutRes.payoutRequests || []);
      const user = meRes?.user;
      if (user) {
        setBankForm({
          bankAccountName: user.payoutAccountName || '',
          bankName: user.payoutBankName || '',
          bankAccountNumber: user.payoutAccountNumber || '',
          bankBranch: user.payoutBranch || '',
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load earnings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hasOpenPayout = payoutRequests.some((p) => ['pending', 'approved'].includes(p.status));
  const minPayout = summary?.minPayoutAmount || 1000;
  const available = summary?.availableBalance || 0;

  const handleBankChange = (field) => (e) => {
    setBankForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSaveBankProfile = async () => {
    setFormError('');
    setSubmitting(true);
    try {
      await updatePayoutProfile({
        bankAccountName: bankForm.bankAccountName,
        bankName: bankForm.bankName,
        bankAccountNumber: bankForm.bankAccountNumber,
        bankBranch: bankForm.bankBranch,
      });
      await loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to save bank details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    setFormError('');
    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Enter a valid payout amount.');
      return;
    }
    if (parsedAmount < minPayout) {
      setFormError(`Minimum payout is ${formatLkr(minPayout)}.`);
      return;
    }
    if (parsedAmount > available) {
      setFormError('Amount exceeds available balance.');
      return;
    }
    setSubmitting(true);
    try {
      await createPayoutRequest({
        amount: parsedAmount,
        ...bankForm,
      });
      setAmount('');
      await loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to submit payout request.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-LK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMoneyOrDash = (value) => {
    if (value == null || Number(value) <= 0) return '—';
    return formatLkr(value);
  };

  return (
    <div className="earnings-page">
      <div className="earnings-page__header">
        <h1>Earnings</h1>
        <p>
          {isDriver
            ? `${roleLabel} — track delivery fees, COD collections, and bank payouts`
            : `${roleLabel} — track your income and request payouts`}
        </p>
      </div>

      {loading && <p className="earnings-page__message">Loading earnings...</p>}
      {error && <p className="earnings-page__error">{error}</p>}

      {!loading && summary && (
        <>
          {isDriver && (
            <section className="earnings-explainer">
              <h2>How you get paid</h2>
              <div className="earnings-explainer__grid">
                <div className="earnings-explainer__card earnings-explainer__card--card">
                  <h3>Card prepaid orders</h3>
                  <p>
                    The customer paid online. You receive <strong>only the delivery fee</strong> in
                    your bank payout balance. No cash to collect at the door.
                  </p>
                </div>
                <div className="earnings-explainer__card earnings-explainer__card--cod">
                  <h3>Cash on delivery (COD)</h3>
                  <p>
                    Collect the <strong>full order total in cash</strong> from the customer at the
                    door. FoodLoop separately credits your <strong>delivery fee</strong> to your
                    bank payout balance (same as card orders). COD cash is{' '}
                    <strong>not</strong> part of your withdrawable balance.
                  </p>
                </div>
                <div className="earnings-explainer__card earnings-explainer__card--donation">
                  <h3>Donation / receiver deliveries</h3>
                  <p>
                    Delivery fee is based on distance and vehicle. Paid via bank payout. Free
                    donations are funded by FoodLoop; sell listings may be receiver-funded.
                  </p>
                </div>
              </div>
            </section>
          )}

          <div className="earnings-summary-grid">
            <div className="earnings-card">
              <span>{isDriver ? 'Total delivery fees earned' : 'Total earned'}</span>
              <strong>{formatLkr(isDriver ? summary.totalDeliveryFeesEarned ?? summary.totalEarned : summary.totalEarned)}</strong>
            </div>
            <div className="earnings-card earnings-card--highlight">
              <span>Available balance (bank payout)</span>
              <strong>{formatLkr(summary.availableBalance)}</strong>
              {isDriver && (
                <small>Withdrawable delivery fees only — excludes COD cash</small>
              )}
            </div>
            {isDriver && (
              <div className="earnings-card earnings-card--cod-stat">
                <span>COD cash collected (this month)</span>
                <strong>{formatLkr(summary.thisMonthCodCashCollected || 0)}</strong>
                <small>Collected at door — not in bank balance</small>
              </div>
            )}
            <div className="earnings-card">
              <span>Pending payout</span>
              <strong>{formatLkr(summary.pendingPayout)}</strong>
            </div>
            <div className="earnings-card">
              <span>Paid out</span>
              <strong>{formatLkr(summary.paidOut)}</strong>
            </div>
            <div className="earnings-card">
              <span>This month</span>
              <strong>{formatLkr(summary.thisMonthEarned)}</strong>
              <small>{summary.earningsTrend >= 0 ? '+' : ''}{summary.earningsTrend}% vs last month</small>
            </div>
            {isDriver && (
              <div className="earnings-card">
                <span>COD cash collected (lifetime)</span>
                <strong>{formatLkr(summary.totalCodCashCollected || 0)}</strong>
                <small>Physical cash — not withdrawable</small>
              </div>
            )}
          </div>

          <div className="earnings-panels">
            <section className="earnings-panel">
              <h2>Request payout</h2>
              <p className="earnings-panel__hint">
                Minimum withdrawal: {formatLkr(minPayout)}. Available bank balance: {formatLkr(available)}.
                {isDriver && ' Only delivery fees can be withdrawn — not COD cash collected.'}
              </p>
              {hasOpenPayout && (
                <p className="earnings-page__warning">You already have an open payout request.</p>
              )}
              <form className="earnings-form" onSubmit={handleRequestPayout}>
                <label>
                  Amount (LKR)
                  <input
                    type="number"
                    min={minPayout}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={String(minPayout)}
                    disabled={submitting || hasOpenPayout || available < minPayout}
                  />
                </label>
                <label>
                  Account holder name
                  <input
                    type="text"
                    value={bankForm.bankAccountName}
                    onChange={handleBankChange('bankAccountName')}
                    required
                    disabled={submitting || hasOpenPayout}
                  />
                </label>
                <label>
                  Bank name
                  <input
                    type="text"
                    value={bankForm.bankName}
                    onChange={handleBankChange('bankName')}
                    required
                    disabled={submitting || hasOpenPayout}
                  />
                </label>
                <label>
                  Account number
                  <input
                    type="text"
                    value={bankForm.bankAccountNumber}
                    onChange={handleBankChange('bankAccountNumber')}
                    required
                    disabled={submitting || hasOpenPayout}
                  />
                </label>
                <label>
                  Branch (optional)
                  <input
                    type="text"
                    value={bankForm.bankBranch}
                    onChange={handleBankChange('bankBranch')}
                    disabled={submitting || hasOpenPayout}
                  />
                </label>
                {formError && <p className="earnings-page__error">{formError}</p>}
                <div className="earnings-form__actions">
                  <button
                    type="button"
                    className="earnings-btn earnings-btn--secondary"
                    onClick={handleSaveBankProfile}
                    disabled={submitting || hasOpenPayout}
                  >
                    Save bank details
                  </button>
                  <button
                    type="submit"
                    className="earnings-btn"
                    disabled={submitting || hasOpenPayout || available < minPayout}
                  >
                    {submitting ? 'Submitting...' : 'Request payout'}
                  </button>
                </div>
              </form>
            </section>

            <section className="earnings-panel">
              <h2>Payout history</h2>
              {payoutRequests.length === 0 ? (
                <p className="earnings-page__message">No payout requests yet.</p>
              ) : (
                <div className="earnings-table-wrap">
                  <table className="earnings-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutRequests.map((req) => (
                        <tr key={req.id}>
                          <td>{formatDate(req.createdAt)}</td>
                          <td>{formatLkr(req.amount)}</td>
                          <td><span className={`earnings-badge earnings-badge--${req.status}`}>{statusLabel(req.status)}</span></td>
                          <td>{req.adminNote || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <section className="earnings-panel earnings-panel--full">
            <h2>Recent transactions</h2>
            {transactions.length === 0 ? (
              <p className="earnings-page__message">No earnings yet. Complete deliveries to start earning.</p>
            ) : (
              <div className="earnings-table-wrap">
                <table className="earnings-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Order</th>
                      <th>Type</th>
                      {isDriver ? (
                        <>
                          <th>Payment</th>
                          <th>Cash collected</th>
                          <th>Bank payout</th>
                        </>
                      ) : (
                        <>
                          <th>Gross</th>
                          <th>Fee</th>
                          <th>Net</th>
                        </>
                      )}
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const cashCollected = getDriverCashCollected(tx);
                      const bankPayout = getDriverBankPayout(tx);
                      return (
                        <tr key={tx.id}>
                          <td>{formatDate(tx.creditedAt)}</td>
                          <td>
                            <div>{tx.referenceLabel || '—'}</div>
                            {isDriver && tx.paymentMethod === 'cod' && cashCollected != null && (
                              <small className="earnings-tx-note">
                                {formatLkr(cashCollected)} cash at door + {formatLkr(bankPayout)} bank payout
                              </small>
                            )}
                          </td>
                          <td>{sourceTypeLabel(tx.sourceType)}</td>
                          {isDriver ? (
                            <>
                              <td>
                                <span className={`earnings-pay-badge earnings-pay-badge--${tx.paymentMethod || (tx.sourceType === 'donation_delivery' ? 'platform' : 'none')}`}>
                                  {driverPaymentTypeLabel(tx)}
                                </span>
                              </td>
                              <td>{formatMoneyOrDash(cashCollected)}</td>
                              <td>{formatLkr(bankPayout)}</td>
                            </>
                          ) : (
                            <>
                              <td>{tx.grossAmount != null ? formatLkr(tx.grossAmount) : '—'}</td>
                              <td>{tx.platformFee != null ? formatLkr(tx.platformFee) : '—'}</td>
                              <td>{formatLkr(tx.amount)}</td>
                            </>
                          )}
                          <td><span className={`earnings-badge earnings-badge--${tx.status}`}>{statusLabel(tx.status)}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default EarningsPage;
