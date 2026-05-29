import { useCallback, useEffect, useState } from 'react';
import AdminSideNavbar from '../../../../components/afterLogin/admin/navbar/AdminSideNavbar';
import OrderDetailPanel from '../../../../components/afterLogin/admin/orders/OrderDetailPanel';
import {
  getAdminOrders,
  orderTypeLabel,
  formatOrderAmount,
  formatOrderDate,
  partiesSummary,
} from '../../../../services/adminOrdersApi';
import './AdminOrdersPage.css';
import '../shared/AdminPageTheme.css';

function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminOrders({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: 25,
      });
      setOrders(res.orders || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search, dateFrom, dateTo, page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadOrders();
  };

  return (
    <div className="admin-page-shell admin__orders__page">
      <AdminSideNavbar />
      <div className="admin-page-content">
        <div className="page-header">
          <h1>All Orders</h1>
          <p>Monitor donations, claim payments, and customer marketplace orders across the platform.</p>
        </div>

        <form className="admin-filters" onSubmit={handleSearchSubmit}>
          <label>
            Search
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order ID, tracking ID, item, email..."
            />
          </label>
          <label>
            Type
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="">All types</option>
              <option value="donation">Donation</option>
              <option value="claim_payment">Claim payment</option>
              <option value="customer_order">Customer order</option>
            </select>
          </label>
          <label>
            Status
            <input
              type="text"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              placeholder="e.g. delivered, paid"
            />
          </label>
          <label>
            From
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
          </label>
          <label>
            To
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
          </label>
          <button type="submit" className="admin-btn">Apply</button>
        </form>

        {loading && <p className="admin-message">Loading...</p>}
        {error && <p className="admin-error">{error}</p>}

        {!loading && orders.length === 0 && !error && <p className="admin-message">No orders found.</p>}

        {!loading && orders.length > 0 && (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Parties</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={`${order.orderType}-${order.id}`}>
                      <td>{order.referenceId}</td>
                      <td>
                        <span className={`admin-orders-badge admin-orders-badge--${order.orderType}`}>
                          {orderTypeLabel(order.orderType)}
                        </span>
                      </td>
                      <td>{order.title}</td>
                      <td className="admin-orders-parties">{partiesSummary(order.parties)}</td>
                      <td>{formatOrderAmount(order.amount, order.currency)}</td>
                      <td>{order.status}</td>
                      <td>{formatOrderDate(order.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary"
                          onClick={() => setSelectedOrder({ orderType: order.orderType, id: order.id })}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailPanel
          orderType={selectedOrder.orderType}
          orderId={selectedOrder.id}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}

export default AdminOrdersPage;
