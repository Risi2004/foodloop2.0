import React from 'react';
import VendorSidebar from '../../../../components/afterLogin/vendor/sidebar/VendorSidebar';
import { useMarketplace } from '../../../../contexts/MarketplaceContext';
import './VendorDashboard.css';

const VendorDashboard = () => {
    // We assume the logged-in vendor is 'vendor-1' for demonstration.
    const { products } = useMarketplace();
    const myProducts = products.filter(p => p.vendorId === 'vendor-1');

    const totalProducts = myProducts.length;
    const donationsCount = myProducts.filter(p => p.isDonation).length;
    const activeListings = totalProducts - donationsCount;

    return (
        <div className="vendor-layout">
            <VendorSidebar />
            <div className="vendor-main-content">
                <header className="vendor-header">
                    <h1>Vendor Dashboard</h1>
                    <p>Welcome back! Here's a summary of your storefront.</p>
                </header>

                <div className="vendor-stats-grid">
                    <div className="vendor-stat-card primary">
                        <h3>{activeListings}</h3>
                        <p>Active Marketplace Listings</p>
                    </div>
                    <div className="vendor-stat-card secondary">
                        <h3>{donationsCount}</h3>
                        <p>Items Donated</p>
                    </div>
                    <div className="vendor-stat-card accent">
                        <h3>$0.00</h3>
                        <p>Total Sales (Mock)</p>
                    </div>
                </div>

                <div className="vendor-recent-section">
                    <h2>Recent Activity</h2>
                    <div className="activity-placeholder">
                        <p>No recent orders found. Keep listing items!</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VendorDashboard;
