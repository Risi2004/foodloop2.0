import React, { useState, useMemo } from 'react';
import CustomerNavbar from '../../../../components/afterLogin/customer/navbar/CustomerNavbar';
import Footer from '../../../../components/beforeLogin/footer/Footer';
import { useMarketplace } from '../../../../contexts/MarketplaceContext';
import './CustomerMarketplace.css';

const CustomerMarketplace = () => {
    const { products, addToCart } = useMarketplace();
    
    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [isCategoriesMenuOpen, setIsCategoriesMenuOpen] = useState(false);

    // Derived Data
    const marketplaceProducts = useMemo(() => products.filter(p => !p.isDonation), [products]);
    
    const categories = useMemo(() => {
        const cats = new Set(marketplaceProducts.map(p => p.category));
        return ['All', ...Array.from(cats)];
    }, [marketplaceProducts]);

    const subNavItems = [
        { name: 'Bundle deals', highlight: true },
        { name: 'Choice', highlight: false },
        { name: 'SuperDeals', highlight: false },
        { name: 'Fresh Picks', highlight: false },
        { name: 'Local Shops', highlight: false },
        { name: 'Automotive', highlight: false },
        { name: 'Appliances', highlight: false },
        { name: 'Bakery', highlight: false },
        { name: 'Organic', highlight: false },
    ];

    const filteredProducts = useMemo(() => {
        return marketplaceProducts.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                product.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [marketplaceProducts, searchQuery, selectedCategory]);

    return (
        <div className="customer-layout">
            <CustomerNavbar />
            
            {/* AliExpress Style Sub-Navbar */}
            <div className="marketplace-sub-nav">
                <div className="sub-nav-container">
                    <button 
                        className={`categories-dropdown-btn ${isCategoriesMenuOpen ? 'active' : ''}`}
                        onClick={() => setIsCategoriesMenuOpen(!isCategoriesMenuOpen)}
                    >
                        <span className="menu-icon">☰</span>
                        All Categories
                    </button>
                    
                    <div className="sub-nav-chips">
                        {subNavItems.map(item => (
                            <button 
                                key={item.name} 
                                className={`sub-nav-chip ${item.highlight ? 'highlight' : ''}`}
                            >
                                {item.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main className="marketplace-container">
                {/* High Density Product Grid */}
                <div className="marketplace-grid-wrapper">
                    <div className="grid-header">
                        <h2>{selectedCategory === 'All' ? 'All Products' : selectedCategory}</h2>
                        <span className="results-count">{filteredProducts.length} items found</span>
                    </div>

                    <div className="aliexpress-grid">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="aliexpress-card">
                                <div className="card-image-wrapper">
                                    <img src={product.image} alt={product.name} className="product-img" />
                                    
                                    {/* Floating Cart Button */}
                                    <button className="floating-cart-btn" onClick={() => addToCart(product)}>
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                            <path d="M11 9H13V6H16V4H13V1H11V4H8V6H11V9ZM7 18C5.9 18 5.01 18.9 5.01 20C5.01 21.1 5.9 22 7 22C8.1 22 9 21.1 9 20C9 18.9 8.1 18 7 18ZM17 18C15.9 18 15.01 18.9 15.01 20C15.01 21.1 15.9 22 17 22C18.1 22 19 21.1 19 20C19 18.9 18.1 18 17 18ZM7.17 14.75L7.2 14.63L8.1 13H15.55C16.3 13 16.96 12.59 17.3 11.97L21.16 4.96L19.42 4H19.41L18.31 6L15.55 11H8.53L8.4 10.73L6.16 6L5.21 4L4.27 2H1V4H3L6.6 11.59L5.25 14.04C5.09 14.32 5 14.65 5 15C5 16.1 5.9 17 7 17H19V15H7.42C7.29 15 7.17 14.89 7.17 14.75Z"/>
                                        </svg>
                                    </button>

                                    {/* Welcome Deal Banner */}
                                    {(product.welcomeDeal || product.hasFreeShipping) && (
                                        <div className="welcome-banner">
                                            <span className="banner-text">WELCOME DEAL • Free shipping</span>
                                        </div>
                                    )}
                                </div>

                                <div className="card-content">
                                    {/* Badges Row */}
                                    <div className="badge-row">
                                        {product.isChoice && <span className="badge choice">Choice</span>}
                                        {product.isOffer && <span className="badge sale">Sale</span>}
                                        <span className="product-title-text">{product.name}</span>
                                    </div>

                                    {/* Price Row */}
                                    <div className="price-row">
                                        <span className="currency">LKR</span>
                                        <span className="current-price">{parseFloat(product.price).toLocaleString()}</span>
                                        {product.originalPrice && (
                                            <>
                                                <span className="old-price">LKR{parseFloat(product.originalPrice).toLocaleString()}</span>
                                                <span className="discount-pct">
                                                    -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Social Proof Row */}
                                    <div className="social-proof-row">
                                        <div className="rating">
                                            <span className="star">★</span>
                                            <span>{product.rating || '4.5'}</span>
                                        </div>
                                        <span className="separator">|</span>
                                        <span className="sold-count">{product.soldCount || '10,000+'} sold</span>
                                    </div>

                                    {/* Promo Text */}
                                    <div className="promo-row">
                                        <span className="promo-text">
                                            <span className="promo-icon">🏷️</span>
                                            LKR 707.62 off on LKR 5,307.12
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default CustomerMarketplace;
