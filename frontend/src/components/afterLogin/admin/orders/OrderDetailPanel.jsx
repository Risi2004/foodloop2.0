import { useEffect, useState } from 'react';
import {
  getAdminOrderDetail,
  orderTypeLabel,
  formatOrderAmount,
  formatOrderDate,
  partiesSummary,
} from '../../../../services/adminOrdersApi';
import './OrderDetailPanel.css';

function DetailRow({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <div className="order-detail-row">
      <span className="order-detail-label">{label}</span>
      <span className="order-detail-value">{value}</span>
    </div>
  );
}

function OrderDetailPanel({ orderType, orderId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!orderType || !orderId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    getAdminOrderDetail(orderType, orderId)
      .then((res) => {
        if (!cancelled) setOrder(res.order);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load order detail.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [orderType, orderId]);

  if (!orderType || !orderId) return null;

  const summary = order?.summary;
  const detail = order?.detail;

  return (
    <div className="order-detail-overlay" onClick={onClose} role="presentation">
      <div
        className="order-detail-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title"
      >
        <header className="order-detail-header">
          <div>
            <h2 id="order-detail-title">Order detail</h2>
            {summary && (
              <p className="order-detail-subtitle">
                {orderTypeLabel(summary.orderType)} · {summary.referenceId}
              </p>
            )}
          </div>
          <button type="button" className="order-detail-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </header>

        {loading && <p className="order-detail-body">Loading...</p>}
        {error && <p className="order-detail-error">{error}</p>}

        {!loading && !error && order && (
          <div className="order-detail-body">
            <section className="order-detail-section">
              <h3>Summary</h3>
              <DetailRow label="Title" value={summary.title} />
              <DetailRow label="Status" value={summary.status} />
              <DetailRow label="Amount" value={formatOrderAmount(summary.amount, summary.currency)} />
              <DetailRow label="Created" value={formatOrderDate(summary.createdAt)} />
              <DetailRow label="Parties" value={partiesSummary(order.parties || summary.parties)} />
            </section>

            {order.orderType === 'donation' && detail && (
              <section className="order-detail-section">
                <h3>Donation</h3>
                <DetailRow label="Tracking ID" value={detail.trackingId} />
                <DetailRow label="Listing type" value={detail.listingType} />
                <DetailRow label="Quantity" value={detail.quantity} />
                <DetailRow label="Pickup address" value={detail.pickupAddress} />
                <DetailRow label="Receiver address" value={detail.receiverAddress} />
                <DetailRow label="Delivery distance" value={detail.deliveryDistanceKm != null ? `${detail.deliveryDistanceKm} km` : null} />
                <DetailRow label="Delivery fee quoted" value={detail.deliveryFeeQuoted != null ? formatOrderAmount(detail.deliveryFeeQuoted) : null} />
                <DetailRow label="Delivery fee final" value={detail.deliveryFeeFinal != null ? formatOrderAmount(detail.deliveryFeeFinal) : null} />
                <DetailRow label="Delivery payer" value={detail.deliveryPayer} />
                <DetailRow label="Claimed at" value={formatOrderDate(detail.claimedAt)} />
                <DetailRow label="Delivered at" value={formatOrderDate(detail.deliveredAt)} />
              </section>
            )}

            {order.orderType === 'claim_payment' && detail && (
              <section className="order-detail-section">
                <h3>Payment</h3>
                <DetailRow label="Order ID" value={detail.orderId} />
                <DetailRow label="Payment status" value={detail.status} />
                <DetailRow label="Card last 4" value={detail.cardLast4 ? `**** ${detail.cardLast4}` : null} />
                <DetailRow label="Food subtotal" value={detail.orderSummary?.foodSubtotal != null ? formatOrderAmount(detail.orderSummary.foodSubtotal) : null} />
                <DetailRow label="Delivery fee" value={detail.orderSummary?.deliveryFee != null ? formatOrderAmount(detail.orderSummary.deliveryFee) : null} />
                <DetailRow label="Delivery discount" value={detail.orderSummary?.deliveryDiscount != null ? formatOrderAmount(detail.orderSummary.deliveryDiscount) : null} />
                <DetailRow label="Distance" value={detail.orderSummary?.deliveryDistanceKm != null ? `${detail.orderSummary.deliveryDistanceKm} km` : null} />
                <DetailRow label="Total" value={formatOrderAmount(detail.amount, detail.currency)} />
                {detail.donation && (
                  <>
                    <h3>Linked donation</h3>
                    <DetailRow label="Item" value={detail.donation.itemName} />
                    <DetailRow label="Tracking ID" value={detail.donation.trackingId} />
                    <DetailRow label="Status" value={detail.donation.status} />
                  </>
                )}
              </section>
            )}

            {order.orderType === 'customer_order' && detail && (
              <section className="order-detail-section">
                <h3>Customer order</h3>
                <DetailRow label="Order ID" value={detail.orderId} />
                <DetailRow label="Payment method" value={detail.paymentMethod} />
                <DetailRow label="Delivery address" value={detail.customerAddress || detail.orderSummary?.address} />
                <DetailRow label="Subtotal" value={detail.orderSummary?.subtotal != null ? formatOrderAmount(detail.orderSummary.subtotal) : null} />
                <DetailRow label="Delivery fee" value={detail.orderSummary?.deliveryFee != null ? formatOrderAmount(detail.orderSummary.deliveryFee) : null} />
                <DetailRow label="Total" value={formatOrderAmount(detail.orderSummary?.total ?? detail.codAmount, detail.currency)} />
                <DetailRow label="Assigned at" value={formatOrderDate(detail.assignedAt)} />
                <DetailRow label="Delivered at" value={formatOrderDate(detail.deliveredAt)} />
                {detail.orderSummary?.items?.length > 0 && (
                  <div className="order-detail-items">
                    <h4>Items</h4>
                    <ul>
                      {detail.orderSummary.items.map((item) => (
                        <li key={item.id || item.name}>
                          {item.name} × {item.quantity} — {formatOrderAmount(item.lineTotal)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {detail.payment && (
                  <>
                    <h3>Payment</h3>
                    <DetailRow label="Payment status" value={detail.payment.status} />
                    <DetailRow label="Card last 4" value={detail.payment.cardLast4 ? `**** ${detail.payment.cardLast4}` : null} />
                  </>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderDetailPanel;
