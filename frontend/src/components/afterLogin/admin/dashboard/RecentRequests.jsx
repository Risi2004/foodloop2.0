import { useState } from 'react';
import { Link } from 'react-router-dom';
import './RecentRequests.css';
import { updateUserStatus } from '../../../../services/api';
import { getAdminUserName, getAdminUserOrganization, getAdminRoleLabel } from '../../../../utils/adminUserDisplay';
import DocumentsModal from '../userManagement/DocumentsModal';

function formatDate(createdAt) {
    if (!createdAt) return '—';
    const d = new Date(createdAt);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const RecentRequests = ({ users = [], onStatusUpdated }) => {
    const [updatingId, setUpdatingId] = useState(null);
    const [error, setError] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    const handleAdmitAll = async () => {
        if (updatingId || users.length === 0) return;
        if (!window.confirm(`Are you sure you want to approve all ${users.length} pending registration requests?`)) {
            return;
        }
        setUpdatingId('bulk');
        setError(null);
        try {
            // Approve all users in parallel
            await Promise.all(users.map(u => updateUserStatus(u._id, 'completed')));
            onStatusUpdated?.();
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to approve all requests');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleViewDetails = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
    };

    return (
        <div className="recent-requests-container">
            <div className="requests-header">
                <h3>Recent Requests</h3>
                <div className="header-actions">
                    {users.length > 0 && (
                        <button
                            className="admit-all-btn"
                            onClick={handleAdmitAll}
                            disabled={updatingId !== null}
                        >
                            {updatingId === 'bulk' ? 'Admitting All…' : 'Admit All'}
                        </button>
                    )}
                    <Link to="/admin/user-management" className="view-all-btn">View All</Link>
                </div>
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
                                            <span className="user-name">{getAdminUserName(user)}</span>
                                            <span className="user-email">{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="date-cell">{formatDate(user.createdAt)}</td>
                                    <td>
                                        <div className="role-info">
                                            <span className="role-type">{getAdminRoleLabel(user.role)}</span>
                                            <span className="role-org">{getAdminUserOrganization(user)}</span>
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
                                            <button
                                                className="action-btn view"
                                                title="View Details"
                                                onClick={() => handleViewDetails(user)}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <DocumentsModal user={selectedUser} isOpen={isModalOpen} onClose={handleCloseModal} />
        </div>
    );
};

export default RecentRequests;
