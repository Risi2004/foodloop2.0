import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './ReceiverProfile.css';
import ReceiverNavbar from '../../../../components/afterLogin/dashboard/ReceiverSection/navbar/ReceiverNavbar';
import ReceiverFooter from '../../../../components/afterLogin/dashboard/ReceiverSection/footer/ReceiverFooter';
import profileIcon from "../../../../assets/icons/afterLogin/navbar/profile.svg";
import infoIcon from "../../../../assets/icons/afterLogin/receiver/profile/Business-Group.svg";
import memberProfile from "../../../../assets/icons/afterLogin/receiver/profile/member.svg";
import { getCurrentUser } from '../../../../services/api';
import { getMyClaims, getReceiverStatistics } from '../../../../services/donationApi';
import AchievementsCard from '../../../../components/afterLogin/badges/AchievementsCard';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ReceiverProfile() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState([]);
  const [badgeProgress, setBadgeProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [userRes, claimsRes, statsRes] = await Promise.all([
          getCurrentUser(),
          getMyClaims(),
          getReceiverStatistics().catch(() => ({ success: false })),
        ]);
        if (cancelled) return;
        if (userRes?.user) setUser(userRes.user);
        if (claimsRes?.donations) setClaims(claimsRes.donations);
        if (statsRes?.success && statsRes?.statistics?.badgeProgress) {
          setBadgeProgress(statsRes.statistics.badgeProgress);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [location.pathname]);

  if (loading) {
    return (
      <>
        <ReceiverNavbar />
        <div className="receiverProfile">
          <div className="receiverProfile__container receiverProfile__loading">
            <p>Loading profile...</p>
          </div>
        </div>
        <ReceiverFooter />
      </>
    );
  }

  if (error) {
    return (
      <>
        <ReceiverNavbar />
        <div className="receiverProfile">
          <div className="receiverProfile__container receiverProfile__error">
            <p>{error}</p>
          </div>
        </div>
        <ReceiverFooter />
      </>
    );
  }

  const displayName = user?.receiverName || user?.email || 'Receiver';
  const memberSince = user?.createdAt
    ? formatDate(user.createdAt)
    : '';
  const deliveredCount = claims.filter((c) => c.status === 'delivered').length;
  const recentClaims = claims.slice(0, 10);

  return (
    <>
      <ReceiverNavbar />
      <div className="receiverProfile">
        <div className="receiverProfile__container">

          {/* Top Section: Profile & Verification */}
          <section className="receiverProfile__topSection">
            <div className="receiverProfile__idCard glass-card">
              <div className="receiverProfile__avatar">
                <img
                  src={user?.profileImageUrl || profileIcon}
                  alt="Profile"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = profileIcon;
                  }}
                />
              </div>
              <div className="receiverProfile__idDetails">
                <h2 className="receiverProfile__name">{displayName}</h2>
                <span className="receiverProfile__type">{user?.receiverType || '—'}</span>
                {memberSince && (
                  <p className="receiverProfile__tagline">
                    Member since {memberSince}.
                  </p>
                )}
                <Link to="/receiver/edit-profile" className="receiverProfile__editBtn">Edit</Link>
              </div>
            </div>
          </section>

          <div className="receiverProfile__mainGrid">

            {/* Sidebar: Community Info & Members */}
            <aside className="receiverProfile__sidebar">
              <div className="receiverProfile__infoBox glass-card">
                <div className="receiverProfile__sectionHeader">
                  <img src={infoIcon} alt="Info" />
                  <h4>Community Information</h4>
                </div>
                <div className="receiverProfile__infoList">
                  <div className="receiverProfile__infoItem">
                    <label>Contact</label>
                    <div className="receiverProfile__contactDetails">
                      <span>{displayName}</span>
                      {user?.email && (
                        <a href={`mailto:${user.email}`}>{user.email}</a>
                      )}
                    </div>
                  </div>
                  {user?.contactNo && (
                    <div className="receiverProfile__infoItem">
                      <label>Phone</label>
                      <span>{user.contactNo}</span>
                    </div>
                  )}
                  {user?.address && (
                    <div className="receiverProfile__infoItem">
                      <label>Address</label>
                      <span>{user.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="receiverProfile__membersBox glass-card" style={{ background: 'linear-gradient(180deg, #1b4332 0%, #2d6a4f 100%)' }}>
                <AchievementsCard badgeProgress={badgeProgress} unitLabel="claims" />
              </div>

              <div className="receiverProfile__membersBox glass-card">
                <div className="receiverProfile__sectionHeader">
                  <img src={infoIcon} alt="Members" />
                  <h4>Community Member</h4>
                </div>
                <div className="receiverProfile__memberList">
                  <div className="receiverProfile__member">
                    <img src={memberProfile} alt="Member" className="member-avatar" />
                    <div className="receiverProfile__memberInfo">
                      <span className="member-name">{displayName}</span>
                      <span className="member-role">{user?.receiverType || 'Receiver'}</span>
                      <span className="member-subrole">{user?.email || ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>


            {/* Main Content: Stats, About, Donations */}
            <main className="receiverProfile__contentArea glass-card">

              <div className="receiverProfile__statsGrid">
                <div className="statss-card">
                  <h5>Total Claims</h5>
                  <div className="stats-value">
                    <span>{claims.length}</span>
                  </div>
                  <small>Donations received</small>
                </div>
                <div className="statss-card">
                  <h5>Delivered</h5>
                  <div className="stats-value">
                    <span>{deliveredCount}</span>
                  </div>
                  <small>Completed deliveries</small>
                </div>
                <div className="statss-card">
                  <h5>Total Quantity</h5>
                  <div className="stats-value">
                    <span>{claims.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0)}</span>
                  </div>
                  <small>Units received</small>
                </div>
                <div className="statss-card">
                  <h5>Status</h5>
                  <div className="stats-value">
                    <span>{user?.status === 'completed' ? 'Verified' : user?.status || '—'}</span>
                  </div>
                  <small>Account status</small>
                </div>
              </div>

              <div className="receiverProfile__aboutSection">
                <div className="receiverProfile__aboutSectionHeader">
                  <h4 className="section-title text-green">About the Organization</h4>
                  {user?.aboutUs?.trim() && (
                    <Link to="/receiver/edit-profile" className="receiverProfile__aboutEditLink">Edit</Link>
                  )}
                </div>
                {user?.aboutUs?.trim() ? (
                  <div className="receiverProfile__aboutContent">
                    {user.aboutUs.trim().split(/\n+/).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                ) : (
                  <Link to="/receiver/edit-profile" className="receiverProfile__addAboutBtn">
                    Add About Section
                  </Link>
                )}
              </div>

              <div className="receiverProfile__donationsSection">
                <div className="donations-header">
                  <h4>Recent Received Donations</h4>
                  <Link to="/receiver/my-claims">View All</Link>
                </div>
                <div className="donations-table-wrapper">
                  <table className="donations-table">
                    <thead>
                      <tr>
                        <th>Donor</th>
                        <th>Date</th>
                        <th>Quantity</th>
                        <th>Item Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentClaims.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="receiverProfile__noClaims">No received donations yet.</td>
                        </tr>
                      ) : (
                        recentClaims.map((c) => (
                          <tr key={c.id}>
                            <td>{c.donorName || '—'}</td>
                            <td className="text-date">{formatDate(c.createdAt)}</td>
                            <td>{c.quantity ?? '—'}</td>
                            <td><span className="tag tag-purple">{c.itemName || c.foodCategory || '—'}</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </main>
          </div>
        </div>
      </div>
      <ReceiverFooter />
    </>
  );
}

export default ReceiverProfile;
