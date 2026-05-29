const EarningsTransaction = require('../models/EarningsTransaction');
const Payment = require('../models/Payment');
const PayoutRequest = require('../models/PayoutRequest');
const { roundCurrency } = require('../utils/earningsHelpers');

const CARD_PAYMENT_STATUSES = ['paid', 'consumed'];

function monthRange(year, monthIndex) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);
  return { start, end };
}

function parseDateRange(from, to) {
  const range = {};
  if (from) {
    const start = new Date(from);
    if (!Number.isNaN(start.getTime())) range.start = start;
  }
  if (to) {
    const end = new Date(to);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      range.end = end;
    }
  }
  return range;
}

function creditedAtMatch(range) {
  if (!range.start && !range.end) return {};
  const match = {};
  if (range.start || range.end) {
    match.creditedAt = {};
    if (range.start) match.creditedAt.$gte = range.start;
    if (range.end) match.creditedAt.$lte = range.end;
  }
  return match;
}

function createdAtMatch(range) {
  if (!range.start && !range.end) return {};
  const match = { createdAt: {} };
  if (range.start) match.createdAt.$gte = range.start;
  if (range.end) match.createdAt.$lte = range.end;
  return match;
}

function paidAtMatch(range) {
  if (!range.start && !range.end) return {};
  const match = { paidAt: { $ne: null } };
  if (range.start) match.paidAt.$gte = range.start;
  if (range.end) match.paidAt.$lte = range.end;
  return match;
}

function cardPaymentMatch() {
  return {
    status: { $in: CARD_PAYMENT_STATUSES },
    $or: [
      { 'orderSummary.paymentMethod': { $exists: false } },
      { 'orderSummary.paymentMethod': null },
      { 'orderSummary.paymentMethod': { $nin: ['cod', 'COD'] } },
    ],
  };
}

async function sumCommission(range) {
  const rows = await EarningsTransaction.aggregate([
    {
      $match: {
        roleType: 'supplier',
        platformFee: { $gt: 0 },
        ...creditedAtMatch(range),
      },
    },
    { $group: { _id: null, total: { $sum: '$platformFee' } } },
  ]);
  return roundCurrency(rows[0]?.total || 0);
}

async function sumCardInflows(range) {
  const rows = await Payment.aggregate([
    {
      $match: {
        ...cardPaymentMatch(),
        ...createdAtMatch(range),
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return roundCurrency(rows[0]?.total || 0);
}

async function sumFreeDonationSubsidies(range) {
  const rows = await EarningsTransaction.aggregate([
    {
      $match: {
        roleType: 'driver',
        sourceType: 'donation_delivery',
        ...creditedAtMatch(range),
      },
    },
    {
      $lookup: {
        from: 'donations',
        localField: 'donationId',
        foreignField: '_id',
        as: 'donation',
      },
    },
    { $unwind: '$donation' },
    { $match: { 'donation.deliveryPayer': 'platform' } },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $cond: [
              { $gt: ['$deliveryFeeAmount', 0] },
              '$deliveryFeeAmount',
              '$amount',
            ],
          },
        },
      },
    },
  ]);
  return roundCurrency(rows[0]?.total || 0);
}

async function sumPayoutOutflows(range) {
  const match = { status: 'paid', ...paidAtMatch(range) };
  if (!range.start && !range.end) {
    delete match.paidAt;
  }
  const rows = await PayoutRequest.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return roundCurrency(rows[0]?.total || 0);
}

async function sumPendingLiabilities() {
  const rows = await EarningsTransaction.aggregate([
    { $match: { status: 'available' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return roundCurrency(rows[0]?.total || 0);
}

function computeTrend(thisMonthVal, lastMonthVal) {
  const last = Number(lastMonthVal) || 0;
  const current = Number(thisMonthVal) || 0;
  if (last === 0) return current > 0 ? 100 : 0;
  return roundCurrency(((current - last) / last) * 100);
}

async function getFinanceSummary({ from, to } = {}) {
  const range = parseDateRange(from, to);
  const now = new Date();
  const thisMonth = monthRange(now.getFullYear(), now.getMonth());
  const lastMonth = monthRange(
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
    now.getMonth() === 0 ? 11 : now.getMonth() - 1
  );

  const [
    commissionRevenue,
    cardInflows,
    freeDonationSubsidies,
    payoutOutflows,
    pendingLiabilities,
    thisMonthCommission,
    lastMonthCommission,
    thisMonthCard,
    thisMonthSubsidies,
  ] = await Promise.all([
    sumCommission(range),
    sumCardInflows(range),
    sumFreeDonationSubsidies(range),
    sumPayoutOutflows(range),
    sumPendingLiabilities(),
    sumCommission(thisMonth),
    sumCommission(lastMonth),
    sumCardInflows(thisMonth),
    sumFreeDonationSubsidies(thisMonth),
  ]);

  const netPlatformPosition = roundCurrency(commissionRevenue - freeDonationSubsidies);
  const healthStatus = netPlatformPosition >= 0 ? 'healthy' : 'at_loss';
  const totalExpenses = roundCurrency(freeDonationSubsidies + payoutOutflows);

  return {
    summary: {
      commissionRevenue,
      cardInflows,
      freeDonationSubsidies,
      payoutOutflows,
      pendingLiabilities,
      netPlatformPosition,
      healthStatus,
      totalExpenses,
      thisMonthCommission,
      thisMonthCard,
      thisMonthSubsidies,
    },
    trend: {
      commissionTrend: computeTrend(thisMonthCommission, lastMonthCommission),
      thisMonthCommission,
      lastMonthCommission,
    },
  };
}

async function fetchCommissionLedgerRows(range) {
  const txs = await EarningsTransaction.find({
    roleType: 'supplier',
    platformFee: { $gt: 0 },
    ...creditedAtMatch(range),
  })
    .sort({ creditedAt: -1 })
    .limit(500)
    .lean();

  return txs.map((tx) => ({
    id: `commission-${tx._id}`,
    date: tx.creditedAt || tx.createdAt,
    type: 'commission',
    direction: 'in',
    amount: roundCurrency(tx.platformFee),
    referenceLabel: tx.referenceLabel || 'Marketplace commission',
    context: tx.sourceType === 'customer_order_delivery' ? 'customer_checkout' : 'donation_delivery',
    status: tx.status,
    meta: {
      grossAmount: tx.grossAmount ?? null,
      supplierNet: tx.amount ?? null,
      sourceType: tx.sourceType,
    },
  }));
}

async function fetchCardLedgerRows(range) {
  const payments = await Payment.find({
    ...cardPaymentMatch(),
    ...createdAtMatch(range),
  })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  return payments.map((p) => ({
    id: `card-${p._id}`,
    date: p.consumedAt || p.updatedAt || p.createdAt,
    type: 'card_payment',
    direction: 'in',
    amount: roundCurrency(p.amount),
    referenceLabel: p.orderId || 'Card payment',
    context:
      p.paymentContext === 'customer_checkout'
        ? 'customer_checkout'
        : p.paymentContext === 'supplier_ai_subscription'
          ? 'supplier_ai_subscription'
          : 'claim',
    status: p.status,
    meta: {
      paymentMethod: p.orderSummary?.paymentMethod || 'card',
      subtotal: p.orderSummary?.subtotal ?? null,
      deliveryFee: p.orderSummary?.deliveryFee ?? null,
      cardLast4: p.cardLast4 || null,
    },
  }));
}

async function fetchSubsidyLedgerRows(range) {
  const rows = await EarningsTransaction.aggregate([
    {
      $match: {
        roleType: 'driver',
        sourceType: 'donation_delivery',
        ...creditedAtMatch(range),
      },
    },
    {
      $lookup: {
        from: 'donations',
        localField: 'donationId',
        foreignField: '_id',
        as: 'donation',
      },
    },
    { $unwind: '$donation' },
    { $match: { 'donation.deliveryPayer': 'platform' } },
    { $sort: { creditedAt: -1 } },
    { $limit: 500 },
  ]);

  return rows.map((tx) => ({
    id: `subsidy-${tx._id}`,
    date: tx.creditedAt || tx.createdAt,
    type: 'free_donation_subsidy',
    direction: 'out',
    amount: roundCurrency(
      tx.deliveryFeeAmount > 0 ? tx.deliveryFeeAmount : tx.amount
    ),
    referenceLabel: tx.referenceLabel || tx.donation?.itemName || 'Free donation delivery',
    context: 'donation_delivery',
    status: tx.status,
    meta: {
      donationId: tx.donationId?.toString?.() || tx.donationId,
      deliveryPayer: 'platform',
    },
  }));
}

async function fetchPayoutLedgerRows(range) {
  const match = { status: 'paid' };
  const paidRange = paidAtMatch(range);
  if (paidRange.paidAt) {
    Object.assign(match, paidRange);
  }

  const payouts = await PayoutRequest.find(match)
    .sort({ paidAt: -1, createdAt: -1 })
    .limit(500)
    .populate('userId', 'email driverName restaurantName businessName')
    .lean();

  return payouts.map((p) => {
    const user = p.userId;
    const userLabel =
      user?.driverName ||
      user?.restaurantName ||
      user?.businessName ||
      user?.email ||
      'User';
    return {
      id: `payout-${p._id}`,
      date: p.paidAt || p.updatedAt || p.createdAt,
      type: 'payout',
      direction: 'out',
      amount: roundCurrency(p.amount),
      referenceLabel: `${p.roleType} payout — ${userLabel}`,
      context: 'payout',
      status: p.status,
      meta: {
        roleType: p.roleType,
        userId: user?._id?.toString?.() || p.userId?.toString?.(),
      },
    };
  });
}

const LEDGER_FETCHERS = {
  commission: fetchCommissionLedgerRows,
  card_payment: fetchCardLedgerRows,
  free_donation_subsidy: fetchSubsidyLedgerRows,
  payout: fetchPayoutLedgerRows,
};

async function getFinanceLedger({ type, from, to, page = 1, limit = 25 } = {}) {
  const range = parseDateRange(from, to);
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
  const normalizedType = String(type || 'all').trim().toLowerCase();

  let rows = [];
  if (normalizedType === 'all' || !normalizedType) {
    const [commission, card, subsidy, payout] = await Promise.all([
      fetchCommissionLedgerRows(range),
      fetchCardLedgerRows(range),
      fetchSubsidyLedgerRows(range),
      fetchPayoutLedgerRows(range),
    ]);
    rows = [...commission, ...card, ...subsidy, ...payout];
  } else if (LEDGER_FETCHERS[normalizedType]) {
    rows = await LEDGER_FETCHERS[normalizedType](range);
  }

  rows.sort((a, b) => new Date(b.date) - new Date(a.date));

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const start = (safePage - 1) * safeLimit;
  const ledger = rows.slice(start, start + safeLimit).map((row) => ({
    ...row,
    date: row.date ? new Date(row.date).toISOString() : null,
  }));

  return {
    ledger,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

module.exports = {
  getFinanceSummary,
  getFinanceLedger,
};
