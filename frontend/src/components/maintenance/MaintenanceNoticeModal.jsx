import { useEffect } from 'react';
import { formatMaintenanceDateTime } from '../../services/maintenanceApi';
import './MaintenanceNoticeModal.css';

export function getMaintenanceNoticeDismissKey(banner) {
  if (!banner?.scheduledStart || !banner?.scheduledEnd) return null;
  return `foodloop_maint_notice_${banner.scheduledStart}_${banner.scheduledEnd}`;
}

export function isMaintenanceNoticeDismissed(banner) {
  const key = getMaintenanceNoticeDismissKey(banner);
  if (!key) return false;
  return sessionStorage.getItem(key) === '1';
}

export function dismissMaintenanceNotice(banner) {
  const key = getMaintenanceNoticeDismissKey(banner);
  if (key) sessionStorage.setItem(key, '1');
}

function MaintenanceNoticeModal({ banner, open, onDismiss }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onDismiss]);

  if (!open || !banner) return null;

  const message = banner.message?.trim() || 'We will be performing scheduled maintenance.';
  const start = formatMaintenanceDateTime(banner.scheduledStart);
  const end = formatMaintenanceDateTime(banner.scheduledEnd);

  return (
    <div className="maintenance-notice-modal" role="presentation">
      <button
        type="button"
        className="maintenance-notice-modal__backdrop"
        aria-label="Close maintenance notice"
        onClick={onDismiss}
      />
      <div
        className="maintenance-notice-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="maintenance-notice-title"
      >
        <div className="maintenance-notice-modal__icon" aria-hidden>
          ⏱
        </div>
        <h2 id="maintenance-notice-title">Scheduled maintenance</h2>
        <p className="maintenance-notice-modal__message">{message}</p>
        <p className="maintenance-notice-modal__window">
          From <span>{start}</span> to <span>{end}</span>.
        </p>
        <p className="maintenance-notice-modal__hint">
          You can continue using FoodLoop until the maintenance window begins. New orders will be
          paused during maintenance.
        </p>
        <button type="button" className="maintenance-notice-modal__cancel" onClick={onDismiss}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default MaintenanceNoticeModal;
