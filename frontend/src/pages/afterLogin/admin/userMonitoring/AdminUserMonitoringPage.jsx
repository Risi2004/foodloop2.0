import { useCallback, useEffect, useState } from 'react';
import AdminSideNavbar from '../../../../components/afterLogin/admin/navbar/AdminSideNavbar';
import OrderDetailPanel from '../../../../components/afterLogin/admin/orders/OrderDetailPanel';
import {
  getUserMonitoring,
  getAdminUserOrders,
  orderTypeLabel,
  formatOrderAmount,
  formatOrderDate,
  partiesSummary,
} from '../../../../services/adminOrdersApi';
import './AdminUserMonitoringPage.css';
import '../shared/AdminPageTheme.css';

function AdminUserMonitoringPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [userOrders, setUserOrders] = useState([]);
  const [ordersPagination, setOrdersPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setError('');
    try {
      const res = await getUserMonitoring({
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setUsers(res.users || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoadingUsers(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  const loadUserOrders = useCallback(async (userId) => {
    if (!userId) return;
    setLoadingOrders(true);
    try {
      const res = await getAdminUserOrders(userId, { page: ordersPage, limit: 25 });
      setUserOrders(res.orders || []);
      setOrdersPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load user orders.');
    } finally {
      setLoadingOrders(false);
    }
  }, [ordersPage]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (selectedUser?.id) {
      loadUserOrders(selectedUser.id);
    }
  }, [selectedUser, loadUserOrders]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setOrdersPage(1);
    setSelectedOrder(null);
  };

  return (
    <div className="admin-page-shell admin__user__monitoring__page">
      <AdminSideNavbar />
      <div className="admin-page-content">
        <div className="page-header">
          <h1>User Monitoring</h1>
          <p>Browse users and inspect their donations, claims, payments, and customer orders.</p>
        </div>

        <div className="admin-user-monitoring-layout">
          <aside className="admin-user-monitoring-sidebar">
            <div className="admin-user-monitoring-filters">
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name or email..."
              />
              <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
                <option value="">All roles</option>
                <option value="Receiver">Receiver</option>
                <option value="Driver">Driver</option>
                <option value="Donor">Donor</option>
                <option value="customer">Customer</option>
                <option value="restaurant">Restaurant</option>
                <option value="supermarket">Supermarket</option>
              </select>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">All statuses</option>
                <option value="completed">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {loadingUsers && <p className="admin-message">Loading users...</p>}
            {!loadingUsers && users.length === 0 && <p className="admin-message">No users found.</p>}

            <ul className="admin-user-monitoring-list">
              {users.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    className={`admin-user-monitoring-item${selectedUser?.id === user.id ? ' active' : ''}`}
                    onClick={() => handleSelectUser(user)}
                  >
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                    <span className="admin-user-monitoring-role">{user.role}</span>
                    <div className="admin-user-monitoring-counts">
                      <span>{user.orderCounts.total} orders</span>
                      {user.orderCounts.donationsCreated > 0 && (
                        <span>{user.orderCounts.donationsCreated} listed</span>
                      )}
                      {user.orderCounts.claimsReceived > 0 && (
                        <span>{user.orderCounts.claimsReceived} claims</span>
                      )}
                      {user.orderCounts.customerOrders > 0 && (
                        <span>{user.orderCounts.customerOrders} marketplace</span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <div className="admin-pagination">
              <button type="button" className="admin-btn admin-btn--secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <span>{pagination.page}/{pagination.totalPages}</span>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </aside>

          <main className="admin-user-monitoring-main">
            {!selectedUser && (
              <div className="admin-user-monitoring-empty">
                Select a user to view their order history.
              </div>
            )}

            {selectedUser && (
              <>
                <header className="admin-user-monitoring-main-header">
                  <h2>{selectedUser.name}</h2>
                  <p>{selectedUser.email} · {selectedUser.role}</p>
                  <div className="admin-user-monitoring-summary">
                    <span>Donations listed: {selectedUser.orderCounts.donationsCreated}</span>
                    <span>Claims: {selectedUser.orderCounts.claimsReceived}</span>
                    <span>Claim payments: {selectedUser.orderCounts.claimPayments}</span>
                    <span>Customer orders: {selectedUser.orderCounts.customerOrders}</span>
                  </div>
                </header>

                {loadingOrders && <p className="admin-message">Loading orders...</p>}

                {!loadingOrders && userOrders.length === 0 && (
                  <p className="admin-message">No orders found for this user.</p>
                )}

                {!loadingOrders && userOrders.length > 0 && (
                  <>
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Reference</th>
                            <th>Type</th>
                            <th>Title</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {userOrders.map((order) => (
                            <tr key={`${order.orderType}-${order.id}`}>
                              <td>{order.referenceId}</td>
                              <td>{orderTypeLabel(order.orderType)}</td>
                              <td>{order.title}</td>
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
                        className="admin-btn admin-btn--secondary"
                        disabled={ordersPage <= 1}
                        onClick={() => setOrdersPage((p) => p - 1)}
                      >
                        Prev
                      </button>
                      <span>{ordersPagination.page}/{ordersPagination.totalPages}</span>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary"
                        disabled={ordersPage >= ordersPagination.totalPages}
                        onClick={() => setOrdersPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </main>
        </div>

        {error && <p className="admin-error">{error}</p>}
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

export default AdminUserMonitoringPage;
