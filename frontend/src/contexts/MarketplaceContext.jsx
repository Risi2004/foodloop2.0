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
    const [discountOfferEnabled, setDiscountOfferEnabled] = useState(false);
    const [discountOfferSelections, setDiscountOfferSelections] = useState({});

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
            const maxQty = Number(product.maxQuantity ?? product.quantity ?? 9999);
            if (existing) {
                const newQty = Math.min(maxQty, existing.quantity + 1);
                return prev.map(item => item.id === product.id ? { ...item, quantity: newQty } : item);
            }
            return [...prev, { ...product, quantity: Math.min(maxQty, 1) }];
        });
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
        setDiscountOfferSelections((prev) => {
            const next = { ...prev };
            delete next[String(id)];
            return next;
        });
    };

    const updateQuantity = (id, amount) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const maxQty = Number(item.maxQuantity ?? 9999);
                const newQuantity = Math.min(maxQty, Math.max(1, item.quantity + amount));
                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    const clearCart = () => {
        setCart([]);
        setDiscountOfferSelections({});
        setDiscountOfferEnabled(false);
    };

    const setOfferEnabled = (enabled) => {
        const on = !!enabled;
        setDiscountOfferEnabled(on);
        if (!on) setDiscountOfferSelections({});
    };

    const toggleOfferSelection = (itemId) => {
        const id = String(itemId);
        setDiscountOfferSelections((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const getSelectedDiscountItemIds = () =>
        Object.entries(discountOfferSelections)
            .filter(([, selected]) => !!selected)
            .map(([id]) => id);

    const getCartTotal = () => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    };

    const getDiscountedSubtotal = () => {
        if (!discountOfferEnabled) return getCartTotal();
        const selected = new Set(getSelectedDiscountItemIds());
        return cart.reduce((total, item) => {
            const line = item.price * item.quantity;
            if (selected.has(String(item.id))) return total + line * 0.8;
            return total + line;
        }, 0);
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
        getDiscountedSubtotal,
        getDeliveryFee,
        discountOfferEnabled,
        discountOfferSelections,
        setOfferEnabled,
        toggleOfferSelection,
        getSelectedDiscountItemIds,
    };

    return (
        <MarketplaceContext.Provider value={value}>
            {children}
        </MarketplaceContext.Provider>
    );
};
