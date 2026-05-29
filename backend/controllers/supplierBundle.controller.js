const Payment = require('../models/Payment');
const {
  getAccessStatus,
  getSubscriptionAmount,
  findActiveSubscription,
  activateSubscriptionFromPayment,
  cancelAutoRenew,
} = require('../services/supplierBundleSubscriptionService');
const { sendSupplierBundleSubscriptionPaymentEmail } = require('../utils/sendNotificationEmail');
const { validateMockCard } = require('../utils/mockCardValidation');

const CHECKOUT_TTL_MS = 30 * 60 * 1000;
const DONOR_ROLES = ['donor', 'restaurant', 'supermarket', 'business', 'individual'];

function requireSupplier(req, res) {
  const role = (req.user?.role || '').toLowerCase();
  if (!DONOR_ROLES.includes(role)) {
    res.status(403).json({
      success: false,
      message: 'Only food suppliers can manage subscriptions.',
      code: 'FORBIDDEN',
    });
    return false;
  }
  return true;
}

function generateOrderId(seedValue = Date.now().toString()) {
  const suffix = Date.now().toString(36).toUpperCase();
  const idPart = String(seedValue).slice(-8).toUpperCase().replace(/\W/g, '');
  return `FLBND${idPart}${suffix}`.slice(0, 32);
}

exports.getStatus = async (req, res) => {
  try {
    if (!requireSupplier(req, res)) return;
    const status = await getAccessStatus(req.user._id);
    return res.json({ success: true, status });
  } catch (err) {
    console.error('[supplierBundle]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Could not load subscription status.',
    });
  }
};

exports.subscriptionCheckout = async (req, res) => {
  try {
    if (!requireSupplier(req, res)) return;

    const supplierId = req.user._id;
    const amount = getSubscriptionAmount();

    const existingSub = await findActiveSubscription(supplierId);
    if (existingSub) {
      return res.json({
        success: true,
        alreadySubscribed: true,
        message: 'You already have an active Premium bundle.',
        status: await getAccessStatus(supplierId),
      });
    }

    await Payment.updateMany(
      {
        supplierId,
        paymentContext: 'supplier_bundle_subscription',
        status: 'pending',
        expiresAt: { $lt: new Date() },
      },
      { $set: { status: 'cancelled' } }
    );

    const orderId = generateOrderId(supplierId.toString());
    const payment = await Payment.create({
      orderId,
      paymentContext: 'supplier_bundle_subscription',
      supplierId,
      amount,
      currency: 'LKR',
      status: 'pending',
      expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS),
      orderSummary: {
        items: [
          {
            id: 'supplier-bundle-sub',
            name: 'Supplier Premium bundle — 1 month',
            quantity: 1,
            unitPrice: amount,
            lineTotal: amount,
          },
        ],
        subtotal: amount,
        deliveryFee: 0,
        total: amount,
        paymentMethod: 'card',
      },
    });

    return res.json({
      success: true,
      checkout: {
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        itemName: 'Supplier Premium bundle',
      },
    });
  } catch (err) {
    console.error('[supplierBundle]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Checkout failed.',
    });
  }
};

exports.subscriptionConfirm = async (req, res) => {
  try {
    if (!requireSupplier(req, res)) return;

    const {
      orderId,
      cardNumber,
      expiry,
      cvv,
      cardLast4: bodyLast4,
      autoRenew,
    } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order id required.' });
    }

    const cardCheck = validateMockCard({ cardNumber, expiry, cvv });
    if (!cardCheck.ok) {
      return res.status(400).json({ success: false, message: cardCheck.message });
    }

    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    }
    if (payment.paymentContext !== 'supplier_bundle_subscription') {
      return res.status(400).json({ success: false, message: 'Invalid payment type.' });
    }
    if (!payment.supplierId || payment.supplierId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your payment.' });
    }

    if (payment.status === 'paid') {
      const status = await getAccessStatus(req.user._id);
      return res.json({ success: true, status, orderId: payment.orderId, reused: true });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Payment is not pending.' });
    }
    if (payment.expiresAt < new Date()) {
      payment.status = 'cancelled';
      await payment.save();
      return res.status(400).json({
        success: false,
        message: 'Payment session expired. Please start checkout again.',
      });
    }

    const last4 =
      bodyLast4 && String(bodyLast4).replace(/\D/g, '').slice(-4).length === 4
        ? String(bodyLast4).replace(/\D/g, '').slice(-4)
        : cardCheck.cardLast4;

    const wantAutoRenew = autoRenew === true || autoRenew === 'true';

    payment.status = 'paid';
    payment.cardLast4 = last4;
    const summary =
      payment.orderSummary?.toObject?.() ||
      (typeof payment.orderSummary === 'object' ? { ...payment.orderSummary } : {});
    payment.orderSummary = { ...summary, autoRenew: wantAutoRenew };
    payment.markModified('orderSummary');
    await payment.save();

    const subscription = await activateSubscriptionFromPayment({
      supplierId: req.user._id,
      payment,
      cardLast4: last4,
      autoRenew: wantAutoRenew,
    });

    sendSupplierBundleSubscriptionPaymentEmail(req.user, {
      payment,
      subscription,
      isRenewal: false,
    }).catch(() => {});

    const status = await getAccessStatus(req.user._id);
    return res.json({ success: true, status, orderId: payment.orderId });
  } catch (err) {
    console.error('[supplierBundle]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Payment confirmation failed.',
    });
  }
};

exports.cancelSubscriptionAutoRenew = async (req, res) => {
  try {
    if (!requireSupplier(req, res)) return;
    const result = await cancelAutoRenew(req.user._id);
    if (!result.ok) {
      return res.status(400).json({ success: false, message: result.message });
    }
    const status = await getAccessStatus(req.user._id);
    return res.json({
      success: true,
      status,
      message:
        result.message ||
        'Subscription cancelled. No refund for the current month; access continues until your period ends.',
    });
  } catch (err) {
    console.error('[supplierBundle]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Could not cancel auto-renew.',
    });
  }
};
