import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from 'react';
import "./ReceiverNavbar.css"
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
        if (user.role === 'Receiver') {
            return user.receiverName || user.email;
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

    // Lock background scroll when responsive menu is open
    useEffect(() => {
        if (!isMenuOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
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
        if (window.location.pathname === '/receiver/dashboard') {
            const el = document.getElementById('contact');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleMobileContactClick = () => {
        toggleMenu();
        if (window.location.pathname === '/receiver/dashboard') {
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
                    <Link to="/receiver/dashboard">Home</Link>
                    <Link to="/receiver/about">About Us</Link>
                    <Link to="/receiver/dashboard#contact" onClick={handleContactClick}>Contact Us</Link>
                    <Link to="/receiver/find-food">Find Food</Link>
                    <Link to="/receiver/my-claims">My Claims</Link>
                </div>

                <div className="navbar__s3">
                    <NotificationNavLink to="/receiver/notifications" />
                    <div className="navbar__s3__sub" onClick={toggleProfile}>
                        <h3>{getUserName()}</h3>
                        <img 
                            className="navbar__s3__img2" 
                            src={getProfileImage()} 
                            alt="profile-icon"
                            onError={(e) => {
                                // Fallback to default icon if image fails to load
                                e.target.src = profile;
                            }}
                        />
                    </div>
                </div>
                {isProfileOpen && (
                    <div className="navbar__s3__profile__popup">
                        <p onClick={toggleProfile}>X</p>
                        <Link to="/receiver/profile" onClick={toggleProfile}>View Profile</Link>
                        {isInstallable && (
                            <Link to="" onClick={(e) => { e.preventDefault(); handleInstallApp(); toggleProfile(); }}>
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
                    <NotificationNavLink to="/receiver/notifications" imgClassName="" />
                    <img src={menu} alt="menu-bar" onClick={toggleMenu} />
                </div>
            </div>

            {isMenuOpen && (
                <div className="responsive__navbar__overlay" onClick={toggleMenu}>
                    <div
                        className="responsive__navbar__popup"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Link to="/receiver/dashboard" onClick={toggleMenu}>Home</Link>
                        <Link to="/receiver/about" onClick={toggleMenu}>About Us</Link>
                        <Link to="/receiver/dashboard#contact" onClick={handleMobileContactClick}>Contact Us</Link>
                        <Link to="/receiver/find-food" onClick={toggleMenu}>Find Food</Link>
                        <Link to="/receiver/my-claims" onClick={toggleMenu}>My Claims</Link>
                        <Link to="/receiver/profile" onClick={toggleMenu}>View Profile</Link>
                        {isInstallable && (
                            <Link to="" onClick={(e) => { e.preventDefault(); handleInstallApp(); toggleMenu(); }}>
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