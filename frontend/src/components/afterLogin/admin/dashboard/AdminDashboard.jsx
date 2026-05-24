import { useState, useEffect } from 'react';
import './AdminDashboard.css';
import StatsCard from './StatsCard';
import RecentRequests from './RecentRequests';
import { getAdminStats, getPendingUsers } from '../../../../services/api';

// SVGs for Icons
const DonorIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 12H5V20H9V14H15V20H19V12H22L12 2Z" fill="white" fillOpacity="0.8" />
        <circle cx="12" cy="17" r="2" fill="white" />
    </svg>
);

const VolunteerIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.11 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="white" />
    </svg>
);

const NGOIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" />
        <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" fill="white" transform="scale(0.5) translate(12,12)" />
    </svg>
);

function formatCount(n) {
    const num = Number(n) || 0;
    if (num >= 1000) return num.toLocaleString() + '+';
    return String(num);
}

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [statsRes, pendingRes] = await Promise.all([
                getAdminStats(),
                getPendingUsers(),
            ]);
            if (statsRes?.success && statsRes?.stats) setStats(statsRes.stats);
            if (pendingRes?.success && Array.isArray(pendingRes?.users)) setPendingUsers(pendingRes.users);
        } catch (err) {
            setError(err.message || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleStatusUpdated = () => {
        fetchData();
    };

    if (loading && !stats) {
        return (
            <div className="admin-dashboard">
                <div className="dashboard-header-row">
                    <h1 className="page-title">Network Overview</h1>
                </div>
                <div className="admin-dashboard-loading">
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error && !stats) {
        return (
            <div className="admin-dashboard">
                <div className="dashboard-header-row">
                    <h1 className="page-title">Network Overview</h1>
                </div>
                <div className="admin-dashboard-error">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header-row">
                <div>
                    <h1 className="page-title">Network Overview</h1>
                    <p className="page-subtitle">Monitoring real-time transparency across the food loop.</p>
                </div>
                <div className="live-badge">
                    <span className="live-dot"></span> Live Updates Enabled
                </div>
            </div>

            <div className="stats-section">
                <StatsCard
                    title="Donors Registered"
                    count={stats ? formatCount(stats.donors) : '0'}
                    icon={<DonorIcon />}
                    type="donors"
                />
                <StatsCard
                    title="Volunteers Registered"
                    count={stats ? formatCount(stats.drivers) : '0'}
                    icon={<VolunteerIcon />}
                    type="volunteers"
                />
                <StatsCard
                    title="NGOs Registered"
                    count={stats ? formatCount(stats.receivers) : '0'}
                    icon={<NGOIcon />}
                    type="ngos"
                />
            </div>

            <RecentRequests
                users={pendingUsers}
                onStatusUpdated={handleStatusUpdated}
            />
        </div>
    );
};

export default AdminDashboard;
