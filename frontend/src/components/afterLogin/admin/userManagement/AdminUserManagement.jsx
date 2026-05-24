import { useState, useEffect } from 'react';
import RecentRequestsTable from './RecentRequestsTable';
import MembersTable from './MembersTable';
import SearchFilter from './SearchFilter';
import './AdminUserManagement.css';

const SEARCH_DEBOUNCE_MS = 300;

const AdminUserManagement = () => {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchDebounced, setSearchDebounced] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        const t = setTimeout(() => setSearchDebounced(searchTerm), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [searchTerm]);

    const handleUserStatusChange = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const handleFilterChange = ({ role, status }) => {
        setRoleFilter(role ?? '');
        setStatusFilter(status ?? '');
    };

    return (
        <div className="user-manage-page">
            <div className="page-header">
                <h1>User Management</h1>
                <p>Manage, verify, and monitor all ecosystem participants from a central hub.</p>
            </div>

            <RecentRequestsTable onUserStatusChange={handleUserStatusChange} />

            <SearchFilter
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                filterValues={{ role: roleFilter, status: statusFilter }}
                onFilterChange={handleFilterChange}
            />

            <MembersTable
                refreshTrigger={refreshTrigger}
                searchTerm={searchDebounced}
                roleFilter={roleFilter}
                statusFilter={statusFilter}
            />
        </div>
    );
};

export default AdminUserManagement;
