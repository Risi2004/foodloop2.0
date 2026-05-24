import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMarketplace } from '../../../../contexts/MarketplaceContext';
import { getUser, clearAuth } from '../../../../utils/auth';
import './CustomerNavbar.css';

// SVG Icons
import cartIcon from '../../../../assets/icons/afterLogin/customer/Marketplace/Shopping cart (1).svg';
import profileIcon from '../../../../assets/icons/afterLogin/customer/Marketplace/profile.svg';

const CustomerNavbar = ({ showSearch = true }) => {
    const { cart } = useMarketplace();
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const user = getUser();
    
    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    const handleLogout = () => {
        clearAuth();
        navigate('/login');
    };

    return (
        <nav className="customer-navbar">
            <div className="customer-navbar__brand">
                <Link to="/customer/marketplace" className="brand__logo">
                    <img src="/logo.png" alt="FoodLoop Logo" />
                    <div className="brand__text">
                        <h2><span className="brand__green">Food</span><span className="brand__leaf">Loop</span></h2>
                        <p>Marketplace</p>
                    </div>
                </Link>
            </div>
            {showSearch && (
                <div className="customer-navbar__search">
                    <input type="text" placeholder="Search for food, groceries..." />
                    <button>Search</button>
                </div>
            )}
            <div className="customer-navbar__actions">
                <Link to="/customer/cart" className="cart-link">
                    <img src={cartIcon} alt="Cart" className="nav-icon" />
                    <span>Cart</span>
                    {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                </Link>
                
                <div 
                    className="profile-dropdown-container"
                    onMouseEnter={() => setIsDropdownOpen(true)}
                    onMouseLeave={() => setIsDropdownOpen(false)}
                >
                    <div className={`profile-btn ${isDropdownOpen ? 'active' : ''}`}>
                        <img src={profileIcon} alt="Profile" className="nav-icon" />
                        <span>{user?.username || 'Profile'}</span>
                    </div>

                    {isDropdownOpen && (
                        <div className="profile-dropdown-menu">
                            <div className="dropdown-user-info">
                                <p className="user-name">{user?.username}</p>
                                <p className="user-email">{user?.email}</p>
                            </div>
                            <hr />
                            <Link to="/customer/profile" className="dropdown-item">My Profile</Link>
                            <Link to="/#about" className="dropdown-item">About Us</Link>
                            <hr />
                            <button onClick={handleLogout} className="dropdown-item logout-btn">
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default CustomerNavbar;
