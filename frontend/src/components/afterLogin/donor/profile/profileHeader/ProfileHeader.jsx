import { Link } from 'react-router-dom';
import locationIcon from '../../../../../assets/donor profile/location_on.svg';
import goldBadge from '../../../../../assets/icons/afterLogin/status-batch/gold.svg';
import './ProfileHeader.css';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=2574&auto=format&fit=crop';

function formatMemberSince(createdAt) {
    if (!createdAt) return '';
    const d = new Date(createdAt);
    const month = d.toLocaleString('default', { month: 'long' });
    const year = d.getFullYear();
    return `${month} ${year}`;
}

function formatPremiumUntil(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-LK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function ProfileHeader({ user, isPremium, premiumExpiresAt }) {
    const role = (user?.role || '').toLowerCase();
    const isBusinessRole = ['restaurant', 'supermarket', 'business', 'donor'].includes(role);
    const displayName = isBusinessRole
        ? (user?.businessName || 'Business Donor')
        : (user?.username || user?.email || 'Supplier');
    const displayType = isBusinessRole
        ? (user?.businessType || user?.role || 'Business')
        : 'Individual';
    const memberSince = formatMemberSince(user?.createdAt);
    const avatarUrl = user?.profileImageUrl || DEFAULT_AVATAR;

    return (
        <div className="profile-header">
            <div className="profile-info">
                <div className={`profile-avatar-container${isPremium ? ' profile-avatar-container--premium' : ''}`}>
                    <img src={avatarUrl} alt="Profile" className="profile-avatar" />
                    {isPremium && (
                        <span className="profile-premium-crown" title="Premium member">
                            <img src={goldBadge} alt="" aria-hidden="true" />
                        </span>
                    )}
                </div>
                <div className="profile-details">
                    <div className="profile-title-row">
                        <h1 className="profile-name">{displayName}</h1>
                        {/* Edit button shown inline where the verified badge used to be */}
                        {isPremium && (
                            <span className="profile-premium-badge">
                                <img src={goldBadge} alt="" aria-hidden="true" />
                                Premium
                            </span>
                        )}
                        <Link to="/supplier/edit-profile" className="inline-edit-link">
                            <button className="edit-btn inline-edit-btn">Edit</button>
                        </Link>
                    </div>
                    <p className="profile-type">{displayType}</p>
                    {isPremium && (
                        <p className="profile-premium-meta">
                            Premium bundle active
                            {premiumExpiresAt ? ` until ${formatPremiumUntil(premiumExpiresAt)}` : ''}
                            {' · '}
                            Unlimited AI insights &amp; ESG reporting
                        </p>
                    )}
                    {memberSince && (
                        <p className="profile-meta">Member since {memberSince}</p>
                    )}
                    {user?.address && (
                        <div className="profile-location-row">
                            <img src={locationIcon} alt="" className="location-icon-img" /> {user.address}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProfileHeader;
