import { Link } from 'react-router-dom';
import trustIcon from '../../../../assets/icons/afterLogin/donor/my-donations/Trust.svg';
import './DonationSidebar.css';

const DonationSidebar = ({ impactStats }) => {
  const { mealsShared = 0, foodSaved = 0, co2Offset = 0 } = impactStats || {};

  return (
    <aside className="donation-sidebar">
      <div className="sidebar-content">
        <h1 className="sidebar-title">
          <span className="sidebar-title--dark">My</span>{' '}
          <span className="sidebar-title--accent">Donation</span>
        </h1>
        <p className="sidebar-description">
          Manage your contributions and track their impact
        </p>

        <div className="impact-section">
          <div className="impact-header">
            <img src={trustIcon} alt="" className="impact-icon" width={48} height={48} />
            <h2 className="impact-heading">Your Personal Impact</h2>
            <p className="impact-message">
              Thank you for being a vital part of the food loop.
            </p>
          </div>

          <div className="impact-stats">
            <div className="stat-item">
              <span className="stat-value">{mealsShared}</span>
              <span className="stat-label">Meals Shared</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{foodSaved}kg</span>
              <span className="stat-label">Food Saved</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{co2Offset}kg</span>
              <span className="stat-label">CO2 Offset</span>
            </div>
          </div>
        </div>

        <Link to="/donor/new-donation" className="new-donation-button">
          New Donation
        </Link>
      </div>
    </aside>
  );
};

export default DonationSidebar;
