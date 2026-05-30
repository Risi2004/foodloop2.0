const maintenanceService = require('../services/maintenanceService');
const {
  sendScheduledMaintenanceAnnouncementEmails,
  sendScheduledMaintenanceUpdatedEmails,
  sendSuddenMaintenanceAnnouncementEmails,
  sendMaintenanceCancelledAnnouncementEmails,
} = require('../utils/sendNotificationEmail');
const { logActivity } = require('../utils/auditLogger');

function wasScheduledMaintenance(state) {
  if (!state) return false;
  return (
    state.mode === 'scheduled' ||
    state.phase === 'scheduled_upcoming' ||
    state.phase === 'scheduled_active'
  );
}

function scheduleDetailsChanged(before, after) {
  const toMs = (value) => {
    if (!value) return null;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
  };
  if (toMs(before.scheduledStart) !== toMs(after.scheduledStart)) return true;
  if (toMs(before.scheduledEnd) !== toMs(after.scheduledEnd)) return true;
  if ((before.scheduledMessage || '').trim() !== (after.scheduledMessage || '').trim()) {
    return true;
  }
  return false;
}

function notifyMaintenanceEmails(fn, payload) {
  fn(payload).catch((err) => {
    console.error('[email] Maintenance announcement broadcast failed:', err.message);
  });
}

function maintenanceHadStarted(phase) {
  return (
    phase === 'scheduled_active' ||
    phase === 'sudden_drain' ||
    phase === 'sudden_active'
  );
}

function resolveMaintenanceEmailReason(beforeState, action) {
  if (!beforeState || beforeState.phase === 'off') return null;

  if (action === 'end' || maintenanceHadStarted(beforeState.phase)) {
    return 'maintenance_finished';
  }
  return 'cancelled_before_start';
}

function buildCancellationEmailPayload(beforeState, emailReason) {
  if (!beforeState || beforeState.phase === 'off' || !emailReason) return null;

  const isScheduled =
    beforeState.mode === 'scheduled' ||
    beforeState.phase === 'scheduled_upcoming' ||
    beforeState.phase === 'scheduled_active';

  return {
    maintenanceType: isScheduled ? 'scheduled' : 'sudden',
    reason: emailReason,
    mode: beforeState.mode,
    phase: beforeState.phase,
    scheduledStart: beforeState.scheduledStart,
    scheduledEnd: beforeState.scheduledEnd,
    scheduledMessage: beforeState.scheduledMessage,
    suddenStartedAt: beforeState.suddenStartedAt,
  };
}

function notifyMaintenanceCancelledIfNeeded(beforeState, action) {
  const emailReason = resolveMaintenanceEmailReason(beforeState, action);
  const payload = buildCancellationEmailPayload(beforeState, emailReason);
  if (payload) {
    notifyMaintenanceEmails(sendMaintenanceCancelledAnnouncementEmails, payload);
  }
}

exports.getPublicStatus = async (req, res) => {
  try {
    const status = await maintenanceService.getPublicStatus();
    return res.json({ success: true, ...status });
  } catch (err) {
    console.error('getPublicStatus error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load maintenance status',
    });
  }
};

exports.getAdminMaintenance = async (req, res) => {
  try {
    const state = await maintenanceService.getEffectiveState();
    return res.json({
      success: true,
      config: state.config.toPublicJSON(),
      phase: state.phase,
      blockNewOrders: state.blockNewOrders,
      showMaintenanceUI: state.showMaintenanceUI,
      ongoingCount: state.ongoingCount,
      ongoingBreakdown: state.ongoingBreakdown,
    });
  } catch (err) {
    console.error('getAdminMaintenance error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load maintenance settings',
    });
  }
};

exports.setScheduled = async (req, res) => {
  try {
    const { scheduledStart, scheduledEnd, scheduledMessage } = req.body || {};
    const before = await maintenanceService.getEffectiveState();
    const wasScheduled = wasScheduledMaintenance(before);

    const state = await maintenanceService.setScheduled({
      scheduledStart,
      scheduledEnd,
      scheduledMessage,
      adminId: req.user._id,
    });

    if (wasScheduled && scheduleDetailsChanged(before, state)) {
      notifyMaintenanceEmails(sendScheduledMaintenanceUpdatedEmails, {
        previous: before,
        current: state,
      });
    } else if (!wasScheduled) {
      notifyMaintenanceEmails(sendScheduledMaintenanceAnnouncementEmails, state);
    }

    const responseMessage = wasScheduled
      ? scheduleDetailsChanged(before, state)
        ? 'Scheduled maintenance updated.'
        : 'Scheduled maintenance saved (no changes).'
      : 'Scheduled maintenance saved.';

    await logActivity(req.user._id, 'MAINTENANCE_SCHEDULED', { scheduledStart, scheduledEnd, scheduledMessage }, req);

    return res.json({
      success: true,
      message: responseMessage,
      phase: state.phase,
      config: state.config.toPublicJSON(),
      ongoingCount: state.ongoingCount,
      ongoingBreakdown: state.ongoingBreakdown,
      blockNewOrders: state.blockNewOrders,
      showMaintenanceUI: state.showMaintenanceUI,
    });
  } catch (err) {
    console.error('setScheduled error:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to save scheduled maintenance',
    });
  }
};

exports.startSudden = async (req, res) => {
  try {
    const state = await maintenanceService.startSuddenDrain(req.user._id);
    notifyMaintenanceEmails(sendSuddenMaintenanceAnnouncementEmails, state);
    await logActivity(req.user._id, 'MAINTENANCE_SUDDEN_START', {}, req);

    return res.json({
      success: true,
      message:
        state.phase === 'sudden_active'
          ? 'Sudden maintenance is now active.'
          : 'Sudden maintenance started. Waiting for active transactions to finish.',
      phase: state.phase,
      config: state.config.toPublicJSON(),
      ongoingCount: state.ongoingCount,
      ongoingBreakdown: state.ongoingBreakdown,
      blockNewOrders: state.blockNewOrders,
      showMaintenanceUI: state.showMaintenanceUI,
    });
  } catch (err) {
    console.error('startSudden error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to start sudden maintenance',
    });
  }
};

exports.forceSuddenActive = async (req, res) => {
  try {
    const state = await maintenanceService.forceSuddenActive(req.user._id);
    await logActivity(req.user._id, 'MAINTENANCE_FORCE_ACTIVE', {}, req);

    return res.json({
      success: true,
      message: 'Maintenance mode activated.',
      phase: state.phase,
      config: state.config.toPublicJSON(),
      ongoingCount: state.ongoingCount,
      ongoingBreakdown: state.ongoingBreakdown,
      blockNewOrders: state.blockNewOrders,
      showMaintenanceUI: state.showMaintenanceUI,
    });
  } catch (err) {
    console.error('forceSuddenActive error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to activate maintenance',
    });
  }
};

exports.endMaintenance = async (req, res) => {
  try {
    const before = await maintenanceService.getEffectiveState();
    const state = await maintenanceService.endMaintenance(req.user._id);
    notifyMaintenanceCancelledIfNeeded(before, 'end');
    await logActivity(req.user._id, 'MAINTENANCE_END', {}, req);

    return res.json({
      success: true,
      message: 'Maintenance ended.',
      phase: state.phase,
      config: state.config.toPublicJSON(),
      ongoingCount: state.ongoingCount,
      ongoingBreakdown: state.ongoingBreakdown,
      blockNewOrders: state.blockNewOrders,
      showMaintenanceUI: state.showMaintenanceUI,
    });
  } catch (err) {
    console.error('endMaintenance error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to end maintenance',
    });
  }
};

exports.cancelMaintenance = async (req, res) => {
  try {
    const before = await maintenanceService.getEffectiveState();
    const state = await maintenanceService.cancelMaintenance(req.user._id);
    notifyMaintenanceCancelledIfNeeded(before, 'cancel');
    await logActivity(req.user._id, 'MAINTENANCE_CANCEL', {}, req);

    return res.json({
      success: true,
      message: 'Maintenance cancelled.',
      phase: state.phase,
      config: state.config.toPublicJSON(),
      ongoingCount: state.ongoingCount,
      ongoingBreakdown: state.ongoingBreakdown,
      blockNewOrders: state.blockNewOrders,
      showMaintenanceUI: state.showMaintenanceUI,
    });
  } catch (err) {
    console.error('cancelMaintenance error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to cancel maintenance',
    });
  }
};
