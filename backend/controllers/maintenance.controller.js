const maintenanceService = require('../services/maintenanceService');
const {
  sendScheduledMaintenanceAnnouncementEmails,
  sendSuddenMaintenanceAnnouncementEmails,
  sendMaintenanceCancelledAnnouncementEmails,
} = require('../utils/sendNotificationEmail');

function notifyMaintenanceEmails(fn, payload) {
  fn(payload).catch((err) => {
    console.error('[email] Maintenance announcement broadcast failed:', err.message);
  });
}

function buildCancellationEmailPayload(beforeState, reason) {
  if (!beforeState || beforeState.phase === 'off') return null;

  const isScheduled =
    beforeState.mode === 'scheduled' ||
    beforeState.phase === 'scheduled_upcoming' ||
    beforeState.phase === 'scheduled_active';

  return {
    maintenanceType: isScheduled ? 'scheduled' : 'sudden',
    reason,
    mode: beforeState.mode,
    phase: beforeState.phase,
    scheduledStart: beforeState.scheduledStart,
    scheduledEnd: beforeState.scheduledEnd,
    scheduledMessage: beforeState.scheduledMessage,
    suddenStartedAt: beforeState.suddenStartedAt,
  };
}

function notifyMaintenanceCancelledIfNeeded(beforeState, reason) {
  const payload = buildCancellationEmailPayload(beforeState, reason);
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
    const state = await maintenanceService.setScheduled({
      scheduledStart,
      scheduledEnd,
      scheduledMessage,
      adminId: req.user._id,
    });
    notifyMaintenanceEmails(sendScheduledMaintenanceAnnouncementEmails, state);
    return res.json({
      success: true,
      message: 'Scheduled maintenance saved.',
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
    notifyMaintenanceCancelledIfNeeded(before, 'admin_end');
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
    notifyMaintenanceCancelledIfNeeded(before, 'admin_cancel');
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
