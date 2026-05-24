import { useState } from 'react';
import { Link } from 'react-router-dom';
import './RecentRequests.css';
import { updateUserStatus } from '../../../../services/api';

function getDisplayName(user) {
    if (!user) return '—';
    if (user.role === 'Donor') {
        if (user.donorType === 'Business' && user.businessName) return user.businessName;
        return user.username || user.email || 'Donor';
    }
    if (user.role === 'Receiver') return user.receiverName || user.email || 'Receiver';
    if (user.role === 'Driver') return user.driverName || user.email || 'Driver';
    return user.email || '—';
}

function getOrganization(user) {
    if (!user) return '';
    if (user.role === 'Donor') {
        if (user.donorType === 'Business') return user.businessType || '';
        return user.donorType || 'Individual';
    }
    if (user.role === 'Receiver') return user.receiverType || '';
    if (user.role === 'Driver') return user.vehicleType ? `${user.vehicleType}${user.vehicleNumber ? ` • ${user.vehicleNumber}` : ''}` : '';
    return '';
}

function formatDate(createdAt) {
    if (!createdAt) return '—';
    const d = new Date(createdAt);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const RecentRequests = ({ users = [], onStatusUpdated }) => {
    const [updatingId, setUpdatingId] = useState(null);
    const [error, setError] = useState(null);

    const handleApprove = async (userId) => {
        if (updatingId) return;
        setUpdatingId(userId);
        setError(null);
        try {
            await updateUserStatus(userId, 'completed');
            onStatusUpdated?.();
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to approve');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleReject = async (userId) => {
        if (updatingId) return;
        setUpdatingId(userId);
        setError(null);
        try {
            await updateUserStatus(userId, 'rejected');
            onStatusUpdated?.();
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to reject');
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="recent-requests-container">
            <div className="requests-header">
                <h3>Recent Requests</h3>
                <Link to="/admin/user-management" className="view-all-btn">View All</Link>
            </div>
            {error && <p className="recent-requests-error">{error}</p>}
            <div className="requests-table-container">
                <table className="requests-table">
                    <thead>
                        <tr>
                            <th className="th-user">USER NAME</th>
                            <th>DATE</th>
                            <th>ROLE</th>
                            <th className="th-status">STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="recent-requests-empty">No pending requests</td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user._id}>
                                    <td>
                                        <div className="user-info">
                                            <span className="user-name">{getDisplayName(user)}</span>
                                            <span className="user-email">{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="date-cell">{formatDate(user.createdAt)}</td>
                                    <td>
                                        <div className="role-info">
                                            <span className="role-type">{user.role}</span>
                                            <span className="role-org">{getOrganization(user)}</span>
                                        </div>
                                    </td>
                                    <td className="status-cell">
                                        <div className="action-buttons">
                                            <button
                                                className="action-btn approve"
                                                title="Approve"
                                                onClick={() => handleApprove(user._id)}
                                                disabled={updatingId === user._id}
                                            >
                                                {updatingId === user._id ? '…' : '✓'}
                                            </button>
                                            <button
                                                className="action-btn reject"
                                                title="Reject"
                                                onClick={() => handleReject(user._id)}
                                                disabled={updatingId === user._id}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RecentRequests;
