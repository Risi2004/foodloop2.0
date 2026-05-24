import { useState, useEffect } from 'react';
import './AdminUserManagement.css';
import { getAllUsers, updateUserStatus } from '../../../../services/api';
import DocumentsModal from './DocumentsModal';

const MembersTable = ({ refreshTrigger, searchTerm = '', roleFilter = '', statusFilter = '' }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [processing, setProcessing] = useState({});
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter, statusFilter]);

    useEffect(() => {
        fetchMembers();
    }, [refreshTrigger, currentPage, searchTerm, roleFilter, statusFilter]);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            setError('');
            const filters = {};
            if (searchTerm.trim()) filters.search = searchTerm.trim();
            if (roleFilter) filters.role = roleFilter;
            if (statusFilter) filters.status = statusFilter;
            const response = await getAllUsers(filters);
            
            // Filter to only show completed, rejected, and inactive users (exclude pending)
            const allUsers = response.users || [];
            const filteredUsers = allUsers.filter(user => 
                user.status === 'completed' || user.status === 'rejected' || user.status === 'inactive'
            );
            
            // Sort by updatedAt (most recently updated first)
            filteredUsers.sort((a, b) => {
                const dateA = new Date(a.updatedAt || a.createdAt);
                const dateB = new Date(b.updatedAt || b.createdAt);
                return dateB - dateA;
            });

            // Calculate pagination
            const total = filteredUsers.length;
            const pages = Math.ceil(total / itemsPerPage);
            setTotalPages(pages || 1);

            // Apply pagination
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

            setMembers(paginatedUsers);
        } catch (err) {
            console.error('Error fetching members:', err);
            let errorMessage = 'Failed to load members';
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
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

    // Get sub-role/organization display
    const getSubRole = (user) => {
        if (user.role === 'Donor') {
            return user.donorType || '';
        } else if (user.role === 'Receiver') {
            return user.receiverType || '';
        } else if (user.role === 'Driver') {
            return user.vehicleType || '';
        }
        return '';
    };

    // Map status from backend to display
    const getDisplayStatus = (status) => {
        if (status === 'completed') {
            return 'Verified';
        } else if (status === 'rejected') {
            return 'Rejected';
        } else if (status === 'inactive') {
            return 'Inactive';
        }
        return status;
    };

    // Handle deactivate user
    const handleDeactivate = async (userId) => {
        if (!window.confirm('Are you sure you want to deactivate this user? They will receive an email notification.')) {
            return;
        }
        
        try {
            setProcessing({ ...processing, [userId]: true });
            console.log('Deactivating user:', userId, 'with status: inactive');
            await updateUserStatus(userId, 'inactive');
            // Refresh the members list
            await fetchMembers();
        } catch (err) {
            console.error('Error deactivating user:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to deactivate user';
            alert(errorMessage);
        } finally {
            setProcessing({ ...processing, [userId]: false });
        }
    };

    // Handle activate user
    const handleActivate = async (userId) => {
        if (!window.confirm('Are you sure you want to activate this user? They will receive an email notification.')) {
            return;
        }
        
        try {
            setProcessing({ ...processing, [userId]: true });
            console.log('Activating user:', userId, 'with status: completed');
            await updateUserStatus(userId, 'completed');
            // Refresh the members list
            await fetchMembers();
        } catch (err) {
            console.error('Error activating user:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to activate user';
            alert(errorMessage);
        } finally {
            setProcessing({ ...processing, [userId]: false });
        }
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

    // Handle pagination
    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 3; i++) {
                    pages.push(i);
                }
                pages.push('ellipsis');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('ellipsis');
                for (let i = totalPages - 2; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('ellipsis');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push('ellipsis');
                pages.push(totalPages);
            }
        }
        
        return pages;
    };

    if (loading && members.length === 0) {
        return (
            <div className="members-section">
                <h2 className="section-title">Member</h2>
                <div style={{ padding: '20px', textAlign: 'center', color: '#a0a0a0' }}>
                    Loading members...
                </div>
            </div>
        );
    }

    if (error && members.length === 0) {
        return (
            <div className="members-section">
                <h2 className="section-title">Member</h2>
                <div style={{ padding: '20px', textAlign: 'center', color: '#ff6b6b' }}>
                    {error}
                    <button 
                        onClick={fetchMembers}
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
        <div className="members-section">
            <h2 className="section-title">Member</h2>
            {members.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#a0a0a0' }}>
                    No members found
                </div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '25%' }}>USER NAME</th>
                                    <th style={{ width: '20%' }}>ROLE</th>
                                    <th style={{ width: '15%' }}>DETAILS</th>
                                    <th style={{ width: '15%' }}>STATUS</th>
                                    <th style={{ width: '25%' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((member) => {
                                    const displayStatus = getDisplayStatus(member.status);
                                    const isActive = member.status === 'completed';
                                    
                                    return (
                                        <tr key={member._id}>
                                            <td className="user-cell">
                                                <div className="user-name">{getUserName(member)}</div>
                                                <div className="user-email">{member.email}</div>
                                            </td>
                                            <td className="role-cell">
                                                <div className="role-main">{member.role}</div>
                                                {getSubRole(member) && (
                                                    <div className="role-sub">{getSubRole(member)}</div>
                                                )}
                                            </td>
                                            <td className="details-cell">
                                                <div 
                                                    className="file-icon"
                                                    onClick={() => handleViewDocuments(member)}
                                                    title="View Documents"
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-archive">
                                                        <path d="M4 22V4c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                                                        <path d="M10 2v2" />
                                                        <path d="M10 8v2" />
                                                        <path d="M10 14v2" />
                                                        <path d="M10 20v2" />
                                                        <path d="M14 2v2" />
                                                        <path d="M14 8v2" />
                                                        <path d="M14 14v2" />
                                                        <path d="M14 20v2" />
                                                        <path d="M4 2v20" />
                                                    </svg>
                                                </div>
                                            </td>
                                            <td className="status-cell">
                                                <span className={`status-badge ${displayStatus.toLowerCase()}`}>
                                                    <span className="status-dot"></span>
                                                    {displayStatus}
                                                </span>
                                            </td>
                                            <td className="action-cell">
                                                {isActive ? (
                                                    <button 
                                                        className="action-btn-long deactivate"
                                                        onClick={() => handleDeactivate(member._id)}
                                                        disabled={processing[member._id]}
                                                    >
                                                        Deactivate
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
                                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                                        </svg>
                                                    </button>
                                                ) : (
                                                    <button 
                                                        className="action-btn-long activate"
                                                        onClick={() => handleActivate(member._id)}
                                                        disabled={processing[member._id]}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="btn-icon check">
                                                            <polyline points="20 6 9 17 4 12"></polyline>
                                                        </svg>
                                                        Activate
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button 
                                className="page-nav prev" 
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                &lt;
                            </button>
                            {getPageNumbers().map((page, index) => {
                                if (page === 'ellipsis') {
                                    return (
                                        <span key={`ellipsis-${index}`} className="page-ellipsis">
                                            ...
                                        </span>
                                    );
                                }
                                return (
                                    <button
                                        key={page}
                                        className={`page-num ${currentPage === page ? 'active' : ''}`}
                                        onClick={() => handlePageChange(page)}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                            <button 
                                className="page-nav next" 
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                &gt;
                            </button>
                        </div>
                    )}
                </>
            )}
            <DocumentsModal 
                user={selectedUser} 
                isOpen={isModalOpen} 
                onClose={handleCloseModal} 
            />
        </div>
    );
};

export default MembersTable;
