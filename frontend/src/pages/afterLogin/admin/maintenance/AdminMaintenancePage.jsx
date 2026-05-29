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

/** Earliest allowed end = start + 1 minute (end must be after start). */
function minEndAfterStart(startLocal) {
  if (!startLocal) return '';
  const d = new Date(startLocal);
  if (Number.isNaN(d.getTime())) return '';
  d.setMinutes(d.getMinutes() + 1);
  return toDatetimeLocalValue(d.toISOString());
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
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);

  const applyState = (res, { syncForm = true } = {}) => {
    setConfig(res.config || null);
    setPhase(res.phase || 'off');
    setOngoingCount(res.ongoingCount ?? 0);
    setOngoingBreakdown(res.ongoingBreakdown || null);
    setBlockNewOrders(Boolean(res.blockNewOrders));
    setShowMaintenanceUI(Boolean(res.showMaintenanceUI));
    if (syncForm && res.config) {
      setScheduledStart(toDatetimeLocalValue(res.config.scheduledStart));
      setScheduledEnd(toDatetimeLocalValue(res.config.scheduledEnd));
      setScheduledMessage(res.config.scheduledMessage || '');
    }
  };

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const res = await getAdminMaintenance();
      applyState(res, { syncForm: !silent });
    } catch (err) {
      if (!silent) {
        setError(err.message || 'Failed to load maintenance settings.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load({ silent: true }), 15000);
    return () => clearInterval(id);
  }, [load]);

  const afterAction = async (res) => {
    applyState(res);
    setMessage(res.message || 'Updated.');
    await refreshPublic();
  };

  const handleScheduledStartChange = (value) => {
    setScheduledStart(value);
    if (!value || !scheduledEnd) return;
    const startMs = new Date(value).getTime();
    const endMs = new Date(scheduledEnd).getTime();
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs <= startMs) {
      setScheduledEnd('');
    }
  };

  const minScheduledEnd = minEndAfterStart(scheduledStart);
  const endPickerDisabled = submitting || !scheduledStart;

  const handleSaveScheduled = async (e) => {
    e.preventDefault();
    if (scheduledStart && scheduledEnd) {
      const startMs = new Date(scheduledStart).getTime();
      const endMs = new Date(scheduledEnd).getTime();
      if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs <= startMs) {
        setError('End date and time must be after the start date and time.');
        return;
      }
    }
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
      setIsEditingSchedule(false);
    } catch (err) {
      setError(err.message || 'Failed to save schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  const syncFormFromConfig = () => {
    if (!config) return;
    setScheduledStart(toDatetimeLocalValue(config.scheduledStart));
    setScheduledEnd(toDatetimeLocalValue(config.scheduledEnd));
    setScheduledMessage(config.scheduledMessage || '');
  };

  const handleEditScheduled = () => {
    syncFormFromConfig();
    setIsEditingSchedule(true);
    setError('');
    setMessage('');
  };

  const handleCancelEditScheduled = () => {
    syncFormFromConfig();
    setIsEditingSchedule(false);
    setError('');
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
    if (
      !window.confirm(
        'End maintenance now? Users will be notified that maintenance work has finished.'
      )
    ) {
      return;
    }
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

  const handleCancelScheduled = async () => {
    const beforeStart = phase === 'scheduled_upcoming';
    const confirmMsg = beforeStart
      ? 'Cancel this scheduled maintenance? Users will be notified that maintenance was cancelled before it started.'
      : 'Cancel scheduled maintenance now? Users will be notified that maintenance work has finished.';
    if (!window.confirm(confirmMsg)) return;

    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const res = await cancelMaintenance();
      await afterAction(res);
      setScheduledStart('');
      setScheduledEnd('');
      setScheduledMessage('');
      setIsEditingSchedule(false);
    } catch (err) {
      setError(err.message || 'Failed to cancel scheduled maintenance.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasScheduledMaintenance =
    config?.mode === 'scheduled' ||
    phase === 'scheduled_upcoming' ||
    phase === 'scheduled_active';

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
            </section>

            {hasScheduledMaintenance && (
              <section className="admin-scheduled-maintenance-active">
                <div className="admin-scheduled-maintenance-active__head">
                  <h2>Scheduled Maintenance</h2>
                  <span className="admin-scheduled-maintenance-active__badge">
                    {phaseLabel(phase)}
                  </span>
                </div>

                {!isEditingSchedule ? (
                  <>
                    {config?.scheduledMessage?.trim() && (
                      <p className="admin-scheduled-maintenance-active__message">
                        {config.scheduledMessage.trim()}
                      </p>
                    )}
                    <p className="admin-scheduled-maintenance-active__window">
                      <strong>Start:</strong> {formatMaintenanceDateTime(config?.scheduledStart)}
                      <br />
                      <strong>End:</strong> {formatMaintenanceDateTime(config?.scheduledEnd)}
                    </p>
                    <p className="admin-scheduled-maintenance-active__hint">
                      {phase === 'scheduled_upcoming'
                        ? 'Not started yet — edit or cancel anytime before the window begins.'
                        : 'Maintenance is in progress — edit the window or cancel when work is finished.'}
                    </p>
                    <div className="admin-scheduled-maintenance-active__actions">
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={handleEditScheduled}
                        disabled={submitting}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--danger"
                        onClick={handleCancelScheduled}
                        disabled={submitting}
                      >
                        Cancel scheduled maintenance
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="admin-scheduled-maintenance-active__hint">
                      Update dates or message — users will be emailed if anything changes.
                    </p>
                    <form
                      className="admin-maintenance-form admin-maintenance-form--in-card"
                      onSubmit={handleSaveScheduled}
                    >
                      <label>
                        Start
                        <input
                          type="datetime-local"
                          value={scheduledStart}
                          onChange={(e) => handleScheduledStartChange(e.target.value)}
                          required
                          disabled={submitting}
                        />
                      </label>
                      <label>
                        End
                        <input
                          type="datetime-local"
                          value={scheduledEnd}
                          min={minScheduledEnd || undefined}
                          onChange={(e) => setScheduledEnd(e.target.value)}
                          required
                          disabled={endPickerDisabled}
                          title={
                            scheduledStart
                              ? 'Must be after the start date and time'
                              : 'Choose a start date and time first'
                          }
                        />
                      </label>
                      {!scheduledStart && (
                        <p className="admin-maintenance-field-hint admin-maintenance-field-hint--light">
                          Select a start date and time before choosing the end.
                        </p>
                      )}
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
                          Save changes
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary"
                          onClick={handleCancelEditScheduled}
                          disabled={submitting}
                        >
                          Cancel edit
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </section>
            )}

            <div className="admin-maintenance-grid">
              {!hasScheduledMaintenance && (
              <section className="admin-maintenance-panel">
                <h2>Scheduled maintenance</h2>
                <p className="admin-maintenance-hint">
                  Users receive a login popup before the window. During the window, new orders are
                  blocked and the maintenance screen is shown.
                </p>
                <form className="admin-maintenance-form" onSubmit={handleSaveScheduled}>
                  <label>
                    Start
                    <input
                      type="datetime-local"
                      value={scheduledStart}
                      onChange={(e) => handleScheduledStartChange(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </label>
                  <label>
                    End
                    <input
                      type="datetime-local"
                      value={scheduledEnd}
                      min={minScheduledEnd || undefined}
                      onChange={(e) => setScheduledEnd(e.target.value)}
                      required
                      disabled={endPickerDisabled}
                      title={
                        scheduledStart
                          ? 'Must be after the start date and time'
                          : 'Choose a start date and time first'
                      }
                    />
                  </label>
                  {!scheduledStart && (
                    <p className="admin-maintenance-field-hint">
                      Select a start date and time before choosing the end.
                    </p>
                  )}
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
                  </div>
                </form>
              </section>
              )}

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
