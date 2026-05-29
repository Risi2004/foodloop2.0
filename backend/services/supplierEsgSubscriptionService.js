const Payment = require('../models/Payment');
const SupplierEsgSubscription = require('../models/SupplierEsgSubscription');
const User = require('../models/User');
const { addOneCalendarMonth, getColomboYearMonth } = require('../utils/colomboTime');
const {
  sendSupplierEsgSubscriptionPaymentEmail,
  sendSupplierEsgAutoRenewCancelledEmail,
} = require('../utils/sendNotificationEmail');
const { findActiveBundleSubscription } = require('./supplierPremiumAccess');

function getSubscriptionAmount() {
  return Number(process.env.SUPPLIER_ESG_SUBSCRIPTION_LKR) || 5000;
}

function generateRenewalOrderId(supplierId) {
  const suffix = Date.now().toString(36).toUpperCase();
  const idPart = String(supplierId).slice(-8).toUpperCase().replace(/\W/g, '');
  return `FLESG${idPart}${suffix}`.slice(0, 32);
}

async function findActiveSubscription(supplierId) {
  const sub = await SupplierEsgSubscription.findOne({
    supplierId,
    status: 'active',
  });

  if (!sub) return null;
  if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) {
    sub.status = 'expired';
    sub.autoRenew = false;
    await sub.save();
    return null;
  }
  return sub;
}

function isAutoRenewEnabled(sub) {
  return !!(sub?.autoRenew && !sub.autoRenewCancelledAt);
}

async function getAccessStatus(supplierId) {
  const bundle = await findActiveBundleSubscription(supplierId);
  const sub = await findActiveSubscription(supplierId);
  const amount = getSubscriptionAmount();

  if (bundle) {
    return {
      tier: 'premium',
      unlocked: true,
      source: 'bundle',
      bundleActive: true,
      bundleExpiresAt: bundle.expiresAt,
      expiresAt: bundle.expiresAt,
      autoRenew: false,
      autoRenewCancelledAt: null,
      subscriptionAmountLkr: amount,
    };
  }

  if (sub) {
    return {
      tier: 'premium',
      unlocked: true,
      source: 'esg',
      bundleActive: false,
      bundleExpiresAt: null,
      expiresAt: sub.expiresAt,
      autoRenew: isAutoRenewEnabled(sub),
      autoRenewCancelledAt: sub.autoRenewCancelledAt || null,
      subscriptionAmountLkr: amount,
    };
  }

  return {
    tier: 'locked',
    unlocked: false,
    source: 'free',
    bundleActive: false,
    bundleExpiresAt: null,
    expiresAt: null,
    autoRenew: false,
    autoRenewCancelledAt: null,
    subscriptionAmountLkr: amount,
  };
}

async function activateSubscriptionFromPayment({
  supplierId,
  payment,
  cardLast4,
  autoRenew,
}) {
  const now = new Date();
  const existing = await SupplierEsgSubscription.findOne({ supplierId });
  const amount = payment.amount;
  const currency = payment.currency || 'LKR';

  let periodStart = now;
  let expiresAt = addOneCalendarMonth(now);

  if (existing && existing.status === 'active' && new Date(existing.expiresAt) > now) {
    periodStart = existing.periodStart || now;
    expiresAt = addOneCalendarMonth(existing.expiresAt);
  }

  const renewalEnabled = !!autoRenew;

  const sub = await SupplierEsgSubscription.findOneAndUpdate(
    { supplierId },
    {
      supplierId,
      status: 'active',
      paidThroughMonth: getColomboYearMonth(expiresAt),
      periodStart,
      expiresAt,
      nextRenewalAt: renewalEnabled ? expiresAt : null,
      paymentId: payment._id,
      amount,
      currency,
      cardLast4: cardLast4 || payment.cardLast4 || null,
      autoRenew: renewalEnabled,
      autoRenewCancelledAt: renewalEnabled ? null : existing?.autoRenewCancelledAt || null,
    },
    { upsert: true, new: true }
  );

  return sub;
}

async function cancelAutoRenew(supplierId) {
  const sub = await findActiveSubscription(supplierId);
  if (!sub) {
    return { ok: false, message: 'No active ESG subscription found.' };
  }

  const wasRenewing = isAutoRenewEnabled(sub);
  if (wasRenewing) {
    sub.autoRenew = false;
    sub.autoRenewCancelledAt = new Date();
    sub.nextRenewalAt = null;
    await sub.save();

    const user = await User.findById(supplierId).lean();
    if (user) {
      sendSupplierEsgAutoRenewCancelledEmail(user, {
        expiresAt: sub.expiresAt,
        amount: sub.amount,
        currency: sub.currency,
      }).catch(() => {});
    }
  }

  const until = sub.expiresAt
    ? new Date(sub.expiresAt).toLocaleDateString('en-LK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'the end of your billing period';

  const message = wasRenewing
    ? `Subscription cancelled. No refund for the current month. ESG access continues until ${until}. You will not be charged again.`
    : `No further charges are scheduled. ESG access continues until ${until}. Payments are non-refundable for the current month.`;

  return { ok: true, subscription: sub, wasRenewing, message };
}

async function processDueRenewals() {
  const now = new Date();
  const due = await SupplierEsgSubscription.find({
    status: 'active',
    autoRenew: true,
    autoRenewCancelledAt: null,
    nextRenewalAt: { $lte: now },
    expiresAt: { $lte: now },
  }).limit(50);

  for (const sub of due) {
    try {
      await renewSubscription(sub);
    } catch (err) {
      console.error('[supplierEsgRenewal] failed for', sub.supplierId, err.message);
      sub.autoRenew = false;
      sub.nextRenewalAt = null;
      await sub.save();
    }
  }
}

async function renewSubscription(sub) {
  const supplierId = sub.supplierId;
  const amount = getSubscriptionAmount();
  const orderId = generateRenewalOrderId(supplierId.toString());

  const payment = await Payment.create({
    orderId,
    paymentContext: 'supplier_esg_subscription',
    supplierId,
    amount,
    currency: sub.currency || 'LKR',
    status: 'paid',
    cardLast4: sub.cardLast4,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    orderSummary: {
      items: [
        {
          id: 'supplier-esg-sub-renewal',
          name: 'ESG & CSR Dashboard — monthly renewal',
          quantity: 1,
          unitPrice: amount,
          lineTotal: amount,
        },
      ],
      subtotal: amount,
      deliveryFee: 0,
      total: amount,
      paymentMethod: 'card',
      autoRenew: true,
    },
  });

  const periodStart = sub.expiresAt || new Date();
  const expiresAt = addOneCalendarMonth(periodStart);

  sub.status = 'active';
  sub.periodStart = periodStart;
  sub.expiresAt = expiresAt;
  sub.nextRenewalAt = expiresAt;
  sub.paymentId = payment._id;
  sub.amount = amount;
  sub.paidThroughMonth = getColomboYearMonth(expiresAt);
  await sub.save();

  const user = await User.findById(supplierId).lean();
  if (user) {
    await sendSupplierEsgSubscriptionPaymentEmail(user, {
      payment,
      subscription: sub,
      isRenewal: true,
    });
  }
}

module.exports = {
  getSubscriptionAmount,
  findActiveSubscription,
  isAutoRenewEnabled,
  getAccessStatus,
  activateSubscriptionFromPayment,
  cancelAutoRenew,
  processDueRenewals,
};
