import { Link, useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import './CustomerNavbar.css';
import profile from '../../../../../assets/icons/afterLogin/navbar/profile.svg';
import menu from '../../../../../assets/icons/navbar/menu-bar.svg';
import cartIcon from '../../../../../assets/icons/afterLogin/customer/Marketplace/Shopping cart (1).svg';
import { clearAuth, getUser } from '../../../../../utils/auth';
import { deleteAccount } from '../../../../../services/api';
import NotificationNavLink from '../../../shared/NotificationNavLink';
import { useMarketplace } from '../../../../../contexts/MarketplaceContext';
import { customerRoutes } from '../../../../../constants/customerRoutes';

function CustomerNavbar() {
  const navigate = useNavigate();
  const user = getUser();
  const { cart } = useMarketplace();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  const getUserName = () => {
    if (!user) return 'Customer';
    return user.username || user.email || 'Customer';
  };

  const getProfileImage = () => {
    if (user?.profileImageUrl) return user.profileImageUrl;
    return profile;
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleProfile = () => setIsProfileOpen(!isProfileOpen);

  const handleLogout = () => {
    clearAuth();
    setIsMenuOpen(false);
    setIsProfileOpen(false);
    navigate('/login');
  };

  const openDeleteModal = () => setIsDeleteModalOpen(true);
  const closeDeleteModal = () => {
    if (!deletingAccount) setIsDeleteModalOpen(false);
  };

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
  };

  return (
    <>
      <div className="navbar">
        <div className="navbar__s1">
          <Link to={customerRoutes.marketplace()}>
            <img src="/logo.png" alt="logo" />
          </Link>
          <div className="navbar__s1__sub">
            <h2>
              <span className="navbar__s1__sub__part1">Food</span>
              <span className="navbar__s1__sub__part2">Loop</span>
            </h2>
            <p>Zero Waste. Infinite Impact</p>
          </div>
        </div>

        <div className="navbar__s2">
          <Link to={customerRoutes.marketplace()}>Home</Link>
          <Link to={customerRoutes.about()}>About Us</Link>
          <Link to={customerRoutes.contact()}>Contact Us</Link>
          <Link to={customerRoutes.marketplace()}>Shop</Link>
          <Link to={customerRoutes.orderTracking()}>Order Tracking</Link>
          <Link to={customerRoutes.orderHistory()}>Order History</Link>
          <Link to={customerRoutes.cart()}>Cart</Link>
        </div>

        <div className="navbar__s3">
          <Link to={customerRoutes.cart()} className="navbar__cart-wrap" aria-label="Cart">
            <img src={cartIcon} alt="" />
            {cartCount > 0 && (
              <span className="navbar__cart-badge" aria-label={`${cartCount} in cart`}>
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
          <NotificationNavLink to={customerRoutes.notifications()} />
          <div className="navbar__s3__sub" onClick={toggleProfile}>
            <h3>{getUserName()}</h3>
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
        {isProfileOpen && (
          <div className="navbar__s3__profile__popup">
            <p onClick={toggleProfile}>X</p>
            <Link to={customerRoutes.profile()} onClick={toggleProfile}>
              View Profile
            </Link>
            <div className="navbar__popup__action">
              <button type="button" className="navbar__delete-account-btn" onClick={openDeleteModal}>
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
        )}
      </div>

      <div className="responsive__navbar">
        <div className="responsive__navbar__s1">
          <Link to={customerRoutes.marketplace()}>
            <img src="/logo.png" alt="logo" />
          </Link>
        </div>
        <div className="responsive__navbar__s2">
          <h2>
            <span className="responsive__navbar__s2__part1">Food</span>
            <span className="responsive__navbar__s2__part2">Loop</span>
          </h2>
          <p>Zero Waste. Infinite Impact</p>
        </div>
        <div className="responsive__navbar__s3">
          <Link to={customerRoutes.cart()} className="navbar__cart-wrap" aria-label="Cart">
            <img src={cartIcon} alt="" style={{ width: 28, height: 28 }} />
            {cartCount > 0 && (
              <span className="navbar__cart-badge" aria-label={`${cartCount} in cart`}>
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
          <NotificationNavLink to={customerRoutes.notifications()} imgClassName="" />
          <img src={menu} alt="menu-bar" onClick={toggleMenu} />
        </div>
      </div>

      {isMenuOpen && (
        <div className="responsive__navbar__overlay" onClick={toggleMenu}>
          <div className="responsive__navbar__popup" onClick={(e) => e.stopPropagation()}>
            <Link to={customerRoutes.marketplace()} onClick={toggleMenu}>
              Home
            </Link>
            <Link to={customerRoutes.about()} onClick={toggleMenu}>
              About Us
            </Link>
            <Link to={customerRoutes.contact()} onClick={toggleMenu}>
              Contact Us
            </Link>
            <Link to={customerRoutes.marketplace()} onClick={toggleMenu}>
              Shop
            </Link>
            <Link to={customerRoutes.orderTracking()} onClick={toggleMenu}>
              Order Tracking
            </Link>
            <Link to={customerRoutes.orderHistory()} onClick={toggleMenu}>
              Order History
            </Link>
            <Link to={customerRoutes.cart()} onClick={toggleMenu}>
              Cart
            </Link>
            <Link to={customerRoutes.profile()} onClick={toggleMenu}>
              View Profile
            </Link>
            <div className="navbar__popup__action">
              <button type="button" className="navbar__delete-account-btn" onClick={openDeleteModal}>
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
              <button
                type="button"
                className="navbar__delete-modal__cancel"
                onClick={closeDeleteModal}
                disabled={deletingAccount}
              >
                Cancel
              </button>
              <button
                type="button"
                className="navbar__delete-account-btn"
                onClick={handleConfirmDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CustomerNavbar;
