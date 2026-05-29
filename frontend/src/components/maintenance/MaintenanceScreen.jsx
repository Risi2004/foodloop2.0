import { Link } from 'react-router-dom';
import { formatMaintenanceDateTime } from '../../services/maintenanceApi';
import { useMaintenance } from '../../contexts/MaintenanceContext';
import './MaintenanceScreen.css';

function MaintenanceScreen() {
  const { phase, scheduledEnd, scheduledMessage, isAdmin } = useMaintenance();

  const isSudden = phase === 'sudden_active' || phase === 'sudden_drain';
  const headline = isSudden
    ? "We're making FoodLoop even better"
    : scheduledMessage?.trim() || 'Scheduled maintenance in progress';

  const subtext = isSudden
    ? 'FoodLoop is temporarily unavailable while we improve your experience. Thank you for your patience.'
  : scheduledEnd
    ? `We'll be back by ${formatMaintenanceDateTime(scheduledEnd)}.`
    : 'Please check back soon.';

  return (
    <div className="maintenance-screen">
      <div className="maintenance-screen__bg" aria-hidden />
      <div className="maintenance-screen__content">
        <div className="maintenance-screen__gear" aria-hidden>
          <div className="maintenance-screen__gear-ring" />
          <div className="maintenance-screen__gear-core" />
        </div>
        <h1>{headline}</h1>
        <p>{subtext}</p>
        <p className="maintenance-screen__tagline">
          Good food deserves a great platform — we&apos;ll be back shortly.
        </p>
        <div className="maintenance-screen__actions">
          <Link to="/" className="maintenance-screen__landing-link">
            Go to Home Page
          </Link>
          {isAdmin && (
            <Link to="/admin/maintenance" className="maintenance-screen__admin-link">
              Return to maintenance controls
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default MaintenanceScreen;
