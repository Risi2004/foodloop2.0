import { useState, useEffect } from 'react';
import './AdminUserManagement.css';
import { getPendingUsers, updateUserStatus } from '../../../../services/api';
import DocumentsModal from './DocumentsModal';

const RecentRequestsTable = ({ onUserStatusChange }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState({}); // Track which user is being processed
    const [selectedUser, setSelectedUser] = useState(null); // User whose documents to view
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch pending users on component mount
    useEffect(() => {
        fetchPendingUsers();
    }, []);

    const fetchPendingUsers = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await getPendingUsers();
            setRequests(response.users || []);
        } catch (err) {
            console.error('Error fetching pending users:', err);
            // Handle different error types
            let errorMessage = 'Failed to load pending users';
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            } else if (err.response?.status === 401) {
                errorMessage = 'Authentication failed. Please log in again.';
            } else if (err.response?.status === 403) {
                errorMessage = 'Access denied. Admin privileges required.';
            } else if (err.response?.status === 404) {
                errorMessage = 'API endpoint not found. Please check server configuration.';
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId) => {
        try {
            setProcessing({ ...processing, [userId]: true });
            await updateUserStatus(userId, 'completed');
            // Remove approved user from list
            setRequests(requests.filter(req => req._id !== userId));
            // Notify parent to refresh MembersTable
            if (onUserStatusChange) {
                onUserStatusChange();
            }
        } catch (err) {
            console.error('Error approving user:', err);
            alert(err.response?.data?.message || 'Failed to approve user');
        } finally {
            setProcessing({ ...processing, [userId]: false });
        }
    };

    const handleReject = async (userId) => {
        if (!window.confirm('Are you sure you want to reject this user?')) {
            return;
        }
        
        try {
            setProcessing({ ...processing, [userId]: true });
            await updateUserStatus(userId, 'rejected');
            // Remove rejected user from list
            setRequests(requests.filter(req => req._id !== userId));
            // Notify parent to refresh MembersTable
            if (onUserStatusChange) {
                onUserStatusChange();
            }
        } catch (err) {
            console.error('Error rejecting user:', err);
            alert(err.response?.data?.message || 'Failed to reject user');
        } finally {
            setProcessing({ ...processing, [userId]: false });
        }
    };

    // Format date from createdAt
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    // Get user display name based on role
    const getUserName = (user) => {
        if (user.role === 'Donor') {
            if (user.donorType === 'Business') {
                return user.businessName || user.email;
            } else {
                return user.username || user.email;
            }
        } else if (user.role === 'Receiver') {
            return user.receiverName || user.email;
        } else if (user.role === 'Driver') {
            return user.driverName || user.email;
        }
        return user.email;
    };

    // Get organization/sub-role display
    const getOrganization = (user) => {
        if (user.role === 'Donor') {
            return user.donorType || 'Donor';
        } else if (user.role === 'Receiver') {
            return user.receiverType || 'Receiver';
        } else if (user.role === 'Driver') {
            return user.vehicleType || 'Driver';
        }
        return user.role;
    };

    // Handle view documents
    const handleViewDocuments = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
    };

    if (loading) {
        return (
            <div className="recent-requests-section">
                <h2 className="section-title">Recent Request</h2>
                <div style={{ padding: '20px', textAlign: 'center', color: '#a0a0a0' }}>
                    Loading pending users...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="recent-requests-section">
                <h2 className="section-title">Recent Request</h2>
                <div style={{ padding: '20px', textAlign: 'center', color: '#ff6b6b' }}>
                    {error}
                    <button 
                        onClick={fetchPendingUsers}
                        style={{ 
                            marginLeft: '10px', 
                            padding: '5px 10px',
                            background: '#7abfa1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="recent-requests-section">
            <h2 className="section-title">Recent Request</h2>
            {requests.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#a0a0a0' }}>
                    No pending requests
                </div>
            ) : (
                <div className="table-container">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th style={{ width: '30%' }}>USER NAME</th>
                                <th style={{ width: '20%' }}>DATE</th>
                                <th style={{ width: '25%' }}>ROLE</th>
                                <th style={{ width: '25%' }}>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((req) => (
                                <tr key={req._id}>
                                    <td className="user-cell">
                                        <div className="user-name">{getUserName(req)}</div>
                                        <div className="user-email">{req.email}</div>
                                    </td>
                                    <td className="date-cell">{formatDate(req.createdAt)}</td>
                                    <td className="role-cell">
                                        <div className="role-main">{req.role}</div>
                                        <div className="role-sub">{getOrganization(req)}</div>
                                    </td>
                                    <td className="action-cell">
                                        <button 
                                            className="action-btn approve" 
                                            title="Approve"
                                            onClick={() => handleApprove(req._id)}
                                            disabled={processing[req._id]}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </button>
                                        <button 
                                            className="action-btn reject" 
                                            title="Reject"
                                            onClick={() => handleReject(req._id)}
                                            disabled={processing[req._id]}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                        <button 
                                            className="action-btn view" 
                                            title="View Documents"
                                            onClick={() => handleViewDocuments(req)}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <DocumentsModal 
                user={selectedUser} 
                isOpen={isModalOpen} 
                onClose={handleCloseModal} 
            />
        </div>
    );
};

export default RecentRequestsTable;
