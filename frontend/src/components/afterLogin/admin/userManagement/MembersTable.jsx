import { useState, useEffect } from 'react';
import './AdminUserManagement.css';
import { getAllUsers, updateUserStatus } from '../../../../services/api';
import { getAdminUserName, getAdminUserOrganization, getAdminRoleLabel } from '../../../../utils/adminUserDisplay';
import DocumentsModal from './DocumentsModal';

const itemsPerPage = 10;

function formatDate(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function getDisplayStatus(status) {
    const map = {
        completed: 'Active',
        pending: 'Pending approval',
        unverified: 'Email pending',
        rejected: 'Rejected',
        inactive: 'Inactive',
    };
    return map[status] || status || '—';
}

function statusBadgeClass(status) {
    if (status === 'completed') return 'verified';
    if (status === 'pending') return 'pending';
    if (status === 'unverified') return 'unverified';
    if (status === 'rejected') return 'rejected';
    if (status === 'inactive') return 'inactive';
    return '';
}

const MembersTable = ({ refreshTrigger, searchTerm = '', roleFilter = '', statusFilter = '' }) => {
    const [members, setMembers] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [processing, setProcessing] = useState({});

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
            const allUsers = response.users || [];
            setTotalCount(allUsers.length);

            allUsers.sort((a, b) => {
                const dateA = new Date(a.updatedAt || a.createdAt);
                const dateB = new Date(b.updatedAt || b.createdAt);
                return dateB - dateA;
            });

            const pages = Math.ceil(allUsers.length / itemsPerPage) || 1;
            setTotalPages(pages);

            const startIndex = (currentPage - 1) * itemsPerPage;
            const paginatedUsers = allUsers.slice(startIndex, startIndex + itemsPerPage);
            setMembers(paginatedUsers);
        } catch (err) {
            console.error('Error fetching members:', err);
            setError(err.response?.data?.message || err.message || 'Failed to load members');
            setMembers([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivate = async (userId) => {
        if (!window.confirm('Deactivate this user? They will not be able to log in.')) return;
        try {
            setProcessing((p) => ({ ...p, [userId]: true }));
            await updateUserStatus(userId, 'inactive');
            await fetchMembers();
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to deactivate user');
        } finally {
            setProcessing((p) => ({ ...p, [userId]: false }));
        }
    };

    const handleActivate = async (userId) => {
        if (!window.confirm('Activate this user? They will be able to log in.')) return;
        try {
            setProcessing((p) => ({ ...p, [userId]: true }));
            await updateUserStatus(userId, 'completed');
            await fetchMembers();
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to activate user');
        } finally {
            setProcessing((p) => ({ ...p, [userId]: false }));
        }
    };

    const handleViewDocuments = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (currentPage <= 3) {
            for (let i = 1; i <= 3; i++) pages.push(i);
            pages.push('ellipsis', totalPages);
        } else if (currentPage >= totalPages - 2) {
            pages.push(1, 'ellipsis');
            for (let i = totalPages - 2; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
        }
        return pages;
    };

    if (loading && members.length === 0) {
        return (
            <div className="members-section">
                <h2 className="section-title">Members</h2>
                <div style={{ padding: '20px', textAlign: 'center', color: '#a0a0a0' }}>Loading members...</div>
            </div>
        );
    }

    if (error && members.length === 0) {
        return (
            <div className="members-section">
                <h2 className="section-title">Members</h2>
                <div style={{ padding: '20px', textAlign: 'center', color: '#ff6b6b' }}>
                    {error}
                    <button type="button" onClick={fetchMembers} className="retry-btn-inline">Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="members-section">
            <h2 className="section-title">Members</h2>
            <p className="members-count">{totalCount} member{totalCount !== 1 ? 's' : ''} total</p>

            {members.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#a0a0a0' }}>No members match your search or filters</div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="custom-table members-table-wide">
                            <thead>
                                <tr>
                                    <th>NAME / EMAIL</th>
                                    <th>CONTACT</th>
                                    <th>ROLE</th>
                                    <th>ADDRESS</th>
                                    <th>REGISTERED</th>
                                    <th>STATUS</th>
                                    <th className="docs-col">DOCS</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((member) => {
                                    const status = member.status || member.accountStatus;
                                    const displayStatus = getDisplayStatus(status);
                                    const badgeClass = statusBadgeClass(status);
                                    const isActive = status === 'completed';
                                    const canToggleActive = status === 'completed' || status === 'inactive';

                                    return (
                                        <tr key={member._id || member.id}>
                                            <td className="user-cell">
                                                <div className="user-name">{getAdminUserName(member)}</div>
                                                <div className="user-email">{member.email}</div>
                                            </td>
                                            <td className="details-text">{member.contactNo || '—'}</td>
                                            <td className="role-cell">
                                                <div className="role-main">{getAdminRoleLabel(member.role)}</div>
                                                <div className="role-sub">{getAdminUserOrganization(member)}</div>
                                            </td>
                                            <td className="details-text" title={member.address}>
                                                {member.address
                                                    ? member.address.length > 40
                                                        ? `${member.address.slice(0, 40)}…`
                                                        : member.address
                                                    : '—'}
                                            </td>
                                            <td className="date-cell">{formatDate(member.createdAt)}</td>
                                            <td className="status-cell">
                                                <span className={`status-badge ${badgeClass}`}>
                                                    <span className="status-dot" />
                                                    {displayStatus}
                                                </span>
                                            </td>
                                            <td className="docs-cell">
                                                <button
                                                    type="button"
                                                    className="action-btn view"
                                                    title="View documents"
                                                    onClick={() => handleViewDocuments(member)}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                        <circle cx="12" cy="12" r="3" />
                                                    </svg>
                                                </button>
                                            </td>
                                            <td className="action-cell">
                                                <div className="action-cell-inner">
                                                    {canToggleActive && (
                                                        isActive ? (
                                                            <button
                                                                type="button"
                                                                className="action-btn-long deactivate"
                                                                onClick={() => handleDeactivate(member._id)}
                                                                disabled={processing[member._id]}
                                                            >
                                                                Deactivate
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="action-btn-long activate"
                                                                onClick={() => handleActivate(member._id)}
                                                                disabled={processing[member._id]}
                                                            >
                                                                Activate
                                                            </button>
                                                        )
                                                    )}
                                                    {status === 'pending' && (
                                                        <span className="details-text muted">Use Recent Requests</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                type="button"
                                className="page-nav prev"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                &lt;
                            </button>
                            {getPageNumbers().map((page, index) =>
                                page === 'ellipsis' ? (
                                    <span key={`ellipsis-${index}`} className="page-ellipsis">...</span>
                                ) : (
                                    <button
                                        key={page}
                                        type="button"
                                        className={`page-num ${currentPage === page ? 'active' : ''}`}
                                        onClick={() => handlePageChange(page)}
                                    >
                                        {page}
                                    </button>
                                )
                            )}
                            <button
                                type="button"
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

            <DocumentsModal user={selectedUser} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};

export default MembersTable;
