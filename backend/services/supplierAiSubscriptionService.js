const Payment = require('../models/Payment');
const SupplierAiSubscription = require('../models/SupplierAiSubscription');
const User = require('../models/User');
const { addOneCalendarMonth, getColomboYearMonth } = require('../utils/colomboTime');
const {
  sendSupplierAiSubscriptionPaymentEmail,
  sendSupplierAiAutoRenewCancelledEmail,
} = require('../utils/sendNotificationEmail');
function getSubscriptionAmount() {
  return Number(process.env.SUPPLIER_AI_SUBSCRIPTION_LKR) || 5000;
}

function generateRenewalOrderId(supplierId) {
  const suffix = Date.now().toString(36).toUpperCase();
  const idPart = String(supplierId).slice(-8).toUpperCase().replace(/\W/g, '');
  return `FLAIR${idPart}${suffix}`.slice(0, 32);
}

async function findActiveSubscription(supplierId) {
  const sub = await SupplierAiSubscription.findOne({
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

/**
 * Activate or extend subscription after a successful payment.
 */
async function activateSubscriptionFromPayment({
  supplierId,
  payment,
  cardLast4,
  autoRenew,
}) {
  const now = new Date();
  const existing = await SupplierAiSubscription.findOne({ supplierId });
  const amount = payment.amount;
  const currency = payment.currency || 'LKR';

  let periodStart = now;
  let expiresAt = addOneCalendarMonth(now);

  if (existing && existing.status === 'active' && new Date(existing.expiresAt) > now) {
    periodStart = existing.periodStart || now;
    expiresAt = addOneCalendarMonth(existing.expiresAt);
  }

  const renewalEnabled = !!autoRenew;

  const sub = await SupplierAiSubscription.findOneAndUpdate(
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
    return { ok: false, message: 'No active subscription found.' };
  }
  if (!isAutoRenewEnabled(sub)) {
    return { ok: false, message: 'Automatic renewal is not enabled.' };
  }

  sub.autoRenew = false;
  sub.autoRenewCancelledAt = new Date();
  sub.nextRenewalAt = null;
  await sub.save();

  const user = await User.findById(supplierId).lean();
  if (user) {
    sendSupplierAiAutoRenewCancelledEmail(user, {
      expiresAt: sub.expiresAt,
      amount: sub.amount,
      currency: sub.currency,
    }).catch(() => {});
  }

  return { ok: true, subscription: sub };
}

async function processDueRenewals() {
  const now = new Date();
  const due = await SupplierAiSubscription.find({
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
      console.error('[supplierAiRenewal] failed for', sub.supplierId, err.message);
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
    paymentContext: 'supplier_ai_subscription',
    supplierId,
    amount,
    currency: sub.currency || 'LKR',
    status: 'paid',
    cardLast4: sub.cardLast4,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    orderSummary: {
      items: [
        {
          id: 'supplier-ai-sub-renewal',
          name: 'Supplier Tomorrow AI — monthly renewal',
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
    await sendSupplierAiSubscriptionPaymentEmail(user, {
      payment,
      subscription: sub,
      isRenewal: true,
    });
  }
}

function startRenewalScheduler() {
  const intervalMs = Number(process.env.SUPPLIER_AI_RENEWAL_INTERVAL_MS) || 6 * 60 * 60 * 1000;
  const run = () => {
    processDueRenewals().catch((err) => {
      console.error('[supplierAiRenewal] scheduler error:', err.message);
    });
  };
  run();
  setInterval(run, intervalMs);
  console.log(`Supplier AI auto-renewal scheduler every ${intervalMs / 1000}s`);
}

module.exports = {
  findActiveSubscription,
  isAutoRenewEnabled,
  activateSubscriptionFromPayment,
  cancelAutoRenew,
  processDueRenewals,
  startRenewalScheduler,
};
