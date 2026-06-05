import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from 'react';
import "./DriverNavbar.css"
import profile from "../../../../../assets/icons/afterLogin/navbar/profile.svg"
import menu from "../../../../../assets/icons/navbar/menu-bar.svg"
import { clearAuth, getUser } from "../../../../../utils/auth";
import { deleteAccount } from "../../../../../services/api";
import NotificationNavLink from "../../../shared/NotificationNavLink";
function Navbar() {
    const navigate = useNavigate();
    const user = getUser();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isInstallable, setIsInstallable] = useState(!!window.deferredPWAInstallPrompt);

    useEffect(() => {
        const handleInstallable = () => setIsInstallable(true);
        window.addEventListener('pwa-installable', handleInstallable);
        return () => window.removeEventListener('pwa-installable', handleInstallable);
    }, []);

    const handleInstallApp = async () => {
        const promptEvent = window.deferredPWAInstallPrompt;
        if (!promptEvent) return;
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted PWA installation');
        }
        window.deferredPWAInstallPrompt = null;
        setIsInstallable(false);
    };

    // Get user display name
    const getUserName = () => {
        if (!user) return 'User_Name';
        if (user.role === 'Driver') {
            return user.driverName || user.email;
        }
        return user.email;
    };
    
    // Get profile image URL or default icon
    const getProfileImage = () => {
        if (user && user.profileImageUrl) {
            return user.profileImageUrl;
        }
        return profile;
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    // When responsive menu is open, add body class and lock scroll
    useEffect(() => {
        if (!isMenuOpen) {
            document.body.classList.remove('driver-navbar-menu-open');
            document.body.style.overflow = '';
            return;
        }

        document.body.classList.add('driver-navbar-menu-open');
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.classList.remove('driver-navbar-menu-open');
            document.body.style.overflow = previousOverflow;
        };
    }, [isMenuOpen]);


    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);

    const toggleProfile = () => {
        setIsProfileOpen(!isProfileOpen)
    }

    const handleLogout = () => {
        clearAuth();
        setIsMenuOpen(false);
        setIsProfileOpen(false);
        navigate('/login');
    }

    const openDeleteModal = () => {
        setIsDeleteModalOpen(true);
    }

    const closeDeleteModal = () => {
        if (!deletingAccount) setIsDeleteModalOpen(false);
    }

    const handleConfirmDeleteAccount = async () => {
        if (deletingAccount) return;
        setDeletingAccount(true);
        try {
            await deleteAccount();
            clearAuth();
            setIsMenuOpen(false);
            setIsProfileOpen(false);
            setIsDeleteModalOpen(false);
            navigate('/login');
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to delete account.');
        } finally {
            setDeletingAccount(false);
        }
    }

    const handleContactClick = () => {
        if (window.location.pathname === '/driver/dashboard') {
            const el = document.getElementById('contact');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleMobileContactClick = () => {
        toggleMenu();
        if (window.location.pathname === '/driver/dashboard') {
            setTimeout(() => {
                const el = document.getElementById('contact');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
        }
    };

    return (
        <>
            <div className="navbar">
                <div className="navbar__s1">
                    <img src="/logo.png" alt="logo" />
                    <div className="navbar__s1__sub">
                        <h2> <span className="navbar__s1__sub__part1">Food</span><span className="navbar__s1__sub__part2">Loop</span></h2>
                        <p>Zero Waste. Infinite Impact</p>
                    </div>
                </div>

                <div className="navbar__s2">
                    <Link to="/driver/dashboard">Home</Link>
                    <Link to="/driver/about">About Us</Link>
                    <Link to="/driver/dashboard#contact" onClick={handleContactClick}>Contact Us</Link>
                    <Link to="/driver/delivery">Delivery</Link>
                    <Link to="/driver/my-pickups">My Pickups</Link>
                    <Link to="/driver/earnings">Earnings</Link>
                </div>

                <div className="navbar__s3">
                    <NotificationNavLink to="/driver/notifications" />
                    <div className="navbar__s3__sub" onClick={toggleProfile}>
                        <h3>{getUserName()}</h3>
                        <div className="navbar__profile-wrap">
                            <img 
                                className="navbar__s3__img2" 
                                src={getProfileImage()} 
                                alt="profile-icon"
                                onError={(e) => {
                                    e.target.src = profile;
                                }}
                            />
                        </div>
                    </div>
                </div>
                {isProfileOpen && (
                    <div className="navbar__s3__profile__popup">
                        <p onClick={toggleProfile}>X</p>
                        <Link to="/driver/profile" onClick={toggleProfile}>View Profile</Link>
                        {isInstallable && (
                            <Link to="" className="responsive__navbar__popup__install" onClick={(e) => { e.preventDefault(); handleInstallApp(); toggleProfile(); }}>
                                Install App
                            </Link>
                        )}
                        <div className="navbar__popup__action">
                            <button type="button" className="navbar__delete-account-btn" onClick={openDeleteModal}>
                                Delete Account
                            </button>
                        </div>
                        <Link to="" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                            <button>Sign Out</button>
                        </Link>
                    </div>
                )}
            </div>

            <div className="responsive__navbar">
                <div className="responsive__navbar__s1">
                    <img src="/logo.png" alt="logo" />
                </div>
                <div className="responsive__navbar__s2">
                    <h2> <span className="responsive__navbar__s2__part1">Food</span><span className="responsive__navbar__s2__part2">Loop</span></h2>
                    <p>Zero Waste. Infinite Impact</p>
                </div>
                <div className="responsive__navbar__s3">
                    <NotificationNavLink to="/driver/notifications" imgClassName="" />
                    <img src={menu} alt="menu-bar" onClick={toggleMenu} />
                </div>
            </div>

            {isMenuOpen && (
                <div className="responsive__navbar__overlay" onClick={toggleMenu}>
                    <div
                        className="responsive__navbar__popup"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Link to="/driver/dashboard" onClick={toggleMenu}>Home</Link>
                        <Link to="/driver/about" onClick={toggleMenu}>About Us</Link>
                        <Link to="/driver/dashboard#contact" onClick={handleMobileContactClick}>Contact Us</Link>
                        <Link to="/driver/delivery" onClick={toggleMenu}>Delivery</Link>
                        <Link to="/driver/my-pickups" onClick={toggleMenu}>My Pickups</Link>
                        <Link to="/driver/earnings" onClick={toggleMenu}>Earnings</Link>
                        <Link to="/driver/profile" onClick={toggleMenu}>View Profile</Link>
                        {isInstallable && (
                            <Link to="" className="responsive__navbar__popup__install" onClick={(e) => { e.preventDefault(); handleInstallApp(); toggleMenu(); }}>
                                Install App
                            </Link>
                        )}
                        <div className="navbar__popup__action">
                            <button
                                type="button"
                                className="navbar__delete-account-btn"
                                onClick={openDeleteModal}
                            >
                                Delete Account
                            </button>
                        </div>
                        <Link
                            to=""
                            onClick={(e) => {
                                e.preventDefault();
                                handleLogout();
                            }}
                        >
                            <button>Sign Out</button>
                        </Link>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="navbar__delete-modal-overlay" onClick={closeDeleteModal}>
                    <div className="navbar__delete-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Delete Account</h3>
                        <p>Are you sure? This will permanently delete your account and all related data.</p>
                        <div className="navbar__delete-modal__actions">
                            <button type="button" className="navbar__delete-modal__cancel" onClick={closeDeleteModal} disabled={deletingAccount}>
                                Cancel
                            </button>
                            <button type="button" className="navbar__delete-account-btn" onClick={handleConfirmDeleteAccount} disabled={deletingAccount}>
                                {deletingAccount ? 'Deleting...' : 'Delete Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Navbar