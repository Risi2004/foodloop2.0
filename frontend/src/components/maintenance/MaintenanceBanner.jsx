import { formatMaintenanceDateTime } from '../../services/maintenanceApi';
import './MaintenanceBanner.css';

function MaintenanceBanner({ banner }) {
  if (!banner) return null;

  const message = banner.message?.trim() || 'We will be performing scheduled maintenance.';
  const start = formatMaintenanceDateTime(banner.scheduledStart);
  const end = formatMaintenanceDateTime(banner.scheduledEnd);

  return (
    <div className="maintenance-banner" role="status">
      <div className="maintenance-banner__icon" aria-hidden>
        ⏱
      </div>
      <div className="maintenance-banner__content">
        <strong>Scheduled maintenance</strong>
        <p>
          {message} From <span>{start}</span> to <span>{end}</span>.
        </p>
      </div>
    </div>
  );
}

export default MaintenanceBanner;
