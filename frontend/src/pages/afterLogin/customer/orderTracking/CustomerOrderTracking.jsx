import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CustomerPageLayout from '../../../../components/afterLogin/dashboard/customerSection/layout/CustomerPageLayout';
import { getCustomerOrders } from '../../../../services/paymentApi';
import { customerRoutes } from '../../../../constants/customerRoutes';
import { getSocket, onCustomerOrderUpdated } from '../../../../services/socket';
import './CustomerOrderTracking.css';

const ACTIVE_STATUSES = ['finding_driver', 'driver_assigned', 'picked_up', 'in_transit'];
const MAP_TRACK_STATUSES = ['driver_assigned', 'picked_up', 'in_transit'];

function formatMoney(amount, currency = 'LKR') {
  const value = Number(amount || 0);
  return `${currency} ${value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusLabel(status) {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function getOrderTrackId(order) {
  return order?.id || order?._id || null;
}

function canFollowOnMap(order) {
  if (!order) return false;
  if (MAP_TRACK_STATUSES.includes(order.status)) return true;
  if (order.assignedAt && order.driverId) return true;
  return Boolean(order.driverId || order.driver?.id);
}

function getDriverDisplayName(order) {
  if (order?.driver?.name) return order.driver.name;
  if (order?.driverId && order.status !== 'finding_driver') return 'Assigned';
  return 'Not assigned yet';
}

function CustomerOrderTracking() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await getCustomerOrders();
      setOrders(Array.isArray(res?.orders) ? res.orders : []);
    } catch (err) {
      setError(err.message || 'Failed to load order tracking data.');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    getSocket();
    const unsub = onCustomerOrderUpdated(() => {
      loadOrders();
    });

    const pollTimer = setInterval(() => {
      loadOrders();
    }, 15000);

    const onFocus = () => loadOrders();
    window.addEventListener('focus', onFocus);

    return () => {
      unsub();
      clearInterval(pollTimer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const { activeOrders, pastOrders } = useMemo(() => {
    const active = [];
    const past = [];
    for (const order of orders) {
      if (ACTIVE_STATUSES.includes(order.status)) active.push(order);
      else past.push(order);
    }
    return { activeOrders: active, pastOrders: past };
  }, [orders]);

  return (
    <CustomerPageLayout>
      <div className="customer-page order-tracking-page">
        <header className="customer-page-hero">
          <h1>Order Tracking</h1>
          <p>See present orders, driver assignment progress, and past deliveries.</p>
        </header>

        <section className="tracking-overview">
          <article className="tracking-overview-card">
            <span>Present Orders</span>
            <strong>{activeOrders.length}</strong>
          </article>
          <article className="tracking-overview-card">
            <span>Past Orders</span>
            <strong>{pastOrders.length}</strong>
          </article>
          <article className="tracking-overview-card">
            <span>Total Orders</span>
            <strong>{orders.length}</strong>
          </article>
        </section>

        <section className="customer-panel order-tracking-panel">
          <div className="tracking-toolbar">
            <h2>Present Orders</h2>
            <button type="button" onClick={loadOrders}>
              Refresh
            </button>
          </div>

          {isLoading && <p className="tracking-state">Loading orders...</p>}
          {!isLoading && error && <p className="tracking-state tracking-state--error">{error}</p>}

          {!isLoading && !error && activeOrders.length === 0 && (
            <div className="tracking-empty">
              <h3>No active orders right now</h3>
              <p>Once a new order is placed, its live delivery status will appear here.</p>
            </div>
          )}

          {!isLoading && !error && activeOrders.length > 0 && (
            <div className="tracking-list">
              {activeOrders.map((order) => {
                const trackId = getOrderTrackId(order);
                const showMapLink = canFollowOnMap(order) && trackId;

                return (
                  <article key={order.id} className="tracking-card">
                    <div className="tracking-card-header">
                      <div>
                        <h3>{order.orderId}</h3>
                        <p>{(order.orderSummary?.items || []).length} items</p>
                      </div>
                      <span className={`tracking-status tracking-status--${order.status}`}>
                        {statusLabel(order.status)}
                      </span>
                    </div>

                    {order.status === 'finding_driver' && (
                      <div className="driver-loading">
                        Finding a driver… A map link will appear once a driver accepts your order.
                      </div>
                    )}

                    <div className="tracking-grid">
                      <p>
                        <strong>Address:</strong> {order.customerAddress || order.orderSummary?.address || '—'}
                      </p>
                      <p>
                        <strong>Payment:</strong> {(order.paymentMethod || 'card').toUpperCase()}
                      </p>
                      <p>
                        <strong>Total:</strong> {formatMoney(order.orderSummary?.total, order.currency)}
                      </p>
                      <p>
                        <strong>Driver:</strong> {getDriverDisplayName(order)}
                      </p>
                    </div>

                    {showMapLink && (
                      <div className="tracking-card-actions">
                        <Link to={customerRoutes.trackOrder(trackId)} className="track-map-link">
                          <span className="track-map-link__icon" aria-hidden="true">📍</span>
                          Follow on map
                        </Link>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="customer-panel order-tracking-panel">
          <h2>Past Orders</h2>
          {!isLoading && !error && pastOrders.length === 0 && (
            <div className="tracking-empty">
              <h3>No past orders found</h3>
              <p>Your completed, cancelled, or failed orders will appear in this section.</p>
            </div>
          )}
          {!isLoading && !error && pastOrders.length > 0 && (
            <div className="tracking-list">
              {pastOrders.map((order) => (
                <article key={order.id} className="tracking-card tracking-card--past">
                  <div className="tracking-card-header">
                    <h3>{order.orderId}</h3>
                    <span className={`tracking-status tracking-status--${order.status}`}>
                      {statusLabel(order.status)}
                    </span>
                  </div>
                  <p>
                    <strong>Total:</strong> {formatMoney(order.orderSummary?.total, order.currency)}
                  </p>
                  <p>
                    <strong>Payment:</strong> {(order.paymentMethod || 'card').toUpperCase()}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </CustomerPageLayout>
  );
}

export default CustomerOrderTracking;
