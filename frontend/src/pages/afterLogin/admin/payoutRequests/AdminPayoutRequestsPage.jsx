import { useCallback, useEffect, useState } from 'react';
import AdminSideNavbar from '../../../../components/afterLogin/admin/navbar/AdminSideNavbar';
import {
  getAdminPayoutRequests,
  getAdminPayoutRequestDetail,
  approveAdminPayoutRequest,
  rejectAdminPayoutRequest,
  markAdminPayoutPaid,
  formatLkr,
  statusLabel,
  sourceTypeLabel,
} from '../../../../services/earningsApi';
import './AdminPayoutRequestsPage.css';
import '../shared/AdminPageTheme.css';

function AdminPayoutRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminPayoutRequests(statusFilter || undefined);
      setRequests(res.payoutRequests || []);
    } catch (err) {
      setError(err.message || 'Failed to load payout requests.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const openDetail = async (id) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await getAdminPayoutRequestDetail(id);
      setDetail(res.payoutRequest);
    } catch (err) {
      setError(err.message || 'Failed to load payout detail.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
  };

  const runAction = async (id, action) => {
    if (action === 'approve') {
      const confirmed = window.confirm(
        'Verify earnings and approve this payout? The user will receive an email stating payment will be credited within 2 working days.'
      );
      if (!confirmed) return;
    }

    setActionId(id);
    setError('');
    try {
      if (action === 'approve') await approveAdminPayoutRequest(id, adminNote);
      if (action === 'reject') await rejectAdminPayoutRequest(id, adminNote);
      if (action === 'paid') await markAdminPayoutPaid(id);
      setAdminNote('');
      await loadRequests();
      if (selectedId === id) {
        await openDetail(id);
      }
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setActionId(null);
    }
  };

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })
      : '—';

  const formatDueDate = (value) =>
    value
      ? new Date(value).toLocaleDateString('en-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : '—';

  return (
    <div className="admin-page-shell admin__payout__page">
      <AdminSideNavbar />
      <div className="admin-page-content">
        <div className="page-header">
          <h1>Payout Requests</h1>
          <p>Review linked earnings, verify payouts, and process supplier and driver withdrawals.</p>
        </div>

        <div className="admin-filters">
          <label>
            Filter by status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
            </select>
          </label>
          <label className="admin-payout-note">
            Admin note (optional)
            <input
              type="text"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Reason or internal note"
            />
          </label>
        </div>

        {loading && <p className="admin-message">Loading...</p>}
        {error && <p className="admin-error">{error}</p>}

        {!loading && requests.length === 0 && <p className="admin-message">No payout requests found.</p>}

        {!loading && requests.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Amount</th>
                  <th>Bank</th>
                  <th>Requested</th>
                  <th>Credit by</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <div>{req.user?.name || '—'}</div>
                      <small>{req.user?.email}</small>
                    </td>
                    <td>{req.roleType}</td>
                    <td>{formatLkr(req.amount)}</td>
                    <td>
                      <div>{req.bankName}</div>
                      <small>{req.bankAccountName} • {req.bankAccountNumber}</small>
                      {req.bankBranch && <small>{req.bankBranch}</small>}
                    </td>
                    <td>{formatDate(req.createdAt)}</td>
                    <td>{formatDueDate(req.expectedTransferBy)}</td>
                    <td>{statusLabel(req.status)}</td>
                    <td className="admin-payout-actions">
                      <button type="button" className="admin-btn admin-btn--secondary" onClick={() => openDetail(req.id)}>
                        Review
                      </button>
                      {req.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            className="admin-btn"
                            disabled={actionId === req.id}
                            onClick={() => runAction(req.id, 'approve')}
                          >
                            Verify & Approve
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn--danger"
                            disabled={actionId === req.id}
                            onClick={() => runAction(req.id, 'reject')}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {req.status === 'approved' && (
                        <button
                          type="button"
                          className="admin-btn"
                          disabled={actionId === req.id}
                          onClick={() => runAction(req.id, 'paid')}
                        >
                          Mark paid
                        </button>
                      )}
                      {req.adminNote && <small>Note: {req.adminNote}</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && (
        <div className="admin-payout-drawer-overlay" onClick={closeDetail} role="presentation">
          <div className="admin-payout-drawer" onClick={(e) => e.stopPropagation()} role="dialog">
            <header className="admin-payout-drawer-header">
              <h2>Payout verification</h2>
              <button type="button" onClick={closeDetail} aria-label="Close">&times;</button>
            </header>

            {detailLoading && <p className="admin-payout-drawer-body">Loading...</p>}

            {!detailLoading && detail && (
              <div className="admin-payout-drawer-body">
                <section>
                  <h3>Request</h3>
                  <p><strong>{detail.user?.name}</strong> ({detail.user?.email})</p>
                  <p>Amount: {formatLkr(detail.amount)} · Status: {statusLabel(detail.status)}</p>
                  <p>Bank: {detail.bankName} — {detail.bankAccountName} ({detail.bankAccountNumber})</p>
                  {detail.expectedTransferBy && (
                    <p>Expected credit by: {formatDueDate(detail.expectedTransferBy)}</p>
                  )}
                </section>

                <section>
                  <h3>Linked earnings ({detail.transactions?.length || 0})</h3>
                  {!detail.transactions?.length && <p>No linked transactions.</p>}
                  {detail.transactions?.length > 0 && (
                    <table className="admin-payout-tx-table">
                      <thead>
                        <tr>
                          <th>Reference</th>
                          <th>Source</th>
                          <th>Gross</th>
                          <th>Fee</th>
                          <th>Net</th>
                          <th>Credited</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td>
                              {tx.source?.trackingId || tx.source?.orderId || tx.referenceLabel || tx.id}
                            </td>
                            <td>{sourceTypeLabel(tx.sourceType)}</td>
                            <td>{tx.grossAmount != null ? formatLkr(tx.grossAmount) : '—'}</td>
                            <td>{tx.platformFee != null ? formatLkr(tx.platformFee) : '—'}</td>
                            <td>{formatLkr(tx.amount)}</td>
                            <td>{formatDate(tx.creditedAt)}</td>
                            <td>{statusLabel(tx.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>

                {detail.status === 'pending' && (
                  <div className="admin-payout-drawer-actions">
                    <button
                      type="button"
                      className="admin-btn"
                      disabled={actionId === detail.id}
                      onClick={() => runAction(detail.id, 'approve')}
                    >
                      Verify & Approve
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--danger"
                      disabled={actionId === detail.id}
                      onClick={() => runAction(detail.id, 'reject')}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPayoutRequestsPage;
