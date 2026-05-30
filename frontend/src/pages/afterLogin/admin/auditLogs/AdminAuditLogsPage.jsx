import { useEffect, useState, useCallback, Fragment } from 'react';
import AdminSideNavbar from '../../../../components/afterLogin/admin/navbar/AdminSideNavbar';
import { getAuditLogs, getAuditSettings, toggleAudit } from '../../../../services/api';
import './AdminAuditLogsPage.css';
import '../shared/AdminPageTheme.css';

function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Search & Filter States
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  
  // Pagination States
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  // Accordion Expand/Collapse States
  const [expandedRows, setExpandedRows] = useState({});

  // Helper: map action to styling category
  const getActionCategory = (action) => {
    if (!action) return 'other';
    const upper = action.toUpperCase();
    if (upper.startsWith('USER_')) return 'auth';
    if (upper.startsWith('DONATION_')) return 'donation';
    if (upper.startsWith('DELIVERY_')) return 'delivery';
    if (upper.startsWith('MAINTENANCE_') || upper.startsWith('PAYOUT_') || upper.startsWith('AUDIT_')) return 'admin';
    return 'other';
  };

  // Helper: map role to css class
  const getRoleClass = (role) => {
    if (!role) return 'system';
    const r = role.toLowerCase();
    if (['admin', 'donor', 'receiver', 'driver', 'system'].includes(r)) {
      return r;
    }
    return 'system';
  };

  // Fetch settings & status
  const fetchSettings = useCallback(async () => {
    try {
      const res = await getAuditSettings();
      if (res.success) {
        setIsPaused(res.isPaused);
      }
    } catch (err) {
      console.error('Failed to load audit settings:', err);
    }
  }, []);

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit,
        search,
        role: roleFilter,
        action: actionFilter,
      };
      
      const res = await getAuditLogs(params);
      if (res.success) {
        setLogs(res.logs || []);
        setTotalLogs(res.pagination?.total || 0);
        setTotalPages(res.pagination?.pages || 1);
      } else {
        setError(res.message || 'Failed to fetch audit logs.');
      }
    } catch (err) {
      setError(err.message || 'Error occurred while loading audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, roleFilter, actionFilter]);

  // Initial load & Polling
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle audit pause/resume toggle
  const handleToggleAudit = async () => {
    if (toggleLoading) return;
    
    const confirmMsg = isPaused
      ? 'Resume global audit logging? System activities will be recorded once again.'
      : 'Pause global audit logging? Activities will not be logged until resumed.';
      
    if (!window.confirm(confirmMsg)) return;

    setToggleLoading(true);
    try {
      const res = await toggleAudit(!isPaused);
      if (res.success) {
        setIsPaused(res.isPaused);
        fetchLogs();
      }
    } catch (err) {
      alert(err.message || 'Failed to toggle audit status.');
    } finally {
      setToggleLoading(false);
    }
  };

  // Toggle row expansion
  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Search input handler
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1); // Reset to page 1 on search
  };

  // Filter handlers
  const handleRoleChange = (e) => {
    setRoleFilter(e.target.value);
    setPage(1);
  };

  const handleActionChange = (e) => {
    setActionFilter(e.target.value);
    setPage(1);
  };

  return (
    <div className="admin-page-shell admin__audit__page">
      <AdminSideNavbar />
      <div className="admin-page-content">
        
        {/* Page Header */}
        <div className="page-header">
          <div className="audit-header-container">
            <div>
              <h1>Audit Logs</h1>
              <p>Review system activities, user operations, and automated compliance records</p>
            </div>
            
            {/* Status Indicator & Global Pause/Resume Toggle */}
            <div className="admin-audit-settings-panel">
              <div className="status-indicator">
                <span className={`status-dot ${isPaused ? 'paused' : 'active'}`}></span>
                <span>Auditing: {isPaused ? 'PAUSED' : 'ACTIVE'}</span>
              </div>
              
              <div 
                className="toggle-switch-wrapper" 
                onClick={handleToggleAudit}
                title={isPaused ? "Click to Resume Audit Logging" : "Click to Pause Audit Logging"}
              >
                <div className={`toggle-switch ${isPaused ? '' : 'active'}`}>
                  <div className="toggle-switch-handle"></div>
                </div>
                <span className="toggle-switch-label">
                  {toggleLoading ? '...' : isPaused ? 'Resume' : 'Pause'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Control Filters Panel */}
        <div className="admin-filters">
          <label className="search-filter-label">
            Search
            <input 
              type="text" 
              placeholder="Search username, email, action..."
              value={search}
              onChange={handleSearchChange}
            />
          </label>
          
          <label>
            User Role
            <select 
              value={roleFilter}
              onChange={handleRoleChange}
            >
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Donor">Donor</option>
              <option value="Receiver">Receiver</option>
              <option value="Driver">Driver</option>
              <option value="System">System</option>
            </select>
          </label>
          
          <label>
            Action Type
            <select 
              value={actionFilter}
              onChange={handleActionChange}
            >
              <option value="All">All Actions</option>
              <option value="USER_REGISTER">USER_REGISTER</option>
              <option value="USER_LOGIN">USER_LOGIN</option>
              <option value="USER_DELETED">USER_DELETED</option>
              <option value="DONATION_CREATE">DONATION_CREATE</option>
              <option value="DONATION_CLAIM">DONATION_CLAIM</option>
              <option value="DONATION_CLAIM_CANCEL">DONATION_CLAIM_CANCEL</option>
              <option value="DONATION_UPDATE">DONATION_UPDATE</option>
              <option value="DONATION_CANCEL">DONATION_CANCEL</option>
              <option value="DELIVERY_ACCEPT">DELIVERY_ACCEPT</option>
              <option value="DELIVERY_PICKUP">DELIVERY_PICKUP</option>
              <option value="DELIVERY_CONFIRM">DELIVERY_CONFIRM</option>
              <option value="MAINTENANCE_SCHEDULED">MAINTENANCE_SCHEDULED</option>
              <option value="MAINTENANCE_SUDDEN_START">MAINTENANCE_SUDDEN_START</option>
              <option value="MAINTENANCE_FORCE_ACTIVE">MAINTENANCE_FORCE_ACTIVE</option>
              <option value="MAINTENANCE_END">MAINTENANCE_END</option>
              <option value="MAINTENANCE_CANCEL">MAINTENANCE_CANCEL</option>
              <option value="PAYOUT_APPROVED">PAYOUT_APPROVED</option>
              <option value="PAYOUT_REJECTED">PAYOUT_REJECTED</option>
              <option value="PAYOUT_MARK_PAID">PAYOUT_MARK_PAID</option>
              <option value="AUDIT_LOGS_TOGGLE">AUDIT_LOGS_TOGGLE</option>
            </select>
          </label>
        </div>

        {/* Error Notification */}
        {error && <div className="admin-error">{error}</div>}

        {/* Logs Table Wrap */}
        <div className="admin-table-wrap">
          {loading ? (
            <p className="admin-message" style={{ padding: '3rem 0', textAlign: 'center' }}>Loading system logs...</p>
          ) : logs.length === 0 ? (
            <div className="audit-empty">
              <div className="audit-empty__icon">🔍</div>
              <h3>No logs found</h3>
              <p>Try adjusting your search criteria, clearing your filters, or check if audit logs are paused.</p>
            </div>
          ) : (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Performed By</th>
                    <th>Role</th>
                    <th>IP Address</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const isExpanded = !!expandedRows[log._id];
                    return (
                      <Fragment key={log._id}>
                        {/* Main Row */}
                        <tr 
                          className={`audit-row ${isExpanded ? 'expanded' : ''}`}
                          onClick={() => toggleRow(log._id)}
                        >
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <button 
                              className={`expand-cell-btn ${isExpanded ? 'rotated' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(log._id);
                              }}
                            >
                              ▾
                            </button>
                          </td>
                          <td className="date-cell" style={{ verticalAlign: 'middle' }}>
                            {new Date(log.timestamp).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td style={{ verticalAlign: 'middle' }}>
                            <span className={`action-badge ${getActionCategory(log.action)}`}>
                              {log.action || 'UNKNOWN'}
                            </span>
                          </td>
                          <td style={{ verticalAlign: 'middle' }}>
                            <div>{log.userName || log.userEmail || 'System'}</div>
                            {log.userEmail && log.userName && (
                              <small>{log.userEmail}</small>
                            )}
                          </td>
                          <td style={{ verticalAlign: 'middle' }}>
                            <span className={`role-badge ${getRoleClass(log.userRole)}`}>
                              {log.userRole || 'System'}
                            </span>
                          </td>
                          <td className="ip-cell" style={{ verticalAlign: 'middle' }}>
                            {log.ipAddress || '—'}
                          </td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                            <button 
                              type="button" 
                              className="admin-btn admin-btn--secondary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(log._id);
                              }}
                            >
                              {isExpanded ? 'Collapse' : 'Details'}
                            </button>
                          </td>
                        </tr>
                        
                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <tr className="audit-details-row">
                            <td colSpan="7">
                              <div className="audit-details-container">
                                <div className="details-grid">
                                  <div className="details-block">
                                    <h4>Log ID</h4>
                                    <p className="ip-cell" style={{ fontSize: '0.85rem' }}>{log._id}</p>
                                  </div>
                                  <div className="details-block">
                                    <h4>Request Context</h4>
                                    <p style={{ margin: '0 0 0.4rem 0' }}>
                                      <strong>IP Address:</strong> {log.ipAddress || 'Unavailable'}
                                    </p>
                                    <p style={{ margin: 0 }}>
                                      <strong>User Agent:</strong>
                                      <span style={{ display: 'block', fontSize: '0.82rem', color: '#618972', wordBreak: 'break-all', marginTop: '0.2rem' }}>
                                        {log.userAgent || 'Direct Server / API client'}
                                      </span>
                                    </p>
                                  </div>
                                  <div className="details-block" style={{ gridColumn: 'span 2' }}>
                                    <h4>Activity Details & Metadata</h4>
                                    {log.details && Object.keys(log.details).length > 0 ? (
                                      <pre className="details-payload-box">
                                        {JSON.stringify(log.details, null, 2)}
                                      </pre>
                                    ) : (
                                      <p style={{ fontStyle: 'italic', color: '#618972', margin: 0 }}>No metadata attached to this entry.</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Themed Pagination Bar */}
        {!loading && logs.length > 0 && (
          <div className="admin-pagination">
            <button 
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              «
            </button>
            <button 
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              ‹
            </button>
            
            <span>Page {page} of {totalPages} (Total: {totalLogs} operations)</span>
            
            <button 
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
            >
              ›
            </button>
            <button 
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              »
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default AdminAuditLogsPage;
