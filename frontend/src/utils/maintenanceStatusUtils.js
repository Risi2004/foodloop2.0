/** @typedef {{ phase?: string, blockNewOrders?: boolean, showMaintenanceUI?: boolean, banner?: object|null, scheduledStart?: string|null, scheduledEnd?: string|null, scheduledMessage?: string }} MaintenanceStatus */

const MAINTENANCE_STATUS_CACHE_KEY = 'foodloop_maintenance_status_v1';

export function readCachedMaintenanceStatus() {
  try {
    const raw = sessionStorage.getItem(MAINTENANCE_STATUS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedMaintenanceStatus(status) {
  if (!status) return;
  try {
    sessionStorage.setItem(MAINTENANCE_STATUS_CACHE_KEY, JSON.stringify(status));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getInitialMaintenanceStatus() {
  const cached = readCachedMaintenanceStatus();
  return cached ? applyClientSchedulePhase(cached) : null;
}

export function getScheduleTimes(status) {
  if (!status) return null;
  const start = status.scheduledStart || status.banner?.scheduledStart;
  const end = status.scheduledEnd || status.banner?.scheduledEnd;
  if (!start || !end) return null;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
  return { startMs, endMs, start, end };
}

/**
 * Align UI with scheduled window using client clock so transitions need no page refresh.
 * Sudden / drain phases are left to the server response.
 */
export function applyClientSchedulePhase(serverStatus, now = Date.now()) {
  if (!serverStatus) return serverStatus;

  const times = getScheduleTimes(serverStatus);
  if (!times) return serverStatus;

  const suddenPhases = ['sudden_drain', 'sudden_active'];
  if (suddenPhases.includes(serverStatus.phase)) {
    return serverStatus;
  }

  const isScheduledContext =
    serverStatus.phase === 'scheduled_upcoming' ||
    serverStatus.phase === 'scheduled_active' ||
    Boolean(serverStatus.banner);

  if (!isScheduledContext) return serverStatus;

  const { startMs, endMs, start, end } = times;
  const message =
    serverStatus.scheduledMessage?.trim() ||
    serverStatus.banner?.message?.trim() ||
    '';

  if (now >= endMs) {
    return {
      ...serverStatus,
      phase: 'off',
      blockNewOrders: false,
      showMaintenanceUI: false,
      banner: null,
      scheduledStart: start,
      scheduledEnd: end,
    };
  }

  if (now >= startMs) {
    return {
      ...serverStatus,
      phase: 'scheduled_active',
      blockNewOrders: true,
      showMaintenanceUI: true,
      banner: null,
      scheduledStart: start,
      scheduledEnd: end,
      scheduledMessage: message,
    };
  }

  return {
    ...serverStatus,
    phase: 'scheduled_upcoming',
    blockNewOrders: false,
    showMaintenanceUI: false,
    banner: {
      message,
      scheduledStart: start,
      scheduledEnd: end,
    },
    scheduledStart: start,
    scheduledEnd: end,
    scheduledMessage: message,
  };
}

export function getNextScheduleBoundaryMs(status, now = Date.now()) {
  const times = getScheduleTimes(status);
  if (!times) return null;
  const { startMs, endMs } = times;
  if (now < startMs) return startMs - now;
  if (now < endMs) return endMs - now;
  return null;
}

export function getPollIntervalMs(phase) {
  if (phase === 'sudden_drain') return 5000;
  if (phase === 'scheduled_upcoming' || phase === 'scheduled_active') return 8000;
  return 30000;
}

export function shouldUseFastTick(status) {
  if (!status) return false;
  if (status.phase === 'sudden_drain') return true;

  const times = getScheduleTimes(status);
  if (!times) return false;

  const now = Date.now();
  const soon = 5 * 60 * 1000;
  return (
    status.phase === 'scheduled_upcoming' ||
    status.phase === 'scheduled_active' ||
    Math.abs(times.startMs - now) < soon ||
    Math.abs(times.endMs - now) < soon
  );
}

/** Avoid re-rendering the whole app when poll/tick returns the same maintenance state. */
export function maintenanceStatusEquals(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.phase === b.phase &&
    Boolean(a.blockNewOrders) === Boolean(b.blockNewOrders) &&
    Boolean(a.showMaintenanceUI) === Boolean(b.showMaintenanceUI) &&
    (a.ongoingCount ?? 0) === (b.ongoingCount ?? 0) &&
    (a.scheduledMessage || '') === (b.scheduledMessage || '') &&
    (a.scheduledStart || null) === (b.scheduledStart || null) &&
    (a.scheduledEnd || null) === (b.scheduledEnd || null) &&
    JSON.stringify(a.banner || null) === JSON.stringify(b.banner || null) &&
    JSON.stringify(a.ongoingBreakdown || null) === JSON.stringify(b.ongoingBreakdown || null)
  );
}
