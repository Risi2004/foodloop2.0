const mongoose = require('mongoose');
const EarningsTransaction = require('../models/EarningsTransaction');
const PayoutRequest = require('../models/PayoutRequest');
const Payment = require('../models/Payment');
const Donation = require('../models/Donation');
const CustomerOrder = require('../models/CustomerOrder');
const User = require('../models/User');
const { DRIVER_EARNINGS_LKR } = require('../utils/distance');
const {
  reverseCommission,
  platformFee,
  roundCurrency,
  getMinPayoutAmount,
} = require('../utils/earningsHelpers');
const {
  sendPayoutSubmittedEmail,
  sendPayoutApprovedEmail,
  sendPayoutRejectedEmail,
  sendPayoutPaidEmail,
  sendPayoutAdminAlertEmail,
} = require('../utils/sendNotificationEmail');
const { addWorkingDays } = require('../utils/workingDays');

async function createTransactionIfNotExists(payload) {
  try {
    const doc = await EarningsTransaction.create(payload);
    return doc;
  } catch (err) {
    if (err && err.code === 11000) return null;
    throw err;
  }
}

async function creditDriverDelivery({
  driverId,
  sourceType,
  sourceId,
  referenceLabel,
  donationId,
  customerOrderId,
  paymentId,
  amount,
  paymentMethod,
  codAmountCollected,
  deliveryFeeAmount,
  foodSubtotal,
}) {
  if (!driverId || !sourceId) return null;
  const payout = amount != null && Number(amount) > 0 ? Number(amount) : DRIVER_EARNINGS_LKR;
  const feeAmount = deliveryFeeAmount != null ? Number(deliveryFeeAmount) : payout;
  return createTransactionIfNotExists({
    userId: driverId,
    roleType: 'driver',
    amount: roundCurrency(payout),
    currency: 'LKR',
    sourceType,
    sourceId,
    referenceLabel: referenceLabel || 'Delivery completed',
    donationId: donationId || null,
    customerOrderId: customerOrderId || null,
    paymentId: paymentId || null,
    grossAmount: null,
    platformFee: null,
    paymentMethod: paymentMethod || null,
    codAmountCollected:
      codAmountCollected != null && Number(codAmountCollected) > 0
        ? roundCurrency(Number(codAmountCollected))
        : null,
    deliveryFeeAmount: roundCurrency(feeAmount),
    foodSubtotal:
      foodSubtotal != null && Number(foodSubtotal) > 0
        ? roundCurrency(Number(foodSubtotal))
        : null,
    status: 'available',
    creditedAt: new Date(),
  });
}

async function creditSupplierFromDonationDelivery(donation) {
  if (!donation || donation.listingType !== 'sell') return null;
  const donorId = donation.donorId?._id || donation.donorId;
  if (!donorId) return null;

  const payment = await Payment.findOne({
    $or: [{ donationId: donation._id }, { claimedDonationId: donation._id }],
    status: { $in: ['paid', 'consumed'] },
  }).sort({ consumedAt: -1, updatedAt: -1 });

  let gross = 0;
  if (payment) {
    gross = Number(payment.amount || 0);
  } else if (donation.priceAmount > 0) {
    gross = Number(donation.priceAmount || 0);
  }

  if (gross <= 0) return null;

  const net = reverseCommission(gross);
  const fee = platformFee(gross);
  const label = donation.itemName || 'Sell listing delivery';

  return createTransactionIfNotExists({
    userId: donorId,
    roleType: 'supplier',
    amount: net,
    currency: donation.priceCurrency || 'LKR',
    sourceType: 'donation_delivery',
    sourceId: donation._id,
    referenceLabel: label,
    paymentId: payment?._id || null,
    donationId: donation._id,
    customerOrderId: null,
    grossAmount: gross,
    platformFee: fee,
    status: 'available',
    creditedAt: new Date(),
  });
}

async function creditSuppliersFromCustomerOrder(customerOrder) {
  if (!customerOrder) return [];

  const items = Array.isArray(customerOrder.orderSummary?.items)
    ? customerOrder.orderSummary.items
    : [];
  if (!items.length) return [];

  const supplierTotals = new Map();

  for (const item of items) {
    const itemId = item.id;
    if (!itemId || !mongoose.Types.ObjectId.isValid(String(itemId))) continue;

    const donation = await Donation.findById(itemId);
    if (!donation || donation.listingType !== 'sell') continue;

    const donorId = donation.donorId?.toString?.() || String(donation.donorId);
    if (!donorId) continue;

    const lineGross = roundCurrency(Number(item.lineTotal ?? Number(item.unitPrice || 0) * Number(item.quantity || 1)));
    if (lineGross <= 0) continue;

    const prev = supplierTotals.get(donorId) || { gross: 0, labels: [] };
    prev.gross = roundCurrency(prev.gross + lineGross);
    prev.labels.push(donation.itemName || item.name || 'Item');
    supplierTotals.set(donorId, prev);
  }

  const results = [];
  for (const [donorId, data] of supplierTotals.entries()) {
    const gross = data.gross;
    const net = reverseCommission(gross);
    const fee = platformFee(gross);
    const label =
      data.labels.length > 1
        ? `${data.labels[0]} + ${data.labels.length - 1} more`
        : data.labels[0] || customerOrder.orderId;

    const doc = await createTransactionIfNotExists({
      userId: donorId,
      roleType: 'supplier',
      amount: net,
      currency: customerOrder.currency || 'LKR',
      sourceType: 'customer_order_delivery',
      sourceId: customerOrder._id,
      referenceLabel: label,
      paymentId: customerOrder.paymentId || null,
      donationId: null,
      customerOrderId: customerOrder._id,
      grossAmount: gross,
      platformFee: fee,
      status: 'available',
      creditedAt: new Date(),
    });
    if (doc) results.push(doc);
  }

  return results;
}

async function creditDeliveryEarnings({ donation, customerOrder, driverId }) {
  const credited = { driver: null, suppliers: [] };

  if (customerOrder) {
    const deliveryFee =
      Number(customerOrder.orderSummary?.deliveryFee) > 0
        ? Number(customerOrder.orderSummary.deliveryFee)
        : DRIVER_EARNINGS_LKR;
    const foodSubtotal = Number(customerOrder.orderSummary?.subtotal || 0);
    const paymentMethod = customerOrder.paymentMethod === 'cod' ? 'cod' : 'card';
    const codAmountCollected =
      paymentMethod === 'cod' ? Number(customerOrder.codAmount || 0) : null;

    credited.driver = await creditDriverDelivery({
      driverId,
      sourceType: 'customer_order_delivery',
      sourceId: customerOrder._id,
      referenceLabel: customerOrder.orderId || 'Customer order delivery',
      customerOrderId: customerOrder._id,
      paymentId: customerOrder.paymentId || null,
      amount: deliveryFee,
      paymentMethod,
      codAmountCollected,
      deliveryFeeAmount: deliveryFee,
      foodSubtotal: foodSubtotal > 0 ? foodSubtotal : null,
    });
    credited.suppliers = await creditSuppliersFromCustomerOrder(customerOrder);
    return credited;
  }

  if (donation) {
    const driverAmount =
      donation.deliveryFeeFinal != null && Number(donation.deliveryFeeFinal) > 0
        ? Number(donation.deliveryFeeFinal)
        : DRIVER_EARNINGS_LKR;
    const donationPaymentMethod =
      donation.deliveryPayer === 'receiver' ? 'card' : donation.deliveryPayer === 'platform' ? null : null;
    credited.driver = await creditDriverDelivery({
      driverId,
      sourceType: 'donation_delivery',
      sourceId: donation._id,
      referenceLabel: donation.itemName || 'Donation delivery',
      donationId: donation._id,
      amount: driverAmount,
      deliveryFeeAmount: driverAmount,
      paymentMethod: donationPaymentMethod,
    });
    credited.suppliers = [await creditSupplierFromDonationDelivery(donation)].filter(Boolean);
  }

  return credited;
}

function monthRange(year, monthIndex) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);
  return { start, end };
}

async function sumAmounts(userId, matchExtra = {}) {
  const rows = await EarningsTransaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(String(userId)), ...matchExtra } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return roundCurrency(rows[0]?.total || 0);
}

async function sumField(userId, field, matchExtra = {}) {
  const rows = await EarningsTransaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(String(userId)),
        [field]: { $ne: null },
        ...matchExtra,
      },
    },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);
  return roundCurrency(rows[0]?.total || 0);
}

async function getEarningsSummary(userId, { isDriver = false } = {}) {
  const uid = new mongoose.Types.ObjectId(String(userId));
  const now = new Date();
  const thisMonth = monthRange(now.getFullYear(), now.getMonth());
  const lastMonth = monthRange(
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
    now.getMonth() === 0 ? 11 : now.getMonth() - 1
  );

  const [totalEarned, availableBalance, paidOut, pendingPayout, thisMonthEarned, lastMonthEarned, transactionCount] =
    await Promise.all([
      sumAmounts(uid),
      sumAmounts(uid, { status: 'available' }),
      sumAmounts(uid, { status: 'paid_out' }),
      PayoutRequest.aggregate([
        {
          $match: {
            userId: uid,
            status: { $in: ['pending', 'approved'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).then((r) => roundCurrency(r[0]?.total || 0)),
      EarningsTransaction.aggregate([
        {
          $match: {
            userId: uid,
            creditedAt: { $gte: thisMonth.start, $lt: thisMonth.end },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).then((r) => roundCurrency(r[0]?.total || 0)),
      EarningsTransaction.aggregate([
        {
          $match: {
            userId: uid,
            creditedAt: { $gte: lastMonth.start, $lt: lastMonth.end },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).then((r) => roundCurrency(r[0]?.total || 0)),
      EarningsTransaction.countDocuments({ userId: uid }),
    ]);

  let earningsTrend = 0;
  if (lastMonthEarned > 0) {
    earningsTrend = Math.round(((thisMonthEarned - lastMonthEarned) / lastMonthEarned) * 100);
  } else if (thisMonthEarned > 0) {
    earningsTrend = 100;
  }

  const summary = {
    totalEarned,
    availableBalance,
    pendingPayout,
    paidOut,
    thisMonthEarned,
    lastMonthEarned,
    earningsTrend,
    transactionCount,
    minPayoutAmount: getMinPayoutAmount(),
  };

  if (isDriver) {
    const [totalCodCashCollected, thisMonthCodCashCollected, totalDeliveryFeesEarned] =
      await Promise.all([
        sumField(uid, 'codAmountCollected'),
        sumField(uid, 'codAmountCollected', {
          creditedAt: { $gte: thisMonth.start, $lt: thisMonth.end },
        }),
        sumField(uid, 'deliveryFeeAmount', { roleType: 'driver' }).then((v) =>
          v > 0 ? v : totalEarned
        ),
      ]);
    summary.totalCodCashCollected = totalCodCashCollected;
    summary.thisMonthCodCashCollected = thisMonthCodCashCollected;
    summary.totalDeliveryFeesEarned = totalDeliveryFeesEarned;
    summary.isDriver = true;
  }

  return summary;
}

async function enrichDriverTransaction(tx) {
  const json = tx.toPublicJSON();
  if (json.paymentMethod != null || json.roleType !== 'driver') {
    return json;
  }

  if (json.sourceType === 'customer_order_delivery' && json.customerOrderId) {
    const order = await CustomerOrder.findById(json.customerOrderId).lean();
    if (order) {
      const deliveryFee =
        Number(order.orderSummary?.deliveryFee) > 0
          ? Number(order.orderSummary.deliveryFee)
          : json.amount;
      json.paymentMethod = order.paymentMethod === 'cod' ? 'cod' : 'card';
      json.deliveryFeeAmount = json.deliveryFeeAmount ?? deliveryFee;
      if (order.paymentMethod === 'cod') {
        json.codAmountCollected = json.codAmountCollected ?? Number(order.codAmount || 0);
      }
      json.foodSubtotal =
        json.foodSubtotal ?? (Number(order.orderSummary?.subtotal) > 0 ? Number(order.orderSummary.subtotal) : null);
    }
  } else if (json.sourceType === 'donation_delivery') {
    json.deliveryFeeAmount = json.deliveryFeeAmount ?? json.amount;
  }

  return json;
}

async function getRecentTransactions(userId, { limit = 20, page = 1, isDriver = false } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const filter = { userId };
  const [transactions, total] = await Promise.all([
    EarningsTransaction.find(filter).sort({ creditedAt: -1 }).skip(skip).limit(safeLimit),
    EarningsTransaction.countDocuments(filter),
  ]);

  let mapped = transactions.map((t) => t.toPublicJSON());
  if (isDriver) {
    mapped = await Promise.all(transactions.map((t) => enrichDriverTransaction(t)));
  }

  return {
    transactions: mapped,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
}

async function getUserPayoutRequests(userId) {
  const rows = await PayoutRequest.find({ userId }).sort({ createdAt: -1 }).limit(50);
  return rows.map((r) => r.toPublicJSON());
}

async function getAvailableBalance(userId) {
  return sumAmounts(userId, { status: 'available' });
}

async function lockTransactionsForPayout(userId, amount, payoutRequestId, session) {
  const requested = roundCurrency(amount);
  const lockedIds = [];
  let lockedSum = 0;

  const txs = await EarningsTransaction.find({ userId, status: 'available' })
    .sort({ creditedAt: 1 })
    .session(session || null);

  for (const tx of txs) {
    if (lockedSum >= requested) break;
    tx.status = 'locked';
    tx.payoutRequestId = payoutRequestId;
    await tx.save({ session: session || undefined });
    lockedIds.push(tx._id);
    lockedSum = roundCurrency(lockedSum + tx.amount);
  }

  if (lockedSum < requested) {
    throw new Error('Could not lock enough transactions for this payout amount.');
  }

  return { lockedIds, lockedSum };
}

async function unlockTransactionsForPayout(payoutRequestId, session) {
  await EarningsTransaction.updateMany(
    { payoutRequestId, status: 'locked' },
    { $set: { status: 'available', payoutRequestId: null } },
    { session: session || undefined }
  );
}

async function createPayoutRequest(user, payload) {
  const amount = roundCurrency(payload.amount);
  const minPayout = getMinPayoutAmount();

  if (amount < minPayout) {
    throw Object.assign(new Error(`Minimum payout amount is LKR ${minPayout}.`), { statusCode: 400 });
  }

  const available = await getAvailableBalance(user._id);
  if (amount > available) {
    throw Object.assign(new Error('Requested amount exceeds available balance.'), { statusCode: 400 });
  }

  const existingOpen = await PayoutRequest.findOne({
    userId: user._id,
    status: { $in: ['pending', 'approved'] },
  });
  if (existingOpen) {
    throw Object.assign(new Error('You already have an open payout request.'), { statusCode: 409 });
  }

  const bankAccountName = String(payload.bankAccountName || user.payoutAccountName || '').trim();
  const bankName = String(payload.bankName || user.payoutBankName || '').trim();
  const bankAccountNumber = String(payload.bankAccountNumber || user.payoutAccountNumber || '').trim();
  const bankBranch = String(payload.bankBranch || user.payoutBranch || '').trim();

  if (!bankAccountName || !bankName || !bankAccountNumber) {
    throw Object.assign(new Error('Bank account name, bank name, and account number are required.'), {
      statusCode: 400,
    });
  }

  const roleType = String(payload.roleType || '').toLowerCase() === 'driver' ? 'driver' : 'supplier';

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const payout = await PayoutRequest.create(
      [
        {
          userId: user._id,
          roleType,
          amount,
          currency: 'LKR',
          status: 'pending',
          bankAccountName,
          bankName,
          bankAccountNumber,
          bankBranch,
          transactionIds: [],
        },
      ],
      { session }
    );
    const payoutDoc = payout[0];
    const { lockedIds, lockedSum } = await lockTransactionsForPayout(
      user._id,
      amount,
      payoutDoc._id,
      session
    );
    payoutDoc.amount = lockedSum;
    payoutDoc.transactionIds = lockedIds;
    await payoutDoc.save({ session });

    user.payoutAccountName = bankAccountName;
    user.payoutBankName = bankName;
    user.payoutAccountNumber = bankAccountNumber;
    user.payoutBranch = bankBranch;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    sendPayoutSubmittedEmail(user, payoutDoc).catch(() => {});
    sendPayoutAdminAlertEmail(user, payoutDoc).catch(() => {});

    return payoutDoc.toPublicJSON();
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

async function updatePayoutProfile(user, payload) {
  if (payload.bankAccountName != null) user.payoutAccountName = String(payload.bankAccountName).trim();
  if (payload.bankName != null) user.payoutBankName = String(payload.bankName).trim();
  if (payload.bankAccountNumber != null) user.payoutAccountNumber = String(payload.bankAccountNumber).trim();
  if (payload.bankBranch != null) user.payoutBranch = String(payload.bankBranch).trim();
  await user.save();
  return {
    payoutAccountName: user.payoutAccountName,
    payoutBankName: user.payoutBankName,
    payoutAccountNumber: user.payoutAccountNumber,
    payoutBranch: user.payoutBranch,
  };
}

async function listAdminPayoutRequests({ status } = {}) {
  const filter = {};
  if (status) filter.status = status;
  const rows = await PayoutRequest.find(filter)
    .populate('userId', 'email username businessName driverName role contactNo')
    .sort({ createdAt: -1 })
    .limit(200);
  return rows.map((row) => {
    const base = row.toPublicJSON();
    const u = row.userId;
    base.user = u
      ? {
          id: u._id?.toString?.() || u.id,
          email: u.email,
          name: u.driverName || u.businessName || u.username || u.email,
          role: u.role,
          contactNo: u.contactNo,
        }
      : null;
    return base;
  });
}

async function getAdminPayoutRequestDetail(payoutId) {
  const payout = await PayoutRequest.findById(payoutId).populate(
    'userId',
    'email username businessName driverName role contactNo'
  );
  if (!payout) throw Object.assign(new Error('Payout request not found.'), { statusCode: 404 });

  const txIds = payout.transactionIds || [];
  const transactions = txIds.length
    ? await EarningsTransaction.find({ _id: { $in: txIds } })
        .populate('donationId', 'itemName trackingId deliveredAt status listingType')
        .populate('customerOrderId', 'orderId status deliveredAt')
        .sort({ creditedAt: -1 })
    : [];

  const base = payout.toPublicJSON();
  const u = payout.userId;
  base.user = u
    ? {
        id: u._id?.toString?.() || u.id,
        email: u.email,
        name: u.driverName || u.businessName || u.username || u.email,
        role: u.role,
        contactNo: u.contactNo,
      }
    : null;

  base.transactions = transactions.map((tx) => {
    const json = tx.toPublicJSON();
    const donation = tx.donationId;
    const customerOrder = tx.customerOrderId;
    json.source = donation
      ? {
          type: 'donation',
          itemName: donation.itemName,
          trackingId: donation.trackingId,
          status: donation.status,
          listingType: donation.listingType,
          deliveredAt: donation.deliveredAt || null,
        }
      : customerOrder
        ? {
            type: 'customer_order',
            orderId: customerOrder.orderId,
            status: customerOrder.status,
            deliveredAt: customerOrder.deliveredAt || null,
          }
        : null;
    return json;
  });

  return base;
}

async function approvePayoutRequest(payoutId, adminUser, adminNote) {
  const payout = await PayoutRequest.findById(payoutId).populate('userId');
  if (!payout) throw Object.assign(new Error('Payout request not found.'), { statusCode: 404 });
  if (payout.status !== 'pending') {
    throw Object.assign(new Error('Only pending requests can be approved.'), { statusCode: 400 });
  }

  payout.status = 'approved';
  payout.processedBy = adminUser._id;
  payout.processedAt = new Date();
  payout.expectedTransferBy = addWorkingDays(new Date(), 2);
  if (adminNote) payout.adminNote = String(adminNote).trim();
  await payout.save();

  if (payout.userId) sendPayoutApprovedEmail(payout.userId, payout).catch(() => {});
  return payout.toPublicJSON();
}

async function rejectPayoutRequest(payoutId, adminUser, adminNote) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const payout = await PayoutRequest.findById(payoutId).session(session).populate('userId');
    if (!payout) throw Object.assign(new Error('Payout request not found.'), { statusCode: 404 });
    if (!['pending', 'approved'].includes(payout.status)) {
      throw Object.assign(new Error('This payout request cannot be rejected.'), { statusCode: 400 });
    }

    payout.status = 'rejected';
    payout.processedBy = adminUser._id;
    payout.processedAt = new Date();
    payout.adminNote = adminNote ? String(adminNote).trim() : payout.adminNote;
    await payout.save({ session });
    await unlockTransactionsForPayout(payout._id, session);
    await session.commitTransaction();
    session.endSession();

    if (payout.userId) sendPayoutRejectedEmail(payout.userId, payout).catch(() => {});
    return payout.toPublicJSON();
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

async function markPayoutPaid(payoutId, adminUser) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const payout = await PayoutRequest.findById(payoutId).session(session).populate('userId');
    if (!payout) throw Object.assign(new Error('Payout request not found.'), { statusCode: 404 });
    if (payout.status !== 'approved') {
      throw Object.assign(new Error('Only approved requests can be marked as paid.'), { statusCode: 400 });
    }

    payout.status = 'paid';
    payout.paidAt = new Date();
    payout.processedBy = adminUser._id;
    payout.processedAt = new Date();
    await payout.save({ session });

    await EarningsTransaction.updateMany(
      { payoutRequestId: payout._id, status: 'locked' },
      { $set: { status: 'paid_out' } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    if (payout.userId) sendPayoutPaidEmail(payout.userId, payout).catch(() => {});
    return payout.toPublicJSON();
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

module.exports = {
  creditDeliveryEarnings,
  creditDriverDelivery,
  creditSupplierFromDonationDelivery,
  creditSuppliersFromCustomerOrder,
  getEarningsSummary,
  getRecentTransactions,
  getUserPayoutRequests,
  getAvailableBalance,
  createPayoutRequest,
  updatePayoutProfile,
  listAdminPayoutRequests,
  getAdminPayoutRequestDetail,
  approvePayoutRequest,
  rejectPayoutRequest,
  markPayoutPaid,
};
