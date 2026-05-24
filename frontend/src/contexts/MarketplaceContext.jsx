import React, { createContext, useContext, useState } from 'react';

const MarketplaceContext = createContext();

export const useMarketplace = () => {
    return useContext(MarketplaceContext);
};

export const MarketplaceProvider = ({ children }) => {
    // Initial Mock Products
    const [products, setProducts] = useState([
        {
            id: 1,
            vendorId: 'vendor-1',
            vendorName: 'Green Groceries',
            name: 'Organic Tomatoes - Premium Hand-Picked',
            price: 350.27,
            originalPrice: 3890.12,
            category: 'Vegetables',
            description: 'Fresh organic tomatoes sourced locally.',
            isDonation: false,
            isChoice: true,
            isOffer: true,
            welcomeDeal: true,
            hasFreeShipping: true,
            rating: 4.3,
            soldCount: '10,000+',
            image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=80',
            position: [7.0873, 80.0144], // Mock location
            pickupDate: '2026-04-20',
            pickupTimeFrom: '09:00',
            pickupTimeTo: '18:00',
        },
        {
            id: 2,
            vendorId: 'vendor-2',
            vendorName: 'Downtown Bakery',
            name: 'Artisan Sourdough Bread Loaf',
            price: 1340.93,
            originalPrice: 2272.61,
            category: 'Bakery',
            description: 'Freshly baked sourdough loaf.',
            isDonation: false,
            isChoice: true,
            isOffer: true,
            rating: 4.4,
            soldCount: '10,000+',
            image: 'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?w=400&q=80',
            position: [6.9271, 79.8612], // Colombo
            pickupDate: '2026-04-21',
            pickupTimeFrom: '10:00',
            pickupTimeTo: '20:00',
        },
        {
            id: 3,
            vendorId: 'vendor-1',
            vendorName: 'Green Groceries',
            name: 'Surplus Apples Box',
            price: 0,
            category: 'Fruits',
            description: 'A box of slighty bruised but perfectly fine apples.',
            isDonation: true,
            image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6faa6?w=400&q=80',
            position: [7.0, 80.0],
            pickupDate: '2026-04-19',
            pickupTimeFrom: '08:00',
            pickupTimeTo: '17:00',
        },
        {
            id: 4,
            vendorId: 'vendor-3',
            vendorName: 'Dairy Fresh',
            name: 'Greek Yogurt (500g) - High Protein',
            price: 512.91,
            originalPrice: 1467.73,
            category: 'Dairy',
            description: 'Creamy high-protein Greek yogurt.',
            isDonation: false,
            isOffer: true,
            welcomeDeal: true,
            hasFreeShipping: true,
            isChoice: true,
            rating: 4.7,
            soldCount: '2,000+',
            image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80'
        },
        {
            id: 5,
            vendorId: 'vendor-2',
            vendorName: 'Downtown Bakery',
            name: 'Belgian Chocolate Croissant',
            price: 350.27,
            originalPrice: 2247.20,
            category: 'Bakery',
            description: 'Flaky pastry with premium chocolate filling.',
            isDonation: false,
            isOffer: true,
            welcomeDeal: true,
            hasFreeShipping: true,
            rating: 4.6,
            soldCount: '5,000+',
            image: 'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=400&q=80'
        },
        {
            id: 6,
            vendorId: 'vendor-4',
            vendorName: 'The Fruit Hub',
            name: 'Selected Organic Strawberries',
            price: 997.66,
            originalPrice: 1405.02,
            category: 'Fruits',
            description: 'Fresh sweet strawberries from local farms.',
            isDonation: false,
            isChoice: false,
            rating: 4.5,
            soldCount: '1 sold',
            image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&q=80'
        },
        {
            id: 7,
            vendorId: 'vendor-1',
            vendorName: 'Green Groceries',
            name: 'Fresh Baby Spinach Bag (Large)',
            price: 1252.48,
            originalPrice: 1432.92,
            category: 'Vegetables',
            description: 'Pre-washed organic baby spinach.',
            isDonation: false,
            isOffer: true,
            welcomeDeal: true,
            hasFreeShipping: true,
            isChoice: true,
            rating: 4.3,
            soldCount: '3,000+',
            image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80'
        }
    ]);

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
