import React, { useState, useEffect } from 'react';
import { getMyNotifications, markAsRead, NOTIFICATIONS_READ_EVENT } from '../../../services/notificationApi';
import { getSocket, onNewNotification } from '../../../services/socket';
import './Notifications.css';

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getMyNotifications();
        if (!cancelled) setNotifications(res.notifications || []);
        if (!cancelled && (res.unreadCount || 0) > 0) {
          try {
            await markAsRead({ all: true });
            window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
          } catch (_) {
            // ignore mark-read errors
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load notifications');
          setNotifications([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    getSocket();
    const unsub = onNewNotification(async () => {
      try {
        const res = await getMyNotifications();
        setNotifications(res.notifications || []);
      } catch (_) {
        // keep existing list on refetch error
      }
    });
    return () => unsub();
  }, []);

  const todayItems = notifications.filter((n) => isToday(n.createdAt));
  const earlierItems = notifications.filter((n) => !isToday(n.createdAt));

  return (
    <div className="notificationPanel common-glass-card common-glass-card--light">
      {error && (
        <div className="notificationPanel__error" style={{ color: '#c00', padding: '8px' }}>
          {error}
        </div>
      )}
      {loading ? (
        <div className="notificationPanel__loading">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="notificationPanel__empty">No notifications yet.</div>
      ) : (
        <>
          {todayItems.length > 0 && (
            <>
              <div className="notificationPanel__sectionHeader">Today</div>
              {todayItems.map((item) => (
                <div key={item.id} className="notificationPanel__item common-flex-column common-flex-column--center">
                  <div className="notificationPanel__itemHeader common-flex-row common-flex-row--space-between">
                    <div className="notificationPanel__itemTitle">{item.title || 'Update'}</div>
                    <div className="notificationPanel__itemTime">{formatTimeAgo(item.createdAt)}</div>
                  </div>
                  <div className="notificationPanel__itemDescription">{item.message}</div>
                </div>
              ))}
            </>
          )}
          {earlierItems.length > 0 && (
            <>
              <div className="notificationPanel__sectionHeader">Earlier</div>
              {earlierItems.map((item) => (
                <div key={item.id} className="notificationPanel__item common-flex-column common-flex-column--center">
                  <div className="notificationPanel__itemHeader common-flex-row common-flex-row--space-between">
                    <div className="notificationPanel__itemTitle">{item.title || 'Update'}</div>
                    <div className="notificationPanel__itemTime">{formatTimeAgo(item.createdAt)}</div>
                  </div>
                  <div className="notificationPanel__itemDescription">{item.message}</div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default Notifications;
