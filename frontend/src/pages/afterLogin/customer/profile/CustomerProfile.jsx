import React from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerNavbar from '../../../../components/afterLogin/customer/navbar/CustomerNavbar';
import Footer from '../../../../components/beforeLogin/footer/Footer';
import { getUser } from '../../../../utils/auth';
import './CustomerProfile.css';

// Icons
import statsIcon from '../../../../assets/icons/afterLogin/customer/profilePage/statsss.svg';
import favIcon from '../../../../assets/icons/afterLogin/customer/profilePage/favourite.svg';
import calendarIcon from '../../../../assets/icons/afterLogin/customer/profilePage/Calendar.svg';
import trackIcon from '../../../../assets/icons/afterLogin/receiver/Delivery Scooter.svg';
import editIcon from '../../../../assets/icons/afterLogin/navbar/profile.svg';
import ordersIcon from '../../../../assets/icons/afterLogin/receiver/Receipt.svg';

const CustomerProfile = () => {
    const navigate = useNavigate();
    const user = getUser();

    const stats = [
        { label: 'Total Orders', value: '12', icon: statsIcon },
        { label: 'Saved Items', value: '5', icon: favIcon },
        { label: 'Member Since', value: 'April 2026', icon: calendarIcon },
    ];

    const recentOrders = [
        { id: '#FL-8921', date: 'Oct 12, 2026', status: 'Delivered', total: '$24.50' },
        { id: '#FL-8910', date: 'Oct 08, 2026', status: 'Processing', total: '$12.00' },
    ];

    return (
        <div className="customer-layout">
            <CustomerNavbar showSearch={false} />
            
            <main className="profile-dashboard-container">
                <header className="profile-header">
                    <div className="profile-header-content">
                        <div className="user-welcome">
                            <h1>Hello, {user?.username || 'Customer'}!</h1>
                            <p>Welcome to your personal dashboard. Manage your orders and profile here.</p>
                        </div>
                        <button className="marketplace-nav-btn" onClick={() => navigate('/customer/marketplace')}>
                            Go to Marketplace
                        </button>
                    </div>
                </header>

                <section className="stats-grid">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="stat-card">
                            <div className="stat-icon">
                                {typeof stat.icon === 'string' && stat.icon.length < 5 ? (
                                    <span>{stat.icon}</span>
                                ) : (
                                    <img src={stat.icon} alt={stat.label} />
                                )}
                            </div>
                            <div className="stat-info">
                                <h3>{stat.value}</h3>
                                <p>{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </section>

                <div className="dashboard-content-wrapper">
                    <section className="recent-orders-section" id="orders">
                        <div className="section-header">
                            <h2>Recent Orders</h2>
                            <button className="view-all-btn">View All Past Orders</button>
                        </div>
                        <div className="orders-table-wrapper">
                            <table className="orders-table">
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Total</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentOrders.map(order => (
                                        <tr key={order.id}>
                                            <td className="order-id">{order.id}</td>
                                            <td>{order.date}</td>
                                            <td>
                                                <span className={`status-badge ${order.status.toLowerCase()}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="total-cell">{order.total}</td>
                                            <td><button className="details-btn">Details</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <aside className="quick-nav-sidebar">
                        <h2>Quick Actions</h2>
                        <div className="nav-links-grid">
                            <div className="nav-card">
                                <img src={trackIcon} alt="Track" />
                                <h3>Track Present Orders</h3>
                                <p>See where your food is right now</p>
                            </div>
                            <div className="nav-card">
                                <img src={editIcon} alt="Edit" />
                                <h3>Edit Profile</h3>
                                <p>Update your details and security</p>
                            </div>
                            <div className="nav-card">
                                <img src={ordersIcon} alt="History" />
                                <h3>Order History</h3>
                                <p>Review all your previous purchases</p>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default CustomerProfile;
