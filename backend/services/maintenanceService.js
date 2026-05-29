const Donation = require('../models/Donation');
const CustomerOrder = require('../models/CustomerOrder');
const MaintenanceConfig = require('../models/MaintenanceConfig');
const {
  sendMaintenanceCancelledAnnouncementEmails,
  sendScheduledMaintenanceStartedEmails,
} = require('../utils/sendNotificationEmail');

/** Food is with the driver and not yet delivered — only these block sudden maintenance UI. */
const IN_DELIVERY_STATUSES = ['picked_up', 'in_transit'];

const PHASES = {
  OFF: 'off',
  SCHEDULED_UPCOMING: 'scheduled_upcoming',
  SCHEDULED_ACTIVE: 'scheduled_active',
  SUDDEN_DRAIN: 'sudden_drain',
  SUDDEN_ACTIVE: 'sudden_active',
};

function resolvePhase(config, now = new Date()) {
  const mode = config.mode || 'off';

  if (mode === 'scheduled') {
    const start = config.scheduledStart ? new Date(config.scheduledStart) : null;
    const end = config.scheduledEnd ? new Date(config.scheduledEnd) : null;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return PHASES.OFF;
    }
    if (now > end) return PHASES.OFF;
    if (now < start) return PHASES.SCHEDULED_UPCOMING;
    return PHASES.SCHEDULED_ACTIVE;
  }

  if (mode === 'sudden_drain') return PHASES.SUDDEN_DRAIN;
  if (mode === 'sudden_active') return PHASES.SUDDEN_ACTIVE;
  return PHASES.OFF;
}

function shouldBlockNewOrders(phase) {
  return [
    PHASES.SCHEDULED_ACTIVE,
    PHASES.SUDDEN_DRAIN,
    PHASES.SUDDEN_ACTIVE,
  ].includes(phase);
}

function shouldShowMaintenanceUI(phase) {
  return [PHASES.SCHEDULED_ACTIVE, PHASES.SUDDEN_ACTIVE].includes(phase);
}

async function countInDeliveryOrders() {
  const [donations, customerOrders] = await Promise.all([
    Donation.countDocuments({ status: { $in: IN_DELIVERY_STATUSES } }),
    CustomerOrder.countDocuments({ status: { $in: IN_DELIVERY_STATUSES } }),
  ]);

  return {
    total: donations + customerOrders,
    donations,
    customerOrders,
  };
}

async function getConfigDoc() {
  return MaintenanceConfig.getGlobal();
}

async function maybeAutoClearExpired(config) {
  const now = new Date();
  if (config.mode === 'scheduled' && config.scheduledEnd) {
    const end = new Date(config.scheduledEnd);
    if (!Number.isNaN(end.getTime()) && now > end) {
      const emailPayload = {
        maintenanceType: 'scheduled',
        reason: 'maintenance_finished',
        mode: config.mode,
        phase: PHASES.SCHEDULED_ACTIVE,
        scheduledStart: config.scheduledStart,
        scheduledEnd: config.scheduledEnd,
        scheduledMessage: config.scheduledMessage || '',
      };

      config.mode = 'off';
      config.scheduledStart = null;
      config.scheduledEnd = null;
      config.scheduledMessage = '';
      config.scheduledStartEmailSentAt = null;
      await config.save();

      sendMaintenanceCancelledAnnouncementEmails(emailPayload).catch((err) => {
        console.error('[email] Auto maintenance completion broadcast failed:', err.message);
      });
    }
  }
  return config;
}

async function maybePromoteSuddenDrain(config) {
  if (config.mode !== 'sudden_drain') return config;
  const counts = await countInDeliveryOrders();
  if (counts.total === 0) {
    config.mode = 'sudden_active';
    config.suddenActivatedAt = new Date();
    await config.save();
  }
  return config;
}

async function maybeNotifyScheduledMaintenanceStarted(config) {
  const now = new Date();
  if (config.mode !== 'scheduled' || config.scheduledStartEmailSentAt) {
    return config;
  }

  const start = config.scheduledStart ? new Date(config.scheduledStart) : null;
  const end = config.scheduledEnd ? new Date(config.scheduledEnd) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return config;
  }
  if (now < start || now > end) return config;

  const phase = resolvePhase(config, now);
  if (phase !== PHASES.SCHEDULED_ACTIVE) return config;

  config.scheduledStartEmailSentAt = now;
  await config.save();

  sendScheduledMaintenanceStartedEmails({
    scheduledMessage: config.scheduledMessage || '',
    scheduledStart: config.scheduledStart,
    scheduledEnd: config.scheduledEnd,
  }).catch((err) => {
    console.error('[email] Scheduled maintenance start broadcast failed:', err.message);
  });

  return config;
}

async function getEffectiveState() {
  let config = await getConfigDoc();
  config = await maybeAutoClearExpired(config);
  config = await maybePromoteSuddenDrain(config);
  config = await maybeNotifyScheduledMaintenanceStarted(config);

  const phase = resolvePhase(config);
  const ongoing = await countInDeliveryOrders();

  return {
    config,
    phase,
    mode: config.mode,
    blockNewOrders: shouldBlockNewOrders(phase),
    showMaintenanceUI: shouldShowMaintenanceUI(phase),
    ongoingCount: ongoing.total,
    ongoingBreakdown: ongoing,
    scheduledMessage: config.scheduledMessage || '',
    scheduledStart: config.scheduledStart || null,
    scheduledEnd: config.scheduledEnd || null,
    suddenStartedAt: config.suddenStartedAt || null,
    suddenActivatedAt: config.suddenActivatedAt || null,
  };
}

async function getPublicStatus() {
  const state = await getEffectiveState();
  return {
    phase: state.phase,
    blockNewOrders: state.blockNewOrders,
    showMaintenanceUI: state.showMaintenanceUI,
    ongoingCount: state.ongoingCount,
    ongoingBreakdown: state.ongoingBreakdown,
    banner:
      state.phase === PHASES.SCHEDULED_UPCOMING
        ? {
            message: state.scheduledMessage,
            scheduledStart: state.scheduledStart,
            scheduledEnd: state.scheduledEnd,
          }
        : null,
    scheduledStart: state.scheduledStart || null,
    scheduledEnd: state.scheduledEnd,
    scheduledMessage: state.scheduledMessage,
  };
}

async function setScheduled({ scheduledStart, scheduledEnd, scheduledMessage, adminId }) {
  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid start or end date.');
  }
  if (end <= start) {
    throw new Error('End time must be after start time.');
  }

  const config = await getConfigDoc();
  const prevStartMs = config.scheduledStart ? new Date(config.scheduledStart).getTime() : null;
  const prevEndMs = config.scheduledEnd ? new Date(config.scheduledEnd).getTime() : null;

  config.mode = 'scheduled';
  config.scheduledStart = start;
  config.scheduledEnd = end;
  config.scheduledMessage = String(scheduledMessage || '').trim();
  config.suddenStartedAt = null;
  config.suddenActivatedAt = null;
  config.updatedBy = adminId || null;

  if (prevStartMs !== start.getTime() || prevEndMs !== end.getTime()) {
    config.scheduledStartEmailSentAt = null;
  }

  await config.save();
  return getEffectiveState();
}

async function cancelMaintenance(adminId) {
  const config = await getConfigDoc();
  config.mode = 'off';
  config.scheduledStart = null;
  config.scheduledEnd = null;
  config.scheduledMessage = '';
  config.scheduledStartEmailSentAt = null;
  config.suddenStartedAt = null;
  config.suddenActivatedAt = null;
  config.updatedBy = adminId || null;
  await config.save();
  return getEffectiveState();
}

async function endMaintenance(adminId) {
  return cancelMaintenance(adminId);
}

async function startSuddenDrain(adminId) {
  const config = await getConfigDoc();
  const counts = await countInDeliveryOrders();
  const now = new Date();

  config.scheduledStart = null;
  config.scheduledEnd = null;
  config.scheduledMessage = '';
  config.suddenStartedAt = now;
  config.updatedBy = adminId || null;

  if (counts.total === 0) {
    config.mode = 'sudden_active';
    config.suddenActivatedAt = now;
  } else {
    config.mode = 'sudden_drain';
    config.suddenActivatedAt = null;
  }

  await config.save();
  return getEffectiveState();
}

async function forceSuddenActive(adminId) {
  const config = await getConfigDoc();
  config.mode = 'sudden_active';
  config.suddenStartedAt = config.suddenStartedAt || new Date();
  config.suddenActivatedAt = new Date();
  config.updatedBy = adminId || null;
  await config.save();
  return getEffectiveState();
}

module.exports = {
  PHASES,
  resolvePhase,
  shouldBlockNewOrders,
  shouldShowMaintenanceUI,
  countInDeliveryOrders,
  IN_DELIVERY_STATUSES,
  getEffectiveState,
  getPublicStatus,
  setScheduled,
  cancelMaintenance,
  endMaintenance,
  startSuddenDrain,
  forceSuddenActive,
};
