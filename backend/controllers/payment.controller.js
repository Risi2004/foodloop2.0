const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const Payment = require('../models/Payment');
const CustomerOrder = require('../models/CustomerOrder');
const { isReceiverRole } = require('../utils/donationHelpers');
const {
  sendPaymentInvoiceEmail,
  sendCustomerOrderNewPickupToDrivers,
} = require('../utils/sendNotificationEmail');

const CHECKOUT_TTL_MS = 30 * 60 * 1000;

function requireReceiver(req, res) {
  if (!isReceiverRole(req.user.role)) {
    res.status(403).json({ success: false, message: 'Only receivers can pay for listings.' });
    return false;
  }
  return true;
}

function requireCustomer(req, res) {
  const role = (req.user?.role || '').toLowerCase();
  if (role !== 'customer') {
    res.status(403).json({ success: false, message: 'Only customers can make customer payments.' });
    return false;
  }
  return true;
}

function generateOrderId(seedValue = Date.now().toString()) {
  const suffix = Date.now().toString(36).toUpperCase();
  const idPart = String(seedValue).slice(-8).toUpperCase().replace(/\W/g, '');
  return `FL${idPart}${suffix}`.slice(0, 32);
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function validateMockCard({ cardNumber, expiry, cvv }) {
  const num = digitsOnly(cardNumber);
  if (num.length < 16) {
    return { ok: false, message: 'Card number must be at least 16 digits.' };
  }
  const expiryTrimmed = String(expiry || '').trim();
  if (!/^\d{2}\/\d{2}$/.test(expiryTrimmed)) {
    return { ok: false, message: 'Expiry must be MM/YY.' };
  }
  const cvvDigits = digitsOnly(cvv);
  if (cvvDigits.length !== 3) {
    return { ok: false, message: 'CVV must be 3 digits.' };
  }
  return { ok: true, cardLast4: num.slice(-4) };
}

function validateCustomerCheckoutPayload(body = {}) {
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return { ok: false, message: 'At least one cart item is required.' };

  const normalizedItems = items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice ?? item.price);
    const safeQty = Number.isNaN(quantity) || quantity < 1 ? 1 : quantity;
    const safePrice = Number.isNaN(unitPrice) || unitPrice < 0 ? 0 : unitPrice;
    return {
      id: item.id != null ? String(item.id) : null,
      name: String(item.name || 'Item'),
      quantity: safeQty,
      unitPrice: safePrice,
      lineTotal: Number((safeQty * safePrice).toFixed(2)),
    };
  });

  const subtotal = Number(body.subtotal);
  const deliveryFee = Number(body.deliveryFee);
  const total = Number(body.total);
  const address = String(body.address || '').trim();
  const paymentMethod = String(body.paymentMethod || 'card').trim().toLowerCase();

  if (!address || address.length < 6) return { ok: false, message: 'A valid delivery address is required.' };
  if (!['card', 'cod'].includes(paymentMethod)) {
    return { ok: false, message: 'Payment method must be card or cod.' };
  }
  if ([subtotal, deliveryFee, total].some((v) => Number.isNaN(v) || v < 0)) {
    return { ok: false, message: 'Invalid payment totals.' };
  }

  const computedSubtotal = Number(normalizedItems.reduce((acc, i) => acc + i.lineTotal, 0).toFixed(2));
  const computedTotal = Number((computedSubtotal + deliveryFee).toFixed(2));
  if (Math.abs(computedSubtotal - subtotal) > 0.01 || Math.abs(computedTotal - total) > 0.01) {
    return { ok: false, message: 'Checkout totals mismatch. Please refresh and retry.' };
  }

  return {
    ok: true,
    summary: {
      items: normalizedItems,
      subtotal: computedSubtotal,
      deliveryFee,
      total: computedTotal,
      address,
      paymentMethod,
    },
  };
}

async function createCustomerOrderFromPayment(payment, customer) {
  if (!payment || !payment._id || !payment.customerId) return null;

  const existing = await CustomerOrder.findOne({ paymentId: payment._id });
  if (existing) return existing;

  const method = String(payment.orderSummary?.paymentMethod || 'card').toLowerCase() === 'cod' ? 'cod' : 'card';
  const codAmount = method === 'cod' ? Number(payment.amount || 0) : 0;
  const order = await CustomerOrder.create({
    orderId: payment.orderId,
    paymentId: payment._id,
    customerId: payment.customerId,
    status: 'finding_driver',
    paymentMethod: method,
    codAmount: Number.isNaN(codAmount) ? 0 : codAmount,
    currency: payment.currency || 'LKR',
    orderSummary: {
      items: Array.isArray(payment.orderSummary?.items) ? payment.orderSummary.items : [],
      subtotal: Number(payment.orderSummary?.subtotal || 0),
      deliveryFee: Number(payment.orderSummary?.deliveryFee || 0),
      total: Number(payment.orderSummary?.total || payment.amount || 0),
      address: String(payment.orderSummary?.address || ''),
    },
    customerAddress: String(payment.orderSummary?.address || ''),
  });

  sendCustomerOrderNewPickupToDrivers(order, customer).catch(() => {});
  return order;
}

async function loadSellDonation(donationId) {
  if (!donationId || !mongoose.Types.ObjectId.isValid(donationId)) {
    return { error: { status: 400, message: 'Invalid donation id.' } };
  }
  const donation = await Donation.findById(donationId);
  if (!donation) {
    return { error: { status: 404, message: 'Donation not found.' } };
  }
  if (donation.status !== 'available') {
    return { error: { status: 400, message: 'This listing is no longer available.' } };
  }
  if (donation.listingType !== 'sell' || !donation.priceAmount || donation.priceAmount <= 0) {
    return { error: { status: 400, message: 'Payment is only required for cash listings.' } };
  }
  return { donation };
}

exports.createClaimCheckout = async (req, res) => {
  try {
    if (!requireReceiver(req, res)) return;

    const { donationId } = req.body || {};
    const loaded = await loadSellDonation(donationId);
    if (loaded.error) {
      return res.status(loaded.error.status).json({
        success: false,
        message: loaded.error.message,
      });
    }

    const { donation } = loaded;
    const receiverId = req.user._id;

    const blocking = await Payment.findOne({
      donationId: donation._id,
      status: { $in: ['paid', 'consumed'] },
      receiverId: { $ne: receiverId },
    });
    if (blocking) {
      return res.status(409).json({
        success: false,
        message: 'Another receiver has already paid for this listing.',
      });
    }

    const existingPaid = await Payment.findOne({
      donationId: donation._id,
      receiverId,
      status: 'paid',
      expiresAt: { $gt: new Date() },
    });
    if (existingPaid) {
      return res.json({
        success: true,
        orderId: existingPaid.orderId,
        amount: existingPaid.amount,
        currency: existingPaid.currency || 'LKR',
        itemName: donation.itemName || 'Food listing',
        reused: true,
      });
    }

    await Payment.updateMany(
      {
        donationId: donation._id,
        receiverId,
        status: 'pending',
        expiresAt: { $lt: new Date() },
      },
      { $set: { status: 'cancelled' } }
    );

    const orderId = generateOrderId(donation._id);
    const amount = donation.priceAmount;
    const currency = donation.priceCurrency || 'LKR';

    await Payment.create({
      orderId,
      donationId: donation._id,
      receiverId,
      amount,
      currency,
      status: 'pending',
      expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS),
    });

    return res.json({
      success: true,
      orderId,
      amount,
      currency,
      itemName: donation.itemName || 'Food listing',
      reused: false,
    });
  } catch (err) {
    console.error('createClaimCheckout error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to start payment',
    });
  }
};

exports.confirmClaimPayment = async (req, res) => {
  try {
    if (!requireReceiver(req, res)) return;

    const { orderId, cardNumber, expiry, cvv, cardLast4: bodyLast4 } = req.body || {};
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
    if (payment.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your payment.' });
    }
    if (payment.status === 'paid' || payment.status === 'consumed') {
      return res.json({
        success: true,
        status: payment.status,
        orderId: payment.orderId,
        donationId: payment.donationId.toString(),
      });
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

    payment.status = 'paid';
    payment.cardLast4 = last4;
    await payment.save();

    const donation = await Donation.findById(payment.donationId);
    sendPaymentInvoiceEmail(req.user, { payment, donation }).catch(() => {});

    return res.json({
      success: true,
      status: 'paid',
      orderId: payment.orderId,
      donationId: payment.donationId.toString(),
    });
  } catch (err) {
    console.error('confirmClaimPayment error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to confirm payment',
    });
  }
};

exports.createCustomerCheckout = async (req, res) => {
  try {
    if (!requireCustomer(req, res)) return;

    const check = validateCustomerCheckoutPayload(req.body || {});
    if (!check.ok) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const customerId = req.user._id;

    await Payment.updateMany(
      {
        paymentContext: 'customer_checkout',
        customerId,
        status: 'pending',
        expiresAt: { $lt: new Date() },
      },
      { $set: { status: 'cancelled' } }
    );

    const orderId = generateOrderId(customerId);
    const amount = check.summary.total;
    const currency = 'LKR';
    const paymentMethod = check.summary.paymentMethod;

    const payment = await Payment.create({
      orderId,
      paymentContext: 'customer_checkout',
      customerId,
      amount,
      currency,
      orderSummary: check.summary,
      status: paymentMethod === 'cod' ? 'paid' : 'pending',
      cardLast4: paymentMethod === 'cod' ? null : undefined,
      expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS),
    });

    if (paymentMethod === 'cod') {
      await createCustomerOrderFromPayment(payment, req.user);
    }

    return res.json({
      success: true,
      orderId,
      amount,
      currency,
      itemCount: check.summary.items.length,
      paymentMethod,
      status: paymentMethod === 'cod' ? 'paid' : 'pending',
      reused: false,
    });
  } catch (err) {
    console.error('createCustomerCheckout error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to start customer checkout',
    });
  }
};

exports.confirmCustomerCheckout = async (req, res) => {
  try {
    if (!requireCustomer(req, res)) return;

    const { orderId, cardNumber, expiry, cvv, cardLast4: bodyLast4 } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order id required.' });
    }

    const cardCheck = validateMockCard({ cardNumber, expiry, cvv });
    if (!cardCheck.ok) {
      return res.status(400).json({ success: false, message: cardCheck.message });
    }

    const payment = await Payment.findOne({
      orderId,
      paymentContext: 'customer_checkout',
    });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    }
    if (!payment.customerId || payment.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your payment.' });
    }
    if (payment.status === 'paid' || payment.status === 'consumed') {
      return res.json({
        success: true,
        status: payment.status,
        orderId: payment.orderId,
      });
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

    payment.status = 'paid';
    payment.cardLast4 = last4;
    await payment.save();
    await createCustomerOrderFromPayment(payment, req.user);

    sendPaymentInvoiceEmail(req.user, { payment, donation: null }).catch(() => {});

    return res.json({
      success: true,
      status: 'paid',
      orderId: payment.orderId,
    });
  } catch (err) {
    console.error('confirmCustomerCheckout error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to confirm customer payment',
    });
  }
};

exports.placeCustomerCodOrder = async (req, res) => {
  try {
    if (!requireCustomer(req, res)) return;

    const check = validateCustomerCheckoutPayload({
      ...(req.body || {}),
      paymentMethod: 'cod',
    });
    if (!check.ok) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const customerId = req.user._id;
    const orderId = generateOrderId(customerId);
    const amount = check.summary.total;
    const currency = 'LKR';
    const payment = await Payment.create({
      orderId,
      paymentContext: 'customer_checkout',
      customerId,
      amount,
      currency,
      orderSummary: { ...check.summary, paymentMethod: 'cod' },
      status: 'paid',
      expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS),
    });
    await createCustomerOrderFromPayment(payment, req.user);

    return res.json({
      success: true,
      orderId,
      amount,
      currency,
      itemCount: check.summary.items.length,
      paymentMethod: 'cod',
      status: 'paid',
      reused: false,
    });
  } catch (err) {
    console.error('placeCustomerCodOrder error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to place COD order',
    });
  }
};

exports.getCustomerPaymentHistory = async (req, res) => {
  try {
    if (!requireCustomer(req, res)) return;

    const payments = await Payment.find({
      paymentContext: 'customer_checkout',
      customerId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    const history = payments.map((payment) => ({
      id: payment._id?.toString?.() || String(payment._id),
      orderId: payment.orderId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency || 'LKR',
      cardLast4: payment.cardLast4 || null,
      expiresAt: payment.expiresAt || null,
      consumedAt: payment.consumedAt || null,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      orderSummary: {
        items: Array.isArray(payment.orderSummary?.items) ? payment.orderSummary.items : [],
        subtotal: payment.orderSummary?.subtotal ?? 0,
        deliveryFee: payment.orderSummary?.deliveryFee ?? 0,
        total: payment.orderSummary?.total ?? payment.amount ?? 0,
        address: payment.orderSummary?.address || '',
        paymentMethod: payment.orderSummary?.paymentMethod || 'card',
      },
    }));

    return res.json({
      success: true,
      payments: history,
    });
  } catch (err) {
    console.error('getCustomerPaymentHistory error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load payment history',
    });
  }
};

/**
 * Verify paid payment for claim; marks consumed on success.
 */
async function verifyPaidPaymentForClaim({ paymentOrderId, donationId, receiverId }) {
  const payment = await Payment.findOne({
    orderId: paymentOrderId,
    donationId,
    receiverId,
  });

  if (!payment) {
    return { ok: false, message: 'Payment not found for this order.' };
  }
  if (payment.status === 'consumed') {
    return { ok: false, message: 'This payment was already used for a claim.' };
  }
  if (payment.status !== 'paid') {
    return {
      ok: false,
      message: 'Complete payment before claiming this listing.',
    };
  }
  if (payment.expiresAt < new Date()) {
    return {
      ok: false,
      message: 'Payment session expired. Please pay again.',
    };
  }

  payment.status = 'consumed';
  payment.consumedAt = new Date();
  await payment.save();

  return { ok: true, payment };
}

exports.verifyPaidPaymentForClaim = verifyPaidPaymentForClaim;
