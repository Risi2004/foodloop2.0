import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VendorSidebar from '../../../../components/afterLogin/vendor/sidebar/VendorSidebar';
import { useMarketplace } from '../../../../contexts/MarketplaceContext';
import './VendorProducts.css';

const VendorProducts = () => {
    const navigate = useNavigate();
    const { products, toggleDonationStatus, deleteProduct } = useMarketplace();
    const myProducts = products.filter(p => p.vendorId === 'vendor-1');

    return (
        <div className="vendor-layout">
            <VendorSidebar />
            <div className="vendor-main-content">
                <div className="products-header-container">
                    <header className="vendor-header" style={{ marginBottom: 0 }}>
                        <h1>My Products & Donations</h1>
                        <p>Manage items you are selling or donating to the community.</p>
                    </header>
                    <button className="add-product-btn" onClick={() => navigate('/vendor/add-product')}>
                        + Add Item
                    </button>
                </div>

                <div className="products-list">
                    {myProducts.length === 0 ? (
                        <p style={{color: '#666'}}>You haven't listed any items yet.</p>
                    ) : (
                        myProducts.map(product => (
                            <div key={product.id} className={`product-card ${product.isDonation ? 'donation-card' : 'sale-card'}`}>
                                <div className="img-container">
                                    <img src={product.image} alt={product.name} />
                                    {product.isDonation && <span className="donation-badge">Donation</span>}
                                </div>
                                <div className="details-container">
                                    <h4>{product.name}</h4>
                                    <p className="cat-desc">{product.category} • {product.description}</p>
                                    {product.isDonation ? (
                                        <span className="price-tag free">Free</span>
                                    ) : (
                                        <span className="price-tag">${parseFloat(product.price).toFixed(2)}</span>
                                    )}
                                </div>
                                <div className="actions-container">
                                    <button 
                                        className="action-btn toggle-btn" 
                                        onClick={() => toggleDonationStatus(product.id)}
                                        title={product.isDonation ? "Move to Storefront" : "Move to Donations"}
                                    >
                                        {product.isDonation ? 'Set to Sale' : 'Set to Donate'}
                                    </button>
                                    <button className="action-btn delete-btn" onClick={() => deleteProduct(product.id)}>Delete</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default VendorProducts;
