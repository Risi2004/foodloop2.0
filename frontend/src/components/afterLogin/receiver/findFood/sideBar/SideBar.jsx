import { useState, useMemo, useRef, useEffect } from 'react';
import './SideBar.css';
import FoodCard from '../../../../../components/afterLogin/receiver/findFood/foodCard/FoodCard';
import searchIcon from '../../../../../assets/icons/search_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg';
import settingsIcon from '../../../../../assets/icons/settings_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg';

const Sidebar = ({ items, onCardClick, onClaim }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedStorage, setSelectedStorage] = useState(null);
    const [filterMenuOpen, setFilterMenuOpen] = useState(false);
    const [selectedExpiry, setSelectedExpiry] = useState(null); // '3days' | 'week' | 'month'
    const [minServings, setMinServings] = useState(null); // null | 5 | 10
    const filterDropdownRef = useRef(null);

    // Close filter menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
                setFilterMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get unique categories and storage types
    const categories = useMemo(() => {
        const cats = [...new Set(items.map(item => item.foodCategory || item.donation?.foodCategory).filter(Boolean))];
        return cats;
    }, [items]);

    const storageTypes = useMemo(() => {
        const storages = [...new Set(items.map(item => item.storageRecommendation || item.donation?.storageRecommendation).filter(Boolean))];
        return storages;
    }, [items]);

    // Filter items based on search (food name) and filters
    const filteredItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

        // Date-only for expiry comparison (avoid timezone issues)
        const toDateOnly = (d) => (d && !isNaN(d.getTime())) ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;

        return items.filter(item => {
            const donation = item.donation || item;
            const foodName = (item.title || item.itemName || donation.itemName || donation.title || '').toLowerCase();
            const category = item.foodCategory || donation.foodCategory || '';
            const storage = item.storageRecommendation || donation.storageRecommendation || '';

            // Search by food name
            if (query && !foodName.includes(query)) {
                return false;
            }

            // Category filter
            if (selectedCategory && category !== selectedCategory) {
                return false;
            }

            // Storage filter
            if (selectedStorage && storage !== selectedStorage) {
                return false;
            }

            // Expiry filter (date-only comparison)
            if (selectedExpiry) {
                const rawExpiry = donation.expiryDate ?? donation.expiry;
                const expiryDate = rawExpiry ? new Date(rawExpiry) : null;
                const expiryOnly = toDateOnly(expiryDate);
                const todayOnly = toDateOnly(todayStart);
                if (!expiryOnly || !todayOnly || expiryOnly < todayOnly) {
                    return false; // no date or already expired
                }
                let limitOnly;
                if (selectedExpiry === '3days') {
                    limitOnly = new Date(todayOnly);
                    limitOnly.setDate(limitOnly.getDate() + 3);
                } else if (selectedExpiry === 'week') {
                    limitOnly = new Date(todayOnly);
                    limitOnly.setDate(limitOnly.getDate() + 7);
                } else if (selectedExpiry === 'month') {
                    limitOnly = new Date(todayOnly.getFullYear(), todayOnly.getMonth() + 1, 0); // last day of current month
                } else {
                    limitOnly = todayOnly;
                }
                if (expiryOnly > limitOnly) return false;
            }

            // Minimum servings
            if (minServings != null && minServings > 0) {
                const qty = item.impactPeople ?? donation?.quantity ?? 0;
                if (Number(qty) < minServings) return false;
            }

            return true;
        });
    }, [items, searchQuery, selectedCategory, selectedStorage, selectedExpiry, minServings]);

    const handleCategoryClick = (category) => {
        setSelectedCategory(selectedCategory === category ? null : category);
    };

    const handleStorageClick = (storage) => {
        setSelectedStorage(selectedStorage === storage ? null : storage);
    };

    const expiryLabel = selectedExpiry === '3days' ? 'Within 3 days' : selectedExpiry === 'week' ? 'This week' : selectedExpiry === 'month' ? 'This month' : null;

    return (
        <div className="sidebar-container">
            <div className="sidebar-header">
                <h1>Find Surplus Food</h1>

                <div className="search-bar-container">
                    <img src={searchIcon} alt="" className="search-icon" aria-hidden />
                    <input 
                        type="text" 
                        placeholder="Find Food" 
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="filter-chips">
                    <div className="filter-dropdown" ref={filterDropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                            type="button"
                            className="chip filter-btn"
                            onClick={() => setFilterMenuOpen(prev => !prev)}
                            aria-expanded={filterMenuOpen}
                            aria-haspopup="true"
                        >
                            <span>Filter</span>
                            <img src={settingsIcon} alt="" className="filter-icon" aria-hidden />
                        </button>
                        {filterMenuOpen && (
                            <div className="filter-menu" style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                backgroundColor: 'white',
                                border: '1px solid #ccc',
                                borderRadius: '8px',
                                padding: '8px',
                                marginTop: '4px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                zIndex: 1000,
                                minWidth: '180px',
                                maxHeight: '70vh',
                                overflowY: 'auto'
                            }}>
                                {categories.length > 0 && (
                                    <div style={{ marginBottom: '8px' }}>
                                        <strong style={{ fontSize: '12px', color: '#1b4332' }}>Category:</strong>
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => handleCategoryClick(cat)}
                                                style={{
                                                    display: 'block',
                                                    width: '100%',
                                                    textAlign: 'left',
                                                    padding: '4px 8px',
                                                    margin: '2px 0',
                                                    border: 'none',
                                                    backgroundColor: selectedCategory === cat ? '#d4f8d4' : 'transparent',
                                                    cursor: 'pointer',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {storageTypes.length > 0 && (
                                    <div style={{ marginBottom: '8px' }}>
                                        <strong style={{ fontSize: '12px', color: '#1b4332' }}>Storage:</strong>
                                        {storageTypes.map(storage => (
                                            <button
                                                key={storage}
                                                type="button"
                                                onClick={() => handleStorageClick(storage)}
                                                style={{
                                                    display: 'block',
                                                    width: '100%',
                                                    textAlign: 'left',
                                                    padding: '4px 8px',
                                                    margin: '2px 0',
                                                    border: 'none',
                                                    backgroundColor: selectedStorage === storage ? '#d4f8d4' : 'transparent',
                                                    cursor: 'pointer',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                {storage}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div style={{ marginBottom: '8px' }}>
                                    <strong style={{ fontSize: '12px', color: '#1b4332' }}>Expiry:</strong>
                                    {[
                                        { value: null, label: 'Any' },
                                        { value: '3days', label: 'Within 3 days' },
                                        { value: 'week', label: 'This week' },
                                        { value: 'month', label: 'This month' }
                                    ].map(({ value, label }) => (
                                        <button
                                            key={value ?? 'any'}
                                            type="button"
                                            onClick={() => setSelectedExpiry(value)}
                                            style={{
                                                display: 'block',
                                                width: '100%',
                                                textAlign: 'left',
                                                padding: '4px 8px',
                                                margin: '2px 0',
                                                border: 'none',
                                                backgroundColor: selectedExpiry === value ? '#d4f8d4' : 'transparent',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ marginBottom: '8px' }}>
                                    <strong style={{ fontSize: '12px', color: '#1b4332' }}>Min. servings:</strong>
                                    {[null, 5, 10].map((n) => (
                                        <button
                                            key={n ?? 'any'}
                                            type="button"
                                            onClick={() => setMinServings(n)}
                                            style={{
                                                display: 'block',
                                                width: '100%',
                                                textAlign: 'left',
                                                padding: '4px 8px',
                                                margin: '2px 0',
                                                border: 'none',
                                                backgroundColor: (minServings == null && n == null) || minServings === n ? '#d4f8d4' : 'transparent',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            {n == null ? 'Any' : `${n}+ servings`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    {selectedCategory && (
                        <button
                            type="button"
                            className="chip active"
                            onClick={() => handleCategoryClick(selectedCategory)}
                        >
                            {selectedCategory} ✕
                        </button>
                    )}
                    {selectedStorage && (
                        <button
                            type="button"
                            className="chip active"
                            onClick={() => handleStorageClick(selectedStorage)}
                        >
                            {selectedStorage} ✕
                        </button>
                    )}
                    {expiryLabel && (
                        <button
                            type="button"
                            className="chip active"
                            onClick={() => setSelectedExpiry(null)}
                        >
                            {expiryLabel} ✕
                        </button>
                    )}
                    {minServings != null && minServings > 0 && (
                        <button
                            type="button"
                            className="chip active"
                            onClick={() => setMinServings(null)}
                        >
                            {minServings}+ servings ✕
                        </button>
                    )}
                </div>

                <div style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    marginTop: '8px',
                    padding: '0 12px'
                }}>
                    {filteredItems.length} donation{filteredItems.length !== 1 ? 's' : ''} available
                </div>
            </div>

            <div className="food-list">
                {filteredItems.length === 0 ? (
                    <div style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        color: '#666'
                    }}>
                        {items.length === 0 ? (
                            <>
                                <p style={{ fontSize: '16px', marginBottom: '8px', color: 'white' }}>No donations available</p>
                                <p style={{ fontSize: '12px', color: 'white' }}>Check back later for new food donations</p>
                            </>
                        ) : (
                            <>
                                <p style={{ fontSize: '16px', marginBottom: '8px' }}>No donations match your filters</p>
                                <p style={{ fontSize: '12px' }}>Try adjusting your search or filters</p>
                            </>
                        )}
                    </div>
                ) : (
                    filteredItems.map((item, index) => (
                        <FoodCard 
                            key={item.id || index} 
                            item={item}
                            onCardClick={onCardClick}
                            onClaim={onClaim}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default Sidebar;
