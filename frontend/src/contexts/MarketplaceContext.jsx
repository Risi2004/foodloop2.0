import React, { createContext, useContext, useState } from 'react';

const MarketplaceContext = createContext();

export const useMarketplace = () => {
    return useContext(MarketplaceContext);
};

export const MarketplaceProvider = ({ children }) => {
    // Customer marketplace now reads backend supplier listings directly.
    // Keep this list for legacy vendor-local screens still using MarketplaceContext.
    const [products, setProducts] = useState([]);

    const [cart, setCart] = useState([]);

    // --- Product Management ---
    const addProduct = (product) => {
        setProducts([...products, { ...product, id: Date.now() }]);
    };

    const updateProduct = (id, updatedFields) => {
        setProducts(products.map(p => p.id === id ? { ...p, ...updatedFields } : p));
    };

    const toggleDonationStatus = (id) => {
        setProducts(products.map(p => p.id === id ? { ...p, isDonation: !p.isDonation } : p));
    };

    const deleteProduct = (id) => {
        setProducts(products.filter(p => p.id !== id));
    };

    const [vendorClaims, setVendorClaims] = useState([]);

    const claimVendorProduct = (product, receiverInfo) => {
        setVendorClaims(prev => [...prev, { 
            ...product, 
            ...receiverInfo, 
            status: 'assigned',
            claimedAt: new Date().toISOString() 
        }]);
        // Remove from available products if it's a one-off donation
        if (product.isDonation) {
            setProducts(prev => prev.filter(p => p.id !== product.id));
        }
    };

    // --- Cart Management ---
    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const updateQuantity = (id, amount) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQuantity = Math.max(1, item.quantity + amount);
                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    const clearCart = () => setCart([]);

    const getCartTotal = () => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    };

    const getDeliveryFee = () => {
        return cart.length > 0 ? 400.00 : 0.00;
    };

    const value = {
        products,
        addProduct,
        updateProduct,
        toggleDonationStatus,
        deleteProduct,
        vendorClaims,
        claimVendorProduct,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getDeliveryFee
    };

    return (
        <MarketplaceContext.Provider value={value}>
            {children}
        </MarketplaceContext.Provider>
    );
};
