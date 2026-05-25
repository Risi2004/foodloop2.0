import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearAuth } from '../../../../utils/auth';
import './VendorSidebar.css';

const VendorSidebar = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        clearAuth();
        navigate('/login');
    };

    return (
        <aside className="vendor-sidebar">
            <div className="vendor-sidebar__header">
                <h2>Seller Portal</h2>
                <p>Manage your storefront</p>
            </div>
            
            <nav className="vendor-sidebar__nav">
                <NavLink 
                    to="/vendor/dashboard" 
                    className={({ isActive }) => isActive ? "vendor-nav-item active" : "vendor-nav-item"}
                >
                    Dashboard
                </NavLink>
                <NavLink 
                    to="/vendor/products" 
                    className={({ isActive }) => isActive ? "vendor-nav-item active" : "vendor-nav-item"}
                >
                    My Products
                </NavLink>
            </nav>

            <div className="vendor-sidebar__footer">
                <button type="button" className="vendor-logout-btn" onClick={handleLogout}>
                    Log Out
                </button>
                <div className="info-card">
                    <h4>Marketplace Tip</h4>
                    <p>Items marked as "Donation" are hidden from the public store and shown only to receivers.</p>
                </div>
            </div>
        </aside>
    );
};

export default VendorSidebar;
