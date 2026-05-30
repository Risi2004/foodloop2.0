import { useState, useEffect, useCallback } from 'react';
import { getUnreadCount, NOTIFICATIONS_READ_EVENT } from '../services/notificationApi';
import { getSocket, onNewNotification } from '../services/socket';

export function useUnreadNotificationCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      setUnreadCount(Number(res.unreadCount) || 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    fetchCount();
    getSocket();

    const onRead = () => fetchCount();
    const onFocus = () => fetchCount();
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchCount();
    };

    window.addEventListener(NOTIFICATIONS_READ_EVENT, onRead);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    const unsubNewNotification = onNewNotification(() => fetchCount());
    const intervalId = window.setInterval(fetchCount, 60000);

    return () => {
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, onRead);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      unsubNewNotification();
      window.clearInterval(intervalId);
    };
  }, [fetchCount]);

  return unreadCount;
}
