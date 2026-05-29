import { useCallback, useEffect, useState } from 'react';
import AdminSideNavbar from '../../../../components/afterLogin/admin/navbar/AdminSideNavbar';
import {
  getAdminMaintenance,
  setScheduledMaintenance,
  startSuddenMaintenance,
  forceSuddenMaintenanceActive,
  endMaintenance,
  cancelMaintenance,
  formatMaintenanceDateTime,
  phaseLabel,
} from '../../../../services/maintenanceApi';
import { useMaintenance } from '../../../../contexts/MaintenanceContext';
import './AdminMaintenancePage.css';
import '../shared/AdminPageTheme.css';

function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminMaintenancePage() {
  const { refresh: refreshPublic } = useMaintenance();
  const [config, setConfig] = useState(null);
  const [phase, setPhase] = useState('off');
  const [ongoingCount, setOngoingCount] = useState(0);
  const [ongoingBreakdown, setOngoingBreakdown] = useState(null);
  const [blockNewOrders, setBlockNewOrders] = useState(false);
  const [showMaintenanceUI, setShowMaintenanceUI] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [scheduledMessage, setScheduledMessage] = useState('');

  const applyState = (res) => {
    setConfig(res.config || null);
    setPhase(res.phase || 'off');
    setOngoingCount(res.ongoingCount ?? 0);
    setOngoingBreakdown(res.ongoingBreakdown || null);
    setBlockNewOrders(Boolean(res.blockNewOrders));
    setShowMaintenanceUI(Boolean(res.showMaintenanceUI));
    if (res.config) {
      setScheduledStart(toDatetimeLocalValue(res.config.scheduledStart));
      setScheduledEnd(toDatetimeLocalValue(res.config.scheduledEnd));
      setScheduledMessage(res.config.scheduledMessage || '');
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminMaintenance();
      applyState(res);
    } catch (err) {
      setError(err.message || 'Failed to load maintenance settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const afterAction = async (res) => {
    applyState(res);
    setMessage(res.message || 'Updated.');
    await refreshPublic();
  };

  const handleSaveScheduled = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const res = await setScheduledMaintenance({
        scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
        scheduledMessage,
      });
      await afterAction(res);
    } catch (err) {
      setError(err.message || 'Failed to save schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartSudden = async () => {
    if (
      !window.confirm(
        'Start sudden maintenance? New orders will stop immediately. Maintenance waits only for food already on the road (picked up / in transit).'
      )
    ) {
      return;
    }
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const res = await startSuddenMaintenance();
      await afterAction(res);
    } catch (err) {
      setError(err.message || 'Failed to start sudden maintenance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForceActive = async () => {
    if (
      !window.confirm(
        'Activate maintenance mode now? Users will see the maintenance screen even if transactions are still in progress.'
      )
    ) {
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await forceSuddenMaintenanceActive();
      await afterAction(res);
    } catch (err) {
      setError(err.message || 'Failed to activate maintenance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnd = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await endMaintenance();
      await afterAction(res);
      setScheduledStart('');
      setScheduledEnd('');
      setScheduledMessage('');
    } catch (err) {
      setError(err.message || 'Failed to end maintenance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await cancelMaintenance();
      await afterAction(res);
    } catch (err) {
      setError(err.message || 'Failed to cancel maintenance.');
    } finally {
      setSubmitting(false);
    }
  };

  const isActive =
    phase !== 'off' && phase !== 'scheduled_upcoming';

  return (
    <div className="admin-page-shell admin__maintenance__page">
      <AdminSideNavbar />
      <div className="admin-page-content">
        <div className="page-header">
          <h1>Maintenance</h1>
          <p>Schedule downtime or trigger sudden maintenance. Control banners, blocks, and the maintenance screen.</p>
        </div>

        {loading && <p className="admin-message">Loading maintenance settings...</p>}
        {error && <p className="admin-error">{error}</p>}
        {message && <p className="admin-maintenance-success">{message}</p>}

        {!loading && (
          <>
            <section className="admin-maintenance-status">
              <h2>Current status</h2>
              <div className="admin-maintenance-chips">
                <span className="admin-maintenance-chip">Phase: {phaseLabel(phase)}</span>
                <span className="admin-maintenance-chip">
                  Block new orders: {blockNewOrders ? 'Yes' : 'No'}
                </span>
                <span className="admin-maintenance-chip">
                  Maintenance UI: {showMaintenanceUI ? 'Visible' : 'Hidden'}
                </span>
                <span className="admin-maintenance-chip">
                  Deliveries in progress: {ongoingCount}
                </span>
              </div>
              {ongoingBreakdown && (
                <p className="admin-maintenance-breakdown">
                  Donations on the road: {ongoingBreakdown.donations} · Customer orders on the
                  road: {ongoingBreakdown.customerOrders}
                </p>
              )}
              {config?.scheduledStart && (
                <p className="admin-maintenance-schedule-preview">
                  Scheduled window: {formatMaintenanceDateTime(config.scheduledStart)} —{' '}
                  {formatMaintenanceDateTime(config.scheduledEnd)}
                </p>
              )}
            </section>

            <div className="admin-maintenance-grid">
              <section className="admin-maintenance-panel">
                <h2>Scheduled maintenance</h2>
                <p className="admin-maintenance-hint">
                  Before the window, a banner appears on all role home dashboards. During the window,
                  users see the maintenance screen and new orders are blocked.
                </p>
                <form className="admin-maintenance-form" onSubmit={handleSaveScheduled}>
                  <label>
                    Start
                    <input
                      type="datetime-local"
                      value={scheduledStart}
                      onChange={(e) => setScheduledStart(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </label>
                  <label>
                    End
                    <input
                      type="datetime-local"
                      value={scheduledEnd}
                      onChange={(e) => setScheduledEnd(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </label>
                  <label>
                    Message
                    <textarea
                      rows={3}
                      value={scheduledMessage}
                      onChange={(e) => setScheduledMessage(e.target.value)}
                      placeholder="Brief message shown on dashboards and during maintenance"
                      disabled={submitting}
                    />
                  </label>
                  <div className="admin-maintenance-actions">
                    <button type="submit" className="admin-btn" disabled={submitting}>
                      Save schedule
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary"
                      onClick={handleCancel}
                      disabled={submitting || config?.mode !== 'scheduled'}
                    >
                      Cancel schedule
                    </button>
                  </div>
                </form>
              </section>

              <section className="admin-maintenance-panel">
                <h2>Sudden maintenance</h2>
                <p className="admin-maintenance-hint">
                  Stops new orders immediately. If food is already traveling (picked up or in
                  transit), maintenance waits for those deliveries to finish; everything else is
                  blocked right away.
                </p>
                {phase === 'sudden_drain' && (
                  <p className="admin-maintenance-drain-notice">
                    Waiting for {ongoingCount} delivery(ies) still on the road. New orders are
                    already paused.
                  </p>
                )}
                <div className="admin-maintenance-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn--danger"
                    onClick={handleStartSudden}
                    disabled={submitting || phase === 'sudden_drain' || phase === 'sudden_active'}
                  >
                    Start sudden maintenance
                  </button>
                  {phase === 'sudden_drain' && (
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={handleForceActive}
                      disabled={submitting}
                    >
                      Activate now (force)
                    </button>
                  )}
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary"
                    onClick={handleEnd}
                    disabled={submitting || !isActive}
                  >
                    End maintenance
                  </button>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminMaintenancePage;
