import receiptIcon from '../../../../../assets/donor profile/Receipt.svg';
import peopleIcon from '../../../../../assets/donor profile/People.svg';
import gasIndustryIcon from '../../../../../assets/donor profile/Gas Industry.svg';
import './ProfileStats.css';

function ProfileStats({ donations = [] }) {
    const totalItems = donations.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
    const deliveredCount = donations.filter(d => d.status === 'delivered').length;

    return (
        <div className="profile-stats">
            <div className="stat-card large-stat">
                <span className="stat-icon"><img src={receiptIcon} alt="" className="stat-icon-img" /></span>
                <h3>Items Donated</h3>
                <div style={{color:"white"}} className="stat-value">{donations.length}</div>
            </div>

            <div className="stat-card large-stat">
                <span className="stat-icon"><img src={peopleIcon} alt="" className="stat-icon-img" /></span>
                <h3>People Fed</h3>
                <div style={{color:"white"}} className="stat-value">{deliveredCount}</div>
            </div>

            <div className="stat-card large-stat">
                <span className="stat-icon"><img src={gasIndustryIcon} alt="" className="stat-icon-img" /></span>
                <h3>Total Quantity</h3>
                <div style={{color:"white"}} className="stat-value">
                    {totalItems}
                    <span className="stat-unit">units</span>
                </div>
            </div>
        </div>
    );
}

export default ProfileStats;
