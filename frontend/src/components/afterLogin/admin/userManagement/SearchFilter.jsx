import { useState, useRef, useEffect } from 'react';
import './AdminUserManagement.css';

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'Donor', label: 'Donor' },
  { value: 'Receiver', label: 'Receiver' },
  { value: 'Driver', label: 'Driver' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'completed', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'inactive', label: 'Inactive' },
];

const SearchFilter = ({ searchValue = '', onSearchChange, filterValues = {}, onFilterChange }) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  const role = filterValues.role ?? '';
  const status = filterValues.status ?? '';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleChange = (e) => {
    onFilterChange?.({ role: e.target.value, status });
  };

  const handleStatusChange = (e) => {
    onFilterChange?.({ role, status: e.target.value });
  };

  const hasActiveFilters = role || status;

  return (
    <div className="search-filter-container">
      <div className="search-bar">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          placeholder="Search by name, organization, or email..."
          className="search-input"
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      </div>
      <div className="filter-wrapper" ref={filterRef}>
        <button
          type="button"
          className={`filter-button ${filterOpen ? 'active' : ''} ${hasActiveFilters ? 'has-filters' : ''}`}
          onClick={() => setFilterOpen((prev) => !prev)}
          aria-expanded={filterOpen}
        >
          Filter
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="filter-icon">
            <line x1="4" y1="21" x2="4" y2="14"></line>
            <line x1="4" y1="10" x2="4" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12" y2="3"></line>
            <line x1="20" y1="21" x2="20" y2="16"></line>
            <line x1="20" y1="12" x2="20" y2="3"></line>
            <line x1="1" y1="14" x2="7" y2="14"></line>
            <line x1="9" y1="8" x2="15" y2="8"></line>
            <line x1="17" y1="16" x2="23" y2="16"></line>
          </svg>
          {hasActiveFilters && <span className="filter-badge" />}
        </button>
        {filterOpen && (
          <div className="filter-dropdown">
            <div className="filter-dropdown-row">
              <label htmlFor="filter-role">Role</label>
              <select id="filter-role" value={role} onChange={handleRoleChange} className="filter-select">
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="filter-dropdown-row">
              <label htmlFor="filter-status">Status</label>
              <select id="filter-status" value={status} onChange={handleStatusChange} className="filter-select">
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchFilter;
