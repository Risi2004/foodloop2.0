import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import CustomerPageLayout from '../../../../components/afterLogin/dashboard/customerSection/layout/CustomerPageLayout';
import Contact from '../../../../components/beforeLogin/Contact/Contact';
import LocationMapModal from '../../../../components/afterLogin/donor/myDonation/locationMapModal/LocationMapModal';
import { useMarketplace } from '../../../../contexts/MarketplaceContext';
import { getCustomerMarketplaceListings, claimDonation } from '../../../../services/donationApi';
import { mapDonationsToMarketplaceItems } from '../../../../utils/customerMarketplaceMapper';
import { getListingPriceDisplay } from '../../../../utils/donationDisplay';
import { customerRoutes } from '../../../../constants/customerRoutes';
import { useMaintenance } from '../../../../contexts/MaintenanceContext';
import { MAINTENANCE_BLOCK_MESSAGE } from '../../../../services/maintenanceApi';
import SupplierNameWithPremium from '../../../../components/afterLogin/shared/SupplierNameWithPremium';
import {
  getSocket,
  joinFoodListings,
  onDonationCreated,
  onDonationClaimed,
  onDonationStockUpdated,
  onDonationCancelled,
} from '../../../../services/socket';
import './CustomerMarketplace.css';

const CustomerMarketplace = () => {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const {
    addToCart,
    activeSupplier,
    lockSupplier,
    clearSupplierLock,
    isProductAllowed,
    clearCart,
    cart,
  } = useMarketplace();
  const { blockNewOrders } = useMaintenance();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCategoriesMenuOpen, setIsCategoriesMenuOpen] = useState(false);
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);
  const [cartToast, setCartToast] = useState(null);
  const [claimListing, setClaimListing] = useState(null);
  const [claimLocationModalOpen, setClaimLocationModalOpen] = useState(false);
  const [claimSaving, setClaimSaving] = useState(false);
  const [claimError, setClaimError] = useState(null);

  const buildCartItem = (product) => ({
    id: product.id,
    name: product.name,
    image: product.image,
    price: product.unitPrice ?? product.price,
    vendorName: product.donorName,
    donorId: product.donorId,
    listingType: product.listingType,
    maxQuantity: product.quantity,
  });

  const handleProductSelect = (product) => {
    lockSupplier(product);
    setSelectedListing(product);
  };

  const handleChangeSupplier = () => {
    if (cart.length > 0) {
      const ok = window.confirm(
        'Changing supplier will clear your cart. Continue?'
      );
      if (!ok) return;
      clearCart();
    } else {
      clearSupplierLock();
    }
  };

  const isProductDisabled = (product) => !isProductAllowed(product);

  const showAddedToCartToast = (product) => {
    setCartToast({
      id: product.id,
      name: product.name,
    });
  };

  const handleAddToCart = (product) => {
    if (!product.isSell || isProductDisabled(product)) return;
    if (blockNewOrders) {
      window.alert(MAINTENANCE_BLOCK_MESSAGE);
      return;
    }
    lockSupplier(product);
    const result = addToCart(buildCartItem(product));
    if (result?.ok === false) {
      window.alert(result.message);
      return;
    }
    showAddedToCartToast(product);
  };

  const handleBuyNow = (product) => {
    if (!product.isSell || isProductDisabled(product)) return;
    if (blockNewOrders) {
      window.alert(MAINTENANCE_BLOCK_MESSAGE);
      return;
    }
    lockSupplier(product);
    const result = addToCart(buildCartItem(product));
    if (result?.ok === false) {
      window.alert(result.message);
      return;
    }
    navigate(customerRoutes.cart());
  };

  const handleClaimDonation = (product) => {
    if (!product || product.isSell || isProductDisabled(product)) return;
    if (blockNewOrders) {
      window.alert(MAINTENANCE_BLOCK_MESSAGE);
      return;
    }
    lockSupplier(product);
    setClaimError(null);
    setClaimListing(product);
    setClaimLocationModalOpen(true);
  };

  const handleClaimLocationConfirm = async (lat, lng, address) => {
    if (!claimListing?.id) return;
    setClaimSaving(true);
    setClaimError(null);
    try {
      const response = await claimDonation(claimListing.id, {
        receiverLatitude: lat,
        receiverLongitude: lng,
        receiverAddress: address || '',
        claimQuantity: 1,
      });
      if (response.success) {
        setClaimLocationModalOpen(false);
        setClaimListing(null);
        setSelectedListing(null);
        clearSupplierLock();
        navigate(customerRoutes.orderTracking());
      }
    } catch (err) {
      setClaimError(err.message || 'Failed to claim donation.');
      throw err;
    } finally {
      setClaimSaving(false);
    }
  };

  useEffect(() => {
    if (!cartToast) return undefined;
    const timer = setTimeout(() => setCartToast(null), 3500);
    return () => clearTimeout(timer);
  }, [cartToast]);

  const getMarketplacePriceNode = (listing) => {
    const display = listing?.priceDisplay || getListingPriceDisplay(listing?.raw || listing, { perServing: true });
    if (!listing?.isSell || !display?.hasPrice) return <span className="current-price free">Free donation</span>;
    return (
      <>
        {display.hasDiscountApplied && (
          <span className="previous-price">{display.previous}</span>
        )}
        <span className="current-price">{display.current}</span>
        {listing.quantity > 1 && (
          <span className="price-per-piece-hint"> per piece</span>
        )}
      </>
    );
  };

  useEffect(() => {
    if (hash === '#contact') {
      const el = document.getElementById('contact');
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [hash]);

  const fetchListings = useCallback(async (coords) => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await getCustomerMarketplaceListings(coords);
      const mapped = mapDonationsToMarketplaceItems(res?.donations || []);
      setListings(mapped);
    } catch (err) {
      setLoadError(err.message || 'Failed to load supplier listings.');
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      fetchListings();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchListings({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => fetchListings(),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
    );
  }, [fetchListings]);

  useEffect(() => {
    getSocket();
    const leaveFoodListings = joinFoodListings();

    const mergeStockUpdated = (payload) => {
      const donation = payload?.donation;
      if (!donation) return;
      const donationId = donation.id || donation._id || payload?.donationId;
      if (!donationId) return;

      setListings((prev) => {
        const qty = Number(donation.quantity) || 0;
        if (qty <= 0) {
          return prev.filter((item) => item.id !== donationId);
        }
        return prev.map((item) => {
          if (item.id === donationId) {
            return {
              ...item,
              quantity: qty,
              raw: { ...item.raw, quantity: qty },
            };
          }
          return item;
        });
      });
    };

    const removeById = (payload) => {
      const id = payload?.donationId;
      if (!id) return;
      setListings((prev) => prev.filter((item) => item.id !== id));
      setSelectedListing((current) => (current?.id === id ? null : current));
    };

    const mergeCreated = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            fetchListings({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          },
          () => fetchListings(),
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
        );
      } else {
        fetchListings();
      }
    };

    const unsubCreated = onDonationCreated(mergeCreated);
    const unsubClaimed = onDonationClaimed(removeById);
    const unsubStockUpdated = onDonationStockUpdated(mergeStockUpdated);
    const unsubCancelled = onDonationCancelled(removeById);

    return () => {
      leaveFoodListings();
      unsubCreated();
      unsubClaimed();
      unsubStockUpdated();
      unsubCancelled();
    };
  }, [fetchListings]);

  const categories = useMemo(() => {
    const cats = new Set(listings.map((p) => p.category));
    return ['All', ...Array.from(cats)];
  }, [listings]);

  const filteredProducts = useMemo(() => {
    return listings.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.donorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.pickupAddress.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [listings, searchQuery, selectedCategory]);

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setIsCategoriesMenuOpen(false);
  };

  return (
    <CustomerPageLayout>
      <div className="customer-page marketplace-page">
        <header className="customer-page-hero">
          <h1>Fresh Marketplace</h1>
          <p>Shop surplus food and groceries from local suppliers at great prices</p>
        </header>

        <div className="marketplace-sub-nav">
          <div className="sub-nav-container">
            <button
              type="button"
              className={`categories-dropdown-btn ${isCategoriesMenuOpen ? 'active' : ''}`}
              onClick={() => setIsCategoriesMenuOpen(!isCategoriesMenuOpen)}
              aria-expanded={isCategoriesMenuOpen}
            >
              <span className="menu-icon">☰</span>
              {selectedCategory === 'All' ? 'All Categories' : selectedCategory}
            </button>

            {isCategoriesMenuOpen && (
              <div className="categories-dropdown-menu" role="menu">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    role="menuitem"
                    className={selectedCategory === cat ? 'active' : ''}
                    onClick={() => handleCategorySelect(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="sub-nav-chips">
              {categories
                .filter((c) => c !== 'All')
                .slice(0, 8)
                .map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`sub-nav-chip ${selectedCategory === cat ? 'highlight' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
            </div>
          </div>
        </div>

        <main className="marketplace-container">
          <div className="marketplace-grid-wrapper">
            <div className="grid-header">
              <div className="grid-header__titles">
                <h2>{selectedCategory === 'All' ? 'All Products' : selectedCategory}</h2>
                <span className="results-count">{filteredProducts.length} listings found</span>
              </div>
              <div className="marketplace-search-bar">
                <input
                  type="search"
                  placeholder="Search by item, supplier, category, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search listings"
                />
                <button type="button" onClick={() => setSearchQuery(searchQuery)}>
                  Search
                </button>
              </div>
            </div>

            {activeSupplier && (
              <div className="marketplace-supplier-lock-banner" role="status">
                <span>
                  Ordering from <strong>{activeSupplier.name}</strong>. Other suppliers are disabled.
                </span>
                <button type="button" className="marketplace-supplier-lock-clear" onClick={handleChangeSupplier}>
                  Change supplier
                </button>
              </div>
            )}

            {isLoading && <p className="marketplace-empty">Loading supplier listings...</p>}

            {loadError && !isLoading && (
              <div className="marketplace-empty">
                <p>{loadError}</p>
                <button type="button" className="retry-btn" onClick={() => fetchListings()}>
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !loadError && (
              <>
                <div className="aliexpress-grid">
                  {filteredProducts.map((product) => {
                    const supplierDisabled = isProductDisabled(product);
                    return (
                    <div
                      key={product.id}
                      className={`aliexpress-card${supplierDisabled ? ' aliexpress-card--supplier-disabled' : ''}`}
                      onClick={() => !supplierDisabled && lockSupplier(product)}
                    >
                      <div className="card-image-wrapper">
                        <img src={product.image} alt={product.name} className="product-img" />
                        <span className={`listing-type-badge ${product.isSell ? 'sell' : 'donate'}`}>
                          {product.isSell ? 'Sell' : 'Donate'}
                        </span>
                      </div>

                      <div className="card-content">
                        <div className="badge-row">
                          <span className="badge choice">{product.category}</span>
                          {product.qualityScore != null && (
                            <span className="badge sale">Quality {product.qualityScore}%</span>
                          )}
                        </div>

                        <h3 className="product-title-text">{product.name}</h3>
                        <p className="supplier-line">
                          <SupplierNameWithPremium
                            name={product.donorName}
                            isPremium={product.donorIsPremium}
                          />
                          {product.donorType && (
                            <span className="supplier-line__type"> • {product.donorType}</span>
                          )}
                        </p>
                        <p className="pickup-line">{product.pickupAddress}</p>

                        <div className="price-row">
                          {getMarketplacePriceNode(product)}
                        </div>

                        <div className="social-proof-row">
                          <span>{product.distanceLabel}</span>
                          <span className="separator">|</span>
                          <span>Available Qty: {product.quantity}</span>
                        </div>

                        <div className="card-actions">
                          <button
                            type="button"
                            className="details-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProductSelect(product);
                            }}
                            disabled={supplierDisabled}
                          >
                            View Details
                          </button>
                          {product.isSell ? (
                            <>
                              <button
                                type="button"
                                className="floating-cart-btn inline-cart-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToCart(product);
                                }}
                                disabled={blockNewOrders || supplierDisabled}
                              >
                                Add to Cart
                              </button>
                              <button
                                type="button"
                                className="buy-now-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBuyNow(product);
                                }}
                                disabled={blockNewOrders || supplierDisabled}
                              >
                                Buy Now
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="floating-cart-btn inline-cart-btn claim-donate-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClaimDonation(product);
                              }}
                              disabled={blockNewOrders || supplierDisabled}
                            >
                              Claim food
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>

                {filteredProducts.length === 0 && (
                  <p className="marketplace-empty">No listings match your search. Try another category or term.</p>
                )}
              </>
            )}
          </div>
        </main>

        <div id="contact" className="customer-contact-wrap">
          <Contact />
        </div>

        {selectedListing && (
          <div className="listing-modal-overlay" onClick={() => setSelectedListing(null)}>
            <div className="listing-modal" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="listing-modal-close"
                onClick={() => setSelectedListing(null)}
              >
                ×
              </button>
              <img src={selectedListing.image} alt={selectedListing.name} className="listing-modal-image" />
              <h3>{selectedListing.name}</h3>
              <p className="modal-type">
                {selectedListing.isSell
                  ? (selectedListing.priceDisplay?.hasDiscountApplied
                    ? `${selectedListing.priceDisplay.previous} -> ${selectedListing.priceDisplay.current}`
                    : selectedListing.priceDisplay?.current || selectedListing.priceLabel)
                  : 'Free donation'}{' '}
                • {selectedListing.category}
              </p>
              <p>{selectedListing.description}</p>
              <div className="listing-modal-meta">
                <p>
                  <strong>Supplier:</strong>{' '}
                  <SupplierNameWithPremium
                    name={selectedListing.donorName}
                    isPremium={selectedListing.donorIsPremium}
                  />
                  {selectedListing.donorType && ` (${selectedListing.donorType})`}
                </p>
                <p><strong>Available Qty:</strong> {selectedListing.quantity}</p>
                <p><strong>Expiry:</strong> {selectedListing.expiryText}</p>
                <p><strong>Pickup Address:</strong> {selectedListing.pickupAddress}</p>
                <p><strong>Distance:</strong> {selectedListing.distanceLabel}</p>
              </div>
              {selectedListing.isSell ? (
                <div className="listing-modal-actions">
                  <button
                    type="button"
                    className="floating-cart-btn inline-cart-btn"
                    onClick={() => {
                      handleAddToCart(selectedListing);
                      setSelectedListing(null);
                    }}
                    disabled={blockNewOrders || isProductDisabled(selectedListing)}
                  >
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    className="buy-now-btn"
                    onClick={() => {
                      handleBuyNow(selectedListing);
                      setSelectedListing(null);
                    }}
                    disabled={blockNewOrders || isProductDisabled(selectedListing)}
                  >
                    Buy Now
                  </button>
                </div>
              ) : (
                <div className="listing-modal-actions">
                  <button
                    type="button"
                    className="floating-cart-btn inline-cart-btn claim-donate-btn"
                    onClick={() => {
                      handleClaimDonation(selectedListing);
                      setSelectedListing(null);
                    }}
                    disabled={blockNewOrders || isProductDisabled(selectedListing)}
                  >
                    Claim food (confirm location)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <LocationMapModal
          isOpen={claimLocationModalOpen}
          onClose={() => {
            if (!claimSaving) {
              setClaimLocationModalOpen(false);
              setClaimListing(null);
              setClaimError(null);
            }
          }}
          onConfirm={handleClaimLocationConfirm}
          title="Confirm delivery location"
          confirmLabel={claimSaving ? 'Claiming…' : 'Confirm & claim food'}
          initialAddress=""
        />
        {claimError && claimLocationModalOpen && (
          <p className="marketplace-claim-error" role="alert">{claimError}</p>
        )}

        {cartToast && (
          <div className="marketplace-cart-toast" role="status" aria-live="polite">
            <span className="marketplace-cart-toast__icon" aria-hidden>✓</span>
            <span className="marketplace-cart-toast__text">
              <strong>{cartToast.name}</strong> added to cart
            </span>
            <Link to={customerRoutes.cart()} className="marketplace-cart-toast__link">
              View cart
            </Link>
            <button
              type="button"
              className="marketplace-cart-toast__close"
              onClick={() => setCartToast(null)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </CustomerPageLayout>
  );
};

export default CustomerMarketplace;
