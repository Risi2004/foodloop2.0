import { Link } from 'react-router-dom';
import notificationIcon from '../../../assets/icons/afterLogin/navbar/notification.svg';
import { useUnreadNotificationCount } from '../../../hooks/useUnreadNotificationCount';

function formatBadgeCount(count) {
  if (count > 99) return '99+';
  return String(count);
}

export default function NotificationNavLink({ to, className = '', imgClassName = 'navbar__s3__img1' }) {
  const unreadCount = useUnreadNotificationCount();

  return (
    <Link
      to={to}
      className={`navbar__notification-wrap ${className}`.trim()}
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
    >
      <img className={imgClassName} src={notificationIcon} alt="" />
      {unreadCount > 0 && (
        <span className="navbar__notification-badge" aria-hidden="true">
          {formatBadgeCount(unreadCount)}
        </span>
      )}
    </Link>
  );
}
