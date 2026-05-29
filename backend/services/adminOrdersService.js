const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const Payment = require('../models/Payment');
const CustomerOrder = require('../models/CustomerOrder');
const User = require('../models/User');

const USER_FIELDS = 'email username businessName driverName receiverName role contactNo';

function userDisplayName(user) {
  if (!user) return '—';
  return (
    user.driverName ||
    user.businessName ||
    user.receiverName ||
    user.username ||
    user.email ||
    '—'
  );
}

function partyFromUser(user) {
  if (!user) return null;
  return {
    id: user._id?.toString?.() || user.id || user,
    name: userDisplayName(user),
    email: user.email || null,
    role: user.role || null,
  };
}

function buildDateFilter(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return {};
  const filter = {};
  if (dateFrom) filter.$gte = new Date(dateFrom);
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    filter.$lte = end;
  }
  return { createdAt: filter };
}

function matchesSearch(text, search) {
  if (!search) return true;
  return String(text || '').toLowerCase().includes(search.toLowerCase());
}

function normalizeDonationRow(donation) {
  const d = donation.toPublicJSON ? donation.toPublicJSON() : donation;
  const donor = donation.donorId;
  const receiver = donation.receiverId;
  const driver = donation.driverId;

  return {
    id: d.id,
    orderType: 'donation',
    referenceId: d.trackingId || d.id,
    title: d.itemName || 'Donation',
    status: d.status,
    listingType: d.listingType,
    amount: d.priceAmount ?? null,
    currency: d.priceCurrency || 'LKR',
    parties: {
      donor: partyFromUser(donor),
      receiver: partyFromUser(receiver),
      driver: partyFromUser(driver),
    },
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

function normalizeClaimPaymentRow(payment) {
  const p = payment.toObject ? payment.toObject() : payment;
  const receiver = payment.receiverId;
  const donation = payment.donationId;
  const summary = p.orderSummary || {};

  return {
    id: p._id.toString(),
    orderType: 'claim_payment',
    referenceId: p.orderId,
    title: donation?.itemName || summary.itemName || 'Claim payment',
    status: p.status,
    amount: p.amount,
    currency: p.currency || 'LKR',
    parties: {
      receiver: partyFromUser(receiver),
      donor: partyFromUser(donation?.donorId),
    },
    donationTrackingId: donation?.trackingId || null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function normalizeCustomerOrderRow(order) {
  const o = order.toPublicJSON ? order.toPublicJSON() : order;
  const customer = order.customerId;
  const driver = order.driverId;
  const summary = o.orderSummary || {};

  return {
    id: o.id,
    orderType: 'customer_order',
    referenceId: o.orderId,
    title: summary.items?.[0]?.name || 'Customer order',
    status: o.status,
    amount: summary.total ?? o.codAmount ?? null,
    currency: o.currency || 'LKR',
    paymentMethod: o.paymentMethod,
    parties: {
      customer: partyFromUser(customer),
      driver: partyFromUser(driver),
    },
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

function filterBySearch(row, search) {
  if (!search) return true;
  const parts = [
    row.referenceId,
    row.title,
    row.parties?.donor?.name,
    row.parties?.donor?.email,
    row.parties?.receiver?.name,
    row.parties?.receiver?.email,
    row.parties?.customer?.name,
    row.parties?.customer?.email,
    row.parties?.driver?.name,
    row.parties?.driver?.email,
    row.donationTrackingId,
  ];
  return parts.some((p) => matchesSearch(p, search));
}

async function fetchDonationOrders({ status, search, dateFrom, dateTo, userId }) {
  const filter = { status: { $ne: 'draft' }, ...buildDateFilter(dateFrom, dateTo) };
  if (status) filter.status = status;
  if (userId) {
    filter.$or = [{ donorId: userId }, { receiverId: userId }, { driverId: userId }];
  }

  const rows = await Donation.find(filter)
    .populate('donorId', USER_FIELDS)
    .populate('receiverId', USER_FIELDS)
    .populate('driverId', USER_FIELDS)
    .sort({ createdAt: -1 })
    .limit(500)
    .lean(false);

  return rows.map(normalizeDonationRow).filter((row) => filterBySearch(row, search));
}

async function fetchClaimPaymentOrders({ status, search, dateFrom, dateTo, userId }) {
  const filter = { paymentContext: 'claim', ...buildDateFilter(dateFrom, dateTo) };
  if (status) filter.status = status;
  if (userId) filter.receiverId = userId;

  const rows = await Payment.find(filter)
    .populate('receiverId', USER_FIELDS)
    .populate({
      path: 'donationId',
      select: 'itemName trackingId donorId listingType',
      populate: { path: 'donorId', select: USER_FIELDS },
    })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean(false);

  return rows.map(normalizeClaimPaymentRow).filter((row) => filterBySearch(row, search));
}

async function fetchCustomerOrders({ status, search, dateFrom, dateTo, userId }) {
  const filter = { ...buildDateFilter(dateFrom, dateTo) };
  if (status) filter.status = status;
  if (userId) {
    filter.$or = [{ customerId: userId }, { driverId: userId }];
  }

  const rows = await CustomerOrder.find(filter)
    .populate('customerId', USER_FIELDS)
    .populate('driverId', USER_FIELDS)
    .sort({ createdAt: -1 })
    .limit(500)
    .lean(false);

  return rows.map(normalizeCustomerOrderRow).filter((row) => filterBySearch(row, search));
}

async function listAllOrders(options = {}) {
  const { type, status, search, page = 1, limit = 25, dateFrom, dateTo, userId } = options;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

  let userObjectId = null;
  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw Object.assign(new Error('Invalid user id.'), { statusCode: 400 });
    }
    userObjectId = new mongoose.Types.ObjectId(userId);
  }

  const fetchOpts = { status, search: search?.trim(), dateFrom, dateTo, userId: userObjectId };
  const batches = [];

  if (!type || type === 'donation') {
    batches.push(fetchDonationOrders(fetchOpts));
  }
  if (!type || type === 'claim_payment') {
    batches.push(fetchClaimPaymentOrders(fetchOpts));
  }
  if (!type || type === 'customer_order') {
    batches.push(fetchCustomerOrders(fetchOpts));
  }

  const results = await Promise.all(batches);
  const merged = results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = merged.length;
  const start = (pageNum - 1) * limitNum;
  const orders = merged.slice(start, start + limitNum);

  return {
    orders,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

async function getOrderDetail(orderType, id) {
  if (orderType === 'donation') {
    const donation = await Donation.findById(id)
      .populate('donorId', USER_FIELDS)
      .populate('receiverId', USER_FIELDS)
      .populate('driverId', USER_FIELDS);
    if (!donation) throw Object.assign(new Error('Order not found.'), { statusCode: 404 });
    return {
      orderType: 'donation',
      summary: normalizeDonationRow(donation),
      detail: donation.toPublicJSON(),
      parties: {
        donor: partyFromUser(donation.donorId),
        receiver: partyFromUser(donation.receiverId),
        driver: partyFromUser(donation.driverId),
      },
    };
  }

  if (orderType === 'claim_payment') {
    const payment = await Payment.findById(id)
      .populate('receiverId', USER_FIELDS)
      .populate({
        path: 'donationId',
        populate: [
          { path: 'donorId', select: USER_FIELDS },
          { path: 'receiverId', select: USER_FIELDS },
          { path: 'driverId', select: USER_FIELDS },
        ],
      });
    if (!payment) throw Object.assign(new Error('Order not found.'), { statusCode: 404 });
    const paymentObj = payment.toObject();
    paymentObj.id = payment._id.toString();
    return {
      orderType: 'claim_payment',
      summary: normalizeClaimPaymentRow(payment),
      detail: {
        ...paymentObj,
        id: payment._id.toString(),
        receiver: partyFromUser(payment.receiverId),
        donation: payment.donationId?.toPublicJSON?.() || payment.donationId,
      },
      parties: {
        receiver: partyFromUser(payment.receiverId),
        donor: partyFromUser(payment.donationId?.donorId),
      },
    };
  }

  if (orderType === 'customer_order') {
    const order = await CustomerOrder.findById(id)
      .populate('customerId', USER_FIELDS)
      .populate('driverId', USER_FIELDS)
      .populate('paymentId');
    if (!order) throw Object.assign(new Error('Order not found.'), { statusCode: 404 });
    const payment = order.paymentId;
    return {
      orderType: 'customer_order',
      summary: normalizeCustomerOrderRow(order),
      detail: {
        ...order.toPublicJSON(),
        payment: payment
          ? {
              id: payment._id.toString(),
              orderId: payment.orderId,
              status: payment.status,
              amount: payment.amount,
              cardLast4: payment.cardLast4,
              orderSummary: payment.orderSummary,
            }
          : null,
      },
      parties: {
        customer: partyFromUser(order.customerId),
        driver: partyFromUser(order.driverId),
      },
    };
  }

  throw Object.assign(new Error('Invalid order type.'), { statusCode: 400 });
}

async function getUserMonitoringList({ search, role, status, page = 1, limit = 25 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const query = { role: { $ne: 'Admin' } };

  if (role) {
    const r = String(role).trim();
    if (r === 'Receiver') query.role = 'receiver';
    else if (r === 'Driver') query.role = 'driver';
    else if (r === 'Donor') query.role = 'Donor';
    else query.role = r.toLowerCase();
  }

  const statusMap = {
    completed: 'active',
    inactive: 'deactivated',
    rejected: 'rejected',
    pending: 'pending_approval',
    unverified: 'pending_verification',
  };
  if (status && statusMap[status]) {
    query.accountStatus = statusMap[status];
  }

  if (search && String(search).trim()) {
    const term = String(search).trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { email: regex },
      { username: regex },
      { businessName: regex },
      { receiverName: regex },
      { driverName: regex },
      { contactNo: regex },
    ];
  }

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const userIds = users.map((u) => u._id);

  const [donationsCreated, claimsReceived, claimPayments, customerOrders] = await Promise.all([
    Donation.aggregate([
      { $match: { donorId: { $in: userIds }, status: { $ne: 'draft' } } },
      { $group: { _id: '$donorId', count: { $sum: 1 } } },
    ]),
    Donation.aggregate([
      { $match: { receiverId: { $in: userIds } } },
      { $group: { _id: '$receiverId', count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { paymentContext: 'claim', receiverId: { $in: userIds } } },
      { $group: { _id: '$receiverId', count: { $sum: 1 } } },
    ]),
    CustomerOrder.aggregate([
      { $match: { customerId: { $in: userIds } } },
      { $group: { _id: '$customerId', count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = (rows) =>
    rows.reduce((acc, row) => {
      acc[row._id.toString()] = row.count;
      return acc;
    }, {});

  const createdMap = countMap(donationsCreated);
  const claimsMap = countMap(claimsReceived);
  const paymentsMap = countMap(claimPayments);
  const customerMap = countMap(customerOrders);

  const enriched = users.map((user) => {
    const id = user._id.toString();
    return {
      id,
      email: user.email,
      name: userDisplayName(user),
      role: user.role,
      accountStatus: user.accountStatus,
      contactNo: user.contactNo,
      createdAt: user.createdAt,
      orderCounts: {
        donationsCreated: createdMap[id] || 0,
        claimsReceived: claimsMap[id] || 0,
        claimPayments: paymentsMap[id] || 0,
        customerOrders: customerMap[id] || 0,
        total:
          (createdMap[id] || 0) +
          (claimsMap[id] || 0) +
          (paymentsMap[id] || 0) +
          (customerMap[id] || 0),
      },
    };
  });

  return {
    users: enriched,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

module.exports = {
  listAllOrders,
  getOrderDetail,
  getUserMonitoringList,
  userDisplayName,
};
