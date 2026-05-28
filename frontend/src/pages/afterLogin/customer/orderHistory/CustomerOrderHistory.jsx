import { useEffect, useMemo, useState } from 'react';
import CustomerPageLayout from '../../../../components/afterLogin/dashboard/customerSection/layout/CustomerPageLayout';
import { getCustomerPaymentHistory } from '../../../../services/paymentApi';
import './CustomerOrderHistory.css';

const STATUS_FILTERS = ['all', 'paid', 'pending', 'failed', 'cancelled', 'consumed'];

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMoney = (amount, currency = 'LKR') => {
  const safe = Number(amount);
  if (Number.isNaN(safe)) return `${currency} 0.00`;
  return `${currency} ${safe.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

function CustomerOrderHistory() {
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchHistory = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await getCustomerPaymentHistory();
      setPayments(Array.isArray(res?.payments) ? res.payments : []);
    } catch (err) {
      setError(err.message || 'Failed to load order history.');
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredPayments = useMemo(() => {
    if (statusFilter === 'all') return payments;
    return payments.filter((p) => (p.status || '').toLowerCase() === statusFilter);
  }, [payments, statusFilter]);

  return (
    <CustomerPageLayout>
      <div className="customer-page order-history-page">
        <header className="customer-page-hero">
          <h1>Order & Payment History</h1>
          <p>Track all online customer checkout payments and their statuses</p>
        </header>

        <section className="customer-panel order-history-panel">
          <div className="order-history-toolbar">
            <h2>Recent transactions</h2>
            <div className="order-history-filters" role="tablist" aria-label="Payment status filters">
              {STATUS_FILTERS.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`history-filter-chip ${statusFilter === status ? 'active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {isLoading && <p className="order-history-state">Loading payment history...</p>}

          {!isLoading && error && (
            <div className="order-history-state order-history-state--error">
              <p>{error}</p>
              <button type="button" onClick={fetchHistory}>
                Retry
              </button>
            </div>
          )}

          {!isLoading && !error && filteredPayments.length === 0 && (
            <p className="order-history-state">No payment records found for this filter.</p>
          )}

          {!isLoading && !error && filteredPayments.length > 0 && (
            <div className="history-list">
              {filteredPayments.map((payment) => (
                <article key={payment.id} className="history-card">
                  <div className="history-card-header">
                    <div>
                      <h3>{payment.orderId}</h3>
                      <p>{formatDateTime(payment.createdAt)}</p>
                    </div>
                    <div className={`history-status history-status--${(payment.status || '').toLowerCase()}`}>
                      {(payment.status || 'unknown').toUpperCase()}
                    </div>
                  </div>

                  <div className="history-summary-grid">
                    <div>
                      <span className="label">Total</span>
                      <strong>{formatMoney(payment.amount, payment.currency)}</strong>
                    </div>
                    <div>
                      <span className="label">Method</span>
                      <strong>{payment.orderSummary?.paymentMethod || 'card'}</strong>
                    </div>
                    <div>
                      <span className="label">Card</span>
                      <strong>{payment.cardLast4 ? `**** ${payment.cardLast4}` : '—'}</strong>
                    </div>
                    <div>
                      <span className="label">Address</span>
                      <strong className="address">{payment.orderSummary?.address || '—'}</strong>
                    </div>
                  </div>

                  <div className="history-items">
                    <h4>Items</h4>
                    {(payment.orderSummary?.items || []).map((item, idx) => (
                      <div key={`${payment.id}-item-${idx}`} className="history-item-row">
                        <span>{item.name}</span>
                        <span>x{item.quantity}</span>
                        <span>{formatMoney(item.lineTotal, payment.currency)}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </CustomerPageLayout>
  );
}

export default CustomerOrderHistory;
