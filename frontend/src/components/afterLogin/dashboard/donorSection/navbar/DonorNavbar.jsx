import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from 'react';
import "./DonorNavbar.css"
import notification from "../../../../../assets/icons/afterLogin/navbar/notification.svg"
import profile from "../../../../../assets/icons/afterLogin/navbar/profile.svg"
import menu from "../../../../../assets/icons/navbar/menu-bar.svg"
import { clearAuth, getUser, setUser, getDonorDisplayName, getUserProfileImageUrl } from "../../../../../utils/auth";
import { getUnreadCount, NOTIFICATIONS_READ_EVENT } from "../../../../../services/notificationApi";
import { getSocket, onNewNotification } from "../../../../../services/socket";
import { deleteAccount, getCurrentUser } from "../../../../../services/api";

function Navbar() {
    const navigate = useNavigate();
    const [user, setUserState] = useState(() => getUser());
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [avatarError, setAvatarError] = useState(false);

    const profileImageUrl = getUserProfileImageUrl(user);
    const showProfilePhoto = Boolean(profileImageUrl) && !avatarError;

    useEffect(() => {
        setAvatarError(false);
    }, [profileImageUrl]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await getCurrentUser();
                if (!cancelled && res?.user) {
                    setUser(res.user);
                    setUserState(res.user);
                }
            } catch (_) {
                /* keep localStorage user */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await getUnreadCount();
                setUnreadCount(res.unreadCount ?? 0);
            } catch (_) {
                setUnreadCount(0);
            }
        };
        fetchCount();
        getSocket();
        const onRead = () => fetchCount();
        window.addEventListener(NOTIFICATIONS_READ_EVENT, onRead);
        const unsubNewNotification = onNewNotification(() => fetchCount());
        return () => {
            window.removeEventListener(NOTIFICATIONS_READ_EVENT, onRead);
            unsubNewNotification();
        };
    }, []);
    
    const displayName = getDonorDisplayName(user);

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
                    <Link to="/donor/dashboard">Home</Link>
                    <Link to="/donor/about">About Us</Link>
                    <Link to="/donor/dashboard#contact">Contact Us</Link>
                    <Link to="/donor/my-donation">My Donation</Link>
                </div>

                <div className="navbar__s3">
                    <Link to="/donor/notifications" className="navbar__notification-wrap">
                        <img className="navbar__s3__img1" src={notification} alt="notification-icon" />
                        {unreadCount > 0 && (
                            <span className="navbar__notification-badge" aria-label={`${unreadCount} unread`}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                        )}
                    </Link>
                    <div className="navbar__s3__sub" onClick={toggleProfile}>
                        <h3>{displayName}</h3>
                        <div className="navbar__profile-wrap">
                            {showProfilePhoto ? (
                                <img
                                    className="navbar__s3__img2 navbar__s3__img2--photo"
                                    src={profileImageUrl}
                                    alt=""
                                    onError={() => setAvatarError(true)}
                                />
                            ) : (
                                <img
                                    className="navbar__s3__img2 navbar__s3__img2--placeholder"
                                    src={profile}
                                    alt=""
                                />
                            )}
                        </div>
                    </div>
                </div>
                {isProfileOpen && (
                    <div className="navbar__s3__profile__popup">
                        <p onClick={toggleProfile}>X</p>
                        <Link to="/donor/profile" onClick={toggleProfile}>View Profile</Link>
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
                    <Link to="/donor/notifications" className="navbar__notification-wrap">
                        <img src={notification} alt="notification-icon" />
                        {unreadCount > 0 && (
                            <span className="navbar__notification-badge" aria-label={`${unreadCount} unread`}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                        )}
                    </Link>
                    <img src={menu} alt="menu-bar" onClick={toggleMenu} />
                </div>
            </div>

            {isMenuOpen && (
                <div className="responsive__navbar__overlay" onClick={toggleMenu}>
                    <div
                        className="responsive__navbar__popup"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Link to="/donor/dashboard" onClick={toggleMenu}>Home</Link>
                        <Link to="/donor/about" onClick={toggleMenu}>About Us</Link>
                        <Link to="/donor/dashboard#contact" onClick={toggleMenu}>Contact Us</Link>
                        <Link to="/donor/my-donation" onClick={toggleMenu}>My Donation</Link>
                        <Link to="/donor/profile" onClick={toggleMenu}>View Profile</Link>
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