import { Link, useNavigate } from 'react-router-dom';
import dashboardIcon from "../../../../assets/icons/afterLogin/admin/dashboard.svg";
import managementIcon from "../../../../assets/icons/afterLogin/admin/management.svg";
import notificationIcon from "../../../../assets/icons/afterLogin/admin/notifications.svg";
import reviewIcon from "../../../../assets/icons/afterLogin/admin/review.svg";
import messageIcon from "../../../../assets/icons/afterLogin/admin/messages.svg"
import menuIcon from "../../../../assets/icons/navbar/menu-bar.svg";
import { useState } from 'react';
import './AdminSideNavbar.css'
import { clearAuth } from "../../../../utils/auth";

function AdminSideNavbar() {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleLogout = () => {
        clearAuth();
        setIsMenuOpen(false);
        navigate('/login');
    };

    return (
        <>
            <div className='sidebar'>
                <img src="/logo.png" alt="" /> <br />
                <h1><span className='sidebar__s1__sub1'>Food</span><span className='sidebar__s1__sub2'>Loop</span></h1>
                <p>Zero Waste. Infinite Impact</p>
                <div className='sidebar__s2'>
                    <div className='sidebar__links'>
                        <img src={dashboardIcon} alt="" />
                        <Link to="/admin/dashboard">Dashboard Overview</Link>
                    </div>
                    <div className='sidebar__links'>
                        <img src={managementIcon} alt="" />
                        <Link to="/admin/user-management">User Management</Link>
                    </div>
                    <div className='sidebar__links'>
                        <img src={notificationIcon} alt="" />
                        <Link to="/admin/notification">Notification</Link>
                    </div>
                    <div className='sidebar__links'>
                        <img src={reviewIcon} alt="" />
                        <Link to="/admin/reviews">Reviews</Link>
                    </div>
                    <div className='sidebar__links'>
                        <img src={messageIcon} alt="" />
                        <Link to="/admin/messages">Messages</Link>
                    </div>
                </div>
                <button onClick={handleLogout}>Log Out</button>
            </div>

            <div className='responsive__side__navbar'>
                <div className='responsive__side__navbar__s1'>
                    <img className='responsive__side__navbar__logo' src="/logo.png" alt="Logo" />
                    <div className="responsive__title">
                        <h1><span className='sidebar__s1__sub1'>Food</span><span className='sidebar__s1__sub2'>Loop</span></h1>
                    </div>
                </div>
                <img src={menuIcon} alt="Menu" onClick={toggleMenu} className="menu-icon" />
            </div>

            {isMenuOpen && (
                <div className="responsive__navbar__popup">
                    <p onClick={toggleMenu}>X</p>
                    <Link to="/admin/dashboard" onClick={toggleMenu}>Dashboard Overview</Link>
                    <Link to="/admin/user-management" onClick={toggleMenu}>User Management</Link>
                    <Link to="/admin/notification" onClick={toggleMenu}>Notification</Link>
                    <Link to="/admin/reviews" onClick={toggleMenu}>Reviews</Link>
                    <Link to="/admin/messages" onClick={toggleMenu}>Messages</Link>
                    <Link to="" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                        <button>Log Out</button>
                    </Link>
                </div>
            )}

        </>
    )
}

export default AdminSideNavbar;