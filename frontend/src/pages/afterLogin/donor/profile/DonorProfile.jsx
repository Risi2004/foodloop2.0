import { useState, useEffect } from 'react';
import ProfileHeader from '../../../../components/afterLogin/donor/profile/profileHeader/ProfileHeader';
import ProfileSidebar from '../../../../components/afterLogin/donor/profile/profileSidebar/ProfileSidebar';
import ProfileStats from '../../../../components/afterLogin/donor/profile/profileStats/ProfileStats';
import RecentDonations from '../../../../components/afterLogin/donor/profile/recentDonations/RecentDonations';
import DonorNavbar from "../../../../components/afterLogin/dashboard/donorSection/navbar/DonorNavbar";
import DonorFooter from "../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter";
import { getCurrentUser } from '../../../../services/api';
import { getMyDonations, getDonorStatistics } from '../../../../services/donationApi';
import './DonorProfile.css';

function DonorProfile() {
    const [user, setUser] = useState(null);
    const [donations, setDonations] = useState([]);
    const [badgeProgress, setBadgeProgress] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);
                const [userRes, donationsRes, statsRes] = await Promise.all([
                    getCurrentUser(),
                    getMyDonations(),
                    getDonorStatistics().catch(() => ({ success: false })),
                ]);
                if (cancelled) return;
                if (userRes?.user) setUser(userRes.user);
                if (donationsRes?.donations) setDonations(donationsRes.donations);
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
    }, []);

    if (loading) {
        return (
            <>
                <DonorNavbar />
                <div className="profile-page">
                    <div className="profile-container profile-loading">
                        <p>Loading profile...</p>
                    </div>
                </div>
                <DonorFooter />
            </>
        );
    }

    if (error) {
        return (
            <>
                <DonorNavbar />
                <div className="profile-page">
                    <div className="profile-container profile-error">
                        <p>{error}</p>
                    </div>
                </div>
                <DonorFooter />
            </>
        );
    }

    return (
        <>
            <DonorNavbar />
            <div className="profile-page">
                <div className="profile-container">
                    <ProfileHeader user={user} />
                    <div className="profile-content">
                        <aside className="profile-sidebar-column">
                            <ProfileSidebar user={user} badgeProgress={badgeProgress} />
                        </aside>
                        <main className="profile-main-column">
                            <ProfileStats donations={donations} />
                            <RecentDonations donations={donations} />
                        </main>
                    </div>
                </div>
            </div>
            <DonorFooter />
        </>
    );
}

export default DonorProfile;
