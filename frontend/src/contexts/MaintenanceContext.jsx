import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getMaintenanceStatus } from '../services/maintenanceApi';
import { getUser } from '../utils/auth';
import {
  applyClientSchedulePhase,
  getNextScheduleBoundaryMs,
  getPollIntervalMs,
  shouldUseFastTick,
} from '../utils/maintenanceStatusUtils';

const MaintenanceContext = createContext(null);

export function MaintenanceProvider({ children }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshInFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const res = await getMaintenanceStatus();
      setStatus(applyClientSchedulePhase(res));
    } catch {
      setStatus({
        phase: 'off',
        blockNewOrders: false,
        showMaintenanceUI: false,
        ongoingCount: 0,
      });
    } finally {
      refreshInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  const syncFromServer = useCallback(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
    const phase = status?.phase || 'off';
    const intervalMs = getPollIntervalMs(phase);
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, status?.phase]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncFromServer();
    };
    const onFocus = () => syncFromServer();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [syncFromServer]);

  useEffect(() => {
    if (!shouldUseFastTick(status)) return undefined;

    const tick = () => {
      setStatus((prev) => {
        if (!prev) return prev;
        const next = applyClientSchedulePhase(prev);
        const changed =
          next.phase !== prev.phase ||
          next.blockNewOrders !== prev.blockNewOrders ||
          next.showMaintenanceUI !== prev.showMaintenanceUI;
        if (changed) {
          syncFromServer();
        }
        return next;
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [
    status?.phase,
    status?.scheduledStart,
    status?.scheduledEnd,
    status?.banner?.scheduledStart,
    status?.banner?.scheduledEnd,
    syncFromServer,
  ]);

  useEffect(() => {
    const delay = getNextScheduleBoundaryMs(status);
    if (delay == null || delay <= 0) return undefined;

    const id = setTimeout(() => {
      setStatus((prev) => (prev ? applyClientSchedulePhase(prev) : prev));
      syncFromServer();
    }, Math.min(delay + 50, 2_147_483_647));

    return () => clearTimeout(id);
  }, [
    status?.phase,
    status?.scheduledStart,
    status?.scheduledEnd,
    status?.banner?.scheduledStart,
    status?.banner?.scheduledEnd,
    syncFromServer,
  ]);

  const user = getUser();
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';

  const value = useMemo(
    () => ({
      status,
      loading,
      refresh,
      phase: status?.phase || 'off',
      blockNewOrders: Boolean(status?.blockNewOrders),
      showMaintenanceUI: Boolean(status?.showMaintenanceUI) && !isAdmin,
      showScheduledBanner: status?.phase === 'scheduled_upcoming' && Boolean(status?.banner),
      banner: status?.banner || null,
      scheduledStart: status?.scheduledStart || status?.banner?.scheduledStart || null,
      scheduledEnd: status?.scheduledEnd || null,
      scheduledMessage: status?.scheduledMessage || '',
      ongoingCount: status?.ongoingCount ?? 0,
      ongoingBreakdown: status?.ongoingBreakdown || null,
      isAdmin,
    }),
    [status, loading, refresh, isAdmin]
  );

  return (
    <MaintenanceContext.Provider value={value}>{children}</MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  const ctx = useContext(MaintenanceContext);
  if (!ctx) {
    return {
      status: null,
      loading: false,
      refresh: async () => {},
      phase: 'off',
      blockNewOrders: false,
      showMaintenanceUI: false,
      showScheduledBanner: false,
      banner: null,
      scheduledStart: null,
      scheduledEnd: null,
      scheduledMessage: '',
      ongoingCount: 0,
      ongoingBreakdown: null,
      isAdmin: false,
    };
  }
  return ctx;
}
