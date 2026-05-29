const { getEffectiveState, PHASES } = require('../services/maintenanceService');

const DEFAULT_MESSAGE =
  'FoodLoop is temporarily unavailable for new orders. Please try again after maintenance ends.';

function isAdminUser(req) {
  return String(req.user?.role || '').toLowerCase() === 'admin';
}

async function blockNewOrdersDuringMaintenance(req, res, next) {
  try {
    if (isAdminUser(req)) return next();

    const state = await getEffectiveState();
    if (!state.blockNewOrders) return next();

    const phase = state.phase;
    let message = DEFAULT_MESSAGE;
    if (phase === PHASES.SUDDEN_DRAIN) {
      message =
        'Sudden maintenance is in progress. New orders are paused while active deliveries finish.';
    } else if (phase === PHASES.SCHEDULED_ACTIVE && state.scheduledMessage) {
      message = state.scheduledMessage;
    }

    return res.status(503).json({
      success: false,
      code: 'MAINTENANCE',
      phase,
      message,
      blockNewOrders: true,
      showMaintenanceUI: state.showMaintenanceUI,
    });
  } catch (err) {
    console.error('maintenanceGate error:', err);
    return next(err);
  }
}

module.exports = {
  blockNewOrdersDuringMaintenance,
};
