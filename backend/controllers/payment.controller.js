const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const Payment = require('../models/Payment');
const CustomerOrder = require('../models/CustomerOrder');
const CustomerDiscountUsage = require('../models/CustomerDiscountUsage');
const { isReceiverRole, isWithinSriLanka } = require('../utils/donationHelpers');
const {
  buildReceiverDeliveryQuoteForDonation,
  getReceiverDeliveryDiscountStatus,
  incrementReceiverDeliveryDiscountUsage,
  validateReceiverCoords,
  getCurrentYearMonth,
} = require('../utils/receiverDeliveryQuote');
const { getUnitPriceAmount } = require('../utils/donationClaimFork');
const {
  sendPaymentInvoiceEmail,
  sendCustomerOrderNewPickupToDrivers,
} = require('../utils/sendNotificationEmail');
const { validateMockCard } = require('../utils/mockCardValidation');
const { performDonationClaim, notifyDonationClaimed, retryClaimFromPaidPayment } = require('../services/donationClaimService');
const {
  toClaimJSON,
  enrichClaimFromParent,
  toAvailableDonationJSON,
} = require('../utils/donationHelpers');

const CHECKOUT_TTL_MS = 30 * 60 * 1000;
const LOW_INCOME_MONTHLY_DISCOUNT_LIMIT = 20;
const LOW_INCOME_DISCOUNT_RATE = 0.2;

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
  const lat = Number(body.customerLatitude);
  const lng = Number(body.customerLongitude);

  if (!address || address.length < 6) return { ok: false, message: 'A valid delivery address is required.' };
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { ok: false, message: 'Please confirm your delivery location on the map.' };
  }
  if (!isWithinSriLanka(lat, lng)) {
    return { ok: false, message: 'Delivery location must be within Sri Lanka.' };
  }
  if (!['card', 'cod'].includes(paymentMethod)) {
    return { ok: false, message: 'Payment method must be card or cod.' };
  }
  if ([subtotal, deliveryFee, total].some((v) => Number.isNaN(v) || v < 0)) {
    return { ok: false, message: 'Invalid payment totals.' };
  }

  const computedSubtotal = Number(normalizedItems.reduce((acc, i) => acc + i.lineTotal, 0).toFixed(2));
  const computedTotal = Number((computedSubtotal + deliveryFee).toFixed(2));

  return {
    ok: true,
    summary: {
      items: normalizedItems,
      subtotal: computedSubtotal,
      deliveryFee,
      total: computedTotal,
      address,
      customerLatitude: lat,
      customerLongitude: lng,
      paymentMethod,
    },
  };
}

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function buildLowIncomeOfferSummary(summary, offerPayload, eligible, remainingUnits) {
  const enabled = !!offerPayload?.enabled;
  const selectedItemIds = Array.isArray(offerPayload?.selectedItemIds)
    ? offerPayload.selectedItemIds.map((id) => String(id))
    : [];
  const selectedIdSet = new Set(selectedItemIds);
  const items = Array.isArray(summary.items) ? summary.items : [];

  if (!enabled) {
    return {
      ok: true,
      summary,
      discountOffer: {
        enabled: false,
        eligible: !!eligible,
        discountedUnitsRequested: 0,
        discountAmount: 0,
        selectedItemIds: [],
        remainingUnitsAtCheckout: remainingUnits,
      },
    };
  }

  if (!eligible) {
    return { ok: false, message: 'Low-income monthly offer is not enabled for your account.' };
  }

  let discountedUnitsRequested = 0;
  let discountAmount = 0;
  const adjustedItems = items.map((item) => {
    const id = item.id != null ? String(item.id) : '';
    const isSelected = id && selectedIdSet.has(id);
    const qty = Number(item.quantity || 0);
    const lineTotal = Number(item.lineTotal || 0);
    if (!isSelected || qty <= 0 || lineTotal <= 0) {
      return { ...item, discounted: false, discountedLineTotal: toMoney(lineTotal) };
    }
    discountedUnitsRequested += qty;
    const discountedLineTotal = toMoney(lineTotal * (1 - LOW_INCOME_DISCOUNT_RATE));
    discountAmount += lineTotal - discountedLineTotal;
    return { ...item, discounted: true, discountedLineTotal };
  });

  if (discountedUnitsRequested > remainingUnits) {
    return {
      ok: false,
      message: `Monthly offer limit exceeded. You can discount only ${remainingUnits} more product(s) this month.`,
    };
  }

  const adjustedSubtotal = toMoney(adjustedItems.reduce((acc, item) => acc + Number(item.discountedLineTotal || 0), 0));
  const adjustedTotal = toMoney(adjustedSubtotal + Number(summary.deliveryFee || 0));

  return {
    ok: true,
    summary: {
      ...summary,
      items: adjustedItems.map((item) => ({
        ...item,
        lineTotal: Number(item.discountedLineTotal || item.lineTotal || 0),
      })),
      subtotal: adjustedSubtotal,
      total: adjustedTotal,
    },
    discountOffer: {
      enabled: true,
      eligible: true,
      discountedUnitsRequested,
      discountAmount: toMoney(discountAmount),
      selectedItemIds: selectedItemIds.filter(Boolean),
      remainingUnitsAtCheckout: remainingUnits,
    },
  };
}

async function getDiscountOfferStatusForUser(user) {
  const yearMonth = getCurrentYearMonth();
  const eligible = String(user?.customerIncomeLevel || '').toLowerCase() === 'low';
  if (!eligible) {
    return {
      eligible: false,
      yearMonth,
      monthlyLimit: LOW_INCOME_MONTHLY_DISCOUNT_LIMIT,
      used: 0,
      remaining: 0,
    };
  }

  const usage = await CustomerDiscountUsage.findOne({
    customerId: user._id,
    yearMonth,
  }).lean();
  const used = Math.max(0, Number(usage?.discountedUnitsUsed || 0));
  const remaining = Math.max(0, LOW_INCOME_MONTHLY_DISCOUNT_LIMIT - used);
  return {
    eligible: true,
    yearMonth,
    monthlyLimit: LOW_INCOME_MONTHLY_DISCOUNT_LIMIT,
    used,
    remaining,
  };
}

async function consumeDiscountUnits(customerId, yearMonth, units) {
  const consume = Number(units || 0);
  if (consume <= 0) return { ok: true, used: null, remaining: null };

  const current = await CustomerDiscountUsage.findOne({ customerId, yearMonth });
  const used = Math.max(0, Number(current?.discountedUnitsUsed || 0));
  if (used + consume > LOW_INCOME_MONTHLY_DISCOUNT_LIMIT) {
    return {
      ok: false,
      message: `Monthly offer limit exceeded. You can discount only ${Math.max(0, LOW_INCOME_MONTHLY_DISCOUNT_LIMIT - used)} more product(s) this month.`,
    };
  }

  await CustomerDiscountUsage.updateOne(
    { customerId, yearMonth },
    {
      $setOnInsert: { customerId, yearMonth, discountedUnitsUsed: 0 },
      $inc: { discountedUnitsUsed: consume },
    },
    { upsert: true }
  );
  const nextUsed = used + consume;
  return {
    ok: true,
    used: nextUsed,
    remaining: Math.max(0, LOW_INCOME_MONTHLY_DISCOUNT_LIMIT - nextUsed),
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
    customerLatitude:
      payment.orderSummary?.customerLatitude != null
        ? Number(payment.orderSummary.customerLatitude)
        : null,
    customerLongitude:
      payment.orderSummary?.customerLongitude != null
        ? Number(payment.orderSummary.customerLongitude)
        : null,
  });

  sendCustomerOrderNewPickupToDrivers(order, customer).catch(() => {});
  return order;
}

async function claimCustomerOrderItems(payment, customerUser) {
  const items = payment.orderSummary?.items || [];
  const lat = payment.orderSummary?.customerLatitude;
  const lng = payment.orderSummary?.customerLongitude;
  const address = payment.orderSummary?.address || '';

  for (const item of items) {
    try {
      const { parent, child } = await performDonationClaim({
        donationId: item.id,
        receiverUser: customerUser,
        receiverLatitude: lat,
        receiverLongitude: lng,
        receiverAddress: address,
        claimQuantity: item.quantity,
        payment: payment,
        skipPaymentValidation: true,
      });
      notifyDonationClaimed({ child, parent });
    } catch (err) {
      console.error(`Failed to auto-claim item ${item.id} for customer order ${payment.orderId}:`, err);
    }
  }
}

async function loadSellDonation(donationId) {
  if (!donationId || !mongoose.Types.ObjectId.isValid(donationId)) {
    return { error: { status: 400, message: 'Invalid donation id.' } };
  }
  const donation = await Donation.findById(donationId);
  if (!donation) {
    return { error: { status: 404, message: 'Donation not found.' } };
  }
  if (donation.status !== 'available' || donation.parentListingId) {
    return { error: { status: 400, message: 'This listing is no longer available.' } };
  }
  if (!donation.quantity || donation.quantity < 1) {
    return { error: { status: 400, message: 'This listing is sold out.' } };
  }
  if (donation.listingType !== 'sell' || !donation.priceAmount || donation.priceAmount <= 0) {
    return { error: { status: 400, message: 'Payment is only required for cash listings.' } };
  }
  return { donation };
}

exports.createClaimCheckout = async (req, res) => {
  try {
    if (!requireReceiver(req, res)) return;

    const { donationId, receiverLatitude, receiverLongitude, receiverAddress, claimQuantity: rawClaimQty } =
      req.body || {};
    const claimQuantity = Math.max(1, Math.round(Number(rawClaimQty) || 1));
    const coordCheck = validateReceiverCoords(receiverLatitude, receiverLongitude);
    if (!coordCheck.ok) {
      return res.status(400).json({ success: false, message: coordCheck.message });
    }
    if (!receiverAddress?.trim()) {
      return res.status(400).json({ success: false, message: 'Delivery address is required.' });
    }

    const loaded = await loadSellDonation(donationId);
    if (loaded.error) {
      return res.status(loaded.error.status).json({
        success: false,
        message: loaded.error.message,
      });
    }

    const { donation } = loaded;
    if (claimQuantity > donation.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${donation.quantity} serving(s) available.`,
      });
    }

    const receiverId = req.user._id;

    const quoteResult = await buildReceiverDeliveryQuoteForDonation(
      donation,
      req.user,
      coordCheck.latitude,
      coordCheck.longitude,
      claimQuantity
    );
    if (quoteResult.error) {
      return res.status(400).json({ success: false, message: quoteResult.error });
    }

    const existingPaid = await Payment.findOne({
      donationId: donation._id,
      receiverId,
      status: 'paid',
      expiresAt: { $gt: new Date() },
    });
    if (existingPaid) {
      const summary = existingPaid.orderSummary || {};
      const paidQty = Math.max(1, Math.round(Number(summary.claimQuantity) || 1));
      if (paidQty === claimQuantity) {
        return res.json({
          success: true,
          orderId: existingPaid.orderId,
          amount: existingPaid.amount,
          currency: existingPaid.currency || 'LKR',
          itemName: donation.itemName || 'Food listing',
          reused: true,
          breakdown: {
            claimQuantity: paidQty,
            unitPriceAmount: getUnitPriceAmount(donation),
            foodSubtotal: summary.foodSubtotal ?? quoteResult.foodSubtotal,
            deliveryFee: summary.deliveryFee ?? 0,
            deliveryDiscount: summary.deliveryDiscount ?? 0,
            deliveryFeeAfterDiscount: summary.deliveryFeeAfterDiscount ?? summary.deliveryFee ?? 0,
            deliveryDistanceKm: summary.deliveryDistanceKm ?? null,
            total: existingPaid.amount,
          },
        });
      }
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
    const foodSubtotal = quoteResult.foodSubtotal;
    const amount = quoteResult.totalAmount;
    const currency = donation.priceCurrency || 'LKR';

    await Payment.create({
      orderId,
      donationId: donation._id,
      receiverId,
      amount,
      currency,
      status: 'pending',
      expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS),
      orderSummary: {
        claimQuantity,
        foodSubtotal,
        deliveryFee: quoteResult.deliveryFee,
        deliveryDiscount: quoteResult.deliveryDiscount,
        deliveryFeeAfterDiscount: quoteResult.deliveryFeeAfterDiscount,
        deliveryDistanceKm: quoteResult.distanceKm,
        deliveryQuotedRatePerKm: quoteResult.ratePerKm,
        discountApplied: quoteResult.discountApplied,
        receiverLatitude: coordCheck.latitude,
        receiverLongitude: coordCheck.longitude,
        receiverAddress: receiverAddress.trim(),
        total: amount,
      },
    });

    return res.json({
      success: true,
      orderId,
      amount,
      currency,
      itemName: donation.itemName || 'Food listing',
      reused: false,
      breakdown: {
        claimQuantity,
        unitPriceAmount: getUnitPriceAmount(donation),
        foodSubtotal,
        deliveryFee: quoteResult.deliveryFee,
        deliveryDiscount: quoteResult.deliveryDiscount,
        deliveryFeeAfterDiscount: quoteResult.deliveryFeeAfterDiscount,
        deliveryDistanceKm: quoteResult.distanceKm,
        discountApplied: quoteResult.discountApplied,
        total: amount,
      },
      discountStatus: quoteResult.discountStatus,
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

    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    }
    if (payment.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your payment.' });
    }

    const buildClaimResponse = async (paymentDoc) => {
      const summary = paymentDoc.orderSummary || {};
      const lat = summary.receiverLatitude;
      const lng = summary.receiverLongitude;
      const address = summary.receiverAddress?.trim() || 'Delivery location';
      const qty = Math.max(1, Math.round(Number(summary.claimQuantity) || 1));

      if (lat == null || lng == null) {
        return {
          claimCompleted: false,
          claimError: 'Checkout location missing. Please claim again from the listing.',
        };
      }

      if (paymentDoc.claimedDonationId) {
        const existing = await Donation.findById(paymentDoc.claimedDonationId).populate([
          { path: 'donorId', select: 'username businessName role email' },
          { path: 'receiverId', select: 'username receiverName email' },
          { path: 'parentListingId' },
        ]);
        if (existing) {
          const parent =
            existing.parentListingId != null
              ? await Donation.findById(existing.parentListingId)
              : null;
          const claimPayload = existing.parentListingId
            ? enrichClaimFromParent(existing)
            : toClaimJSON(existing);
          return {
            claimCompleted: true,
            donation: claimPayload,
            parentListing: parent ? toAvailableDonationJSON(parent, null) : null,
            claimQuantity: qty,
          };
        }
      }

      try {
        const { parent, child, claimQuantity } = await performDonationClaim({
          donationId: paymentDoc.donationId,
          receiverUser: req.user,
          receiverLatitude: lat,
          receiverLongitude: lng,
          receiverAddress: address,
          claimQuantity: qty,
          payment: paymentDoc,
          skipPaymentValidation: true,
        });
        const { claimPayload, parentPayload } = notifyDonationClaimed({ child, parent });
        return {
          claimCompleted: true,
          donation: claimPayload,
          parentListing: parentPayload,
          claimQuantity,
        };
      } catch (claimErr) {
        console.error('confirmClaimPayment claim error:', claimErr);
        return {
          claimCompleted: false,
          claimError: claimErr.message || 'Payment succeeded but claim failed. Please try claiming again.',
        };
      }
    };

    if (payment.status === 'paid' || payment.status === 'consumed') {
      const claimResult = await buildClaimResponse(payment);
      return res.json({
        success: true,
        status: payment.status,
        orderId: payment.orderId,
        donationId: payment.donationId.toString(),
        ...claimResult,
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

    const cardCheck = validateMockCard({ cardNumber, expiry, cvv });
    if (!cardCheck.ok) {
      return res.status(400).json({ success: false, message: cardCheck.message });
    }

    const last4 =
      bodyLast4 && String(bodyLast4).replace(/\D/g, '').slice(-4).length === 4
        ? String(bodyLast4).replace(/\D/g, '').slice(-4)
        : cardCheck.cardLast4;

    payment.status = 'paid';
    payment.cardLast4 = last4;
    await payment.save();

    if (payment.orderSummary?.discountApplied) {
      await incrementReceiverDeliveryDiscountUsage(req.user._id, getCurrentYearMonth());
    }

    const donation = await Donation.findById(payment.donationId);
    sendPaymentInvoiceEmail(req.user, { payment, donation }).catch(() => {});

    const claimResult = await buildClaimResponse(payment);

    return res.json({
      success: true,
      status: 'paid',
      orderId: payment.orderId,
      donationId: payment.donationId.toString(),
      ...claimResult,
    });
  } catch (err) {
    console.error('confirmClaimPayment error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to confirm payment',
    });
  }
};

exports.retryClaimPayment = async (req, res) => {
  try {
    if (!requireReceiver(req, res)) return;

    const { orderId } = req.body || {};
    if (!orderId?.trim()) {
      return res.status(400).json({ success: false, message: 'Order id required.' });
    }

    const result = await retryClaimFromPaidPayment({
      orderId: orderId.trim(),
      receiverUser: req.user,
    });

    const claimPayload = result.child.parentListingId
      ? enrichClaimFromParent(result.child)
      : toClaimJSON(result.child);
    const parentPayload = result.parent ? toAvailableDonationJSON(result.parent, null) : null;

    if (!result.alreadyClaimed) {
      notifyDonationClaimed({ child: result.child, parent: result.parent });
    }

    return res.json({
      success: true,
      claimCompleted: true,
      alreadyClaimed: result.alreadyClaimed,
      orderId: orderId.trim(),
      donation: claimPayload,
      parentListing: parentPayload,
      claimQuantity: result.claimQuantity,
    });
  } catch (err) {
    console.error('retryClaimPayment error:', err);
    const status = err.statusCode || 500;
    return res.status(status >= 400 && status < 500 ? status : 500).json({
      success: false,
      message: err.message || 'Failed to complete claim from payment',
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
    const offerStatus = await getDiscountOfferStatusForUser(req.user);
    const offerBuild = buildLowIncomeOfferSummary(
      check.summary,
      req.body?.discountOffer || {},
      offerStatus.eligible,
      offerStatus.remaining
    );
    if (!offerBuild.ok) {
      return res.status(400).json({ success: false, message: offerBuild.message });
    }
    const finalSummary = offerBuild.summary;

    const bodySubtotal = Number(req.body?.subtotal);
    const bodyTotal = Number(req.body?.total);
    if (Math.abs(finalSummary.subtotal - bodySubtotal) > 0.01 || Math.abs(finalSummary.total - bodyTotal) > 0.01) {
      return res.status(400).json({ success: false, message: 'Checkout totals mismatch. Please refresh and retry.' });
    }

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
    const amount = finalSummary.total;
    const currency = 'LKR';
    const paymentMethod = check.summary.paymentMethod;

    const payment = await Payment.create({
      orderId,
      paymentContext: 'customer_checkout',
      customerId,
      amount,
      currency,
      orderSummary: {
        ...finalSummary,
        discountOffer: {
          ...offerBuild.discountOffer,
          yearMonth: offerStatus.yearMonth,
        },
      },
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
      itemCount: finalSummary.items.length,
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

    const discountOffer = payment.orderSummary?.discountOffer || {};
    if (discountOffer.enabled && Number(discountOffer.discountedUnitsRequested || 0) > 0) {
      const consume = await consumeDiscountUnits(
        payment.customerId,
        discountOffer.yearMonth || getCurrentYearMonth(),
        Number(discountOffer.discountedUnitsRequested || 0)
      );
      if (!consume.ok) {
        return res.status(400).json({ success: false, message: consume.message });
      }
    }

    payment.status = 'paid';
    payment.cardLast4 = last4;
    await payment.save();
    await createCustomerOrderFromPayment(payment, req.user);

    // Auto-claim the items in Mongoose and notify supplier dashboard
    await claimCustomerOrderItems(payment, req.user);

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
    const offerStatus = await getDiscountOfferStatusForUser(req.user);
    const offerBuild = buildLowIncomeOfferSummary(
      check.summary,
      req.body?.discountOffer || {},
      offerStatus.eligible,
      offerStatus.remaining
    );
    if (!offerBuild.ok) {
      return res.status(400).json({ success: false, message: offerBuild.message });
    }
    const finalSummary = offerBuild.summary;

    const bodySubtotal = Number(req.body?.subtotal);
    const bodyTotal = Number(req.body?.total);
    if (Math.abs(finalSummary.subtotal - bodySubtotal) > 0.01 || Math.abs(finalSummary.total - bodyTotal) > 0.01) {
      return res.status(400).json({ success: false, message: 'Checkout totals mismatch. Please refresh and retry.' });
    }
    const discountOffer = {
      ...offerBuild.discountOffer,
      yearMonth: offerStatus.yearMonth,
    };

    if (discountOffer.enabled && Number(discountOffer.discountedUnitsRequested || 0) > 0) {
      const consume = await consumeDiscountUnits(
        customerId,
        discountOffer.yearMonth,
        Number(discountOffer.discountedUnitsRequested || 0)
      );
      if (!consume.ok) {
        return res.status(400).json({ success: false, message: consume.message });
      }
    }

    const orderId = generateOrderId(customerId);
    const amount = finalSummary.total;
    const currency = 'LKR';
    const payment = await Payment.create({
      orderId,
      paymentContext: 'customer_checkout',
      customerId,
      amount,
      currency,
      orderSummary: {
        ...finalSummary,
        paymentMethod: 'cod',
        discountOffer,
      },
      status: 'paid',
      expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS),
    });
    await createCustomerOrderFromPayment(payment, req.user);

    // Auto-claim the items in Mongoose and notify supplier dashboard
    await claimCustomerOrderItems(payment, req.user);

    return res.json({
      success: true,
      orderId,
      amount,
      currency,
      itemCount: finalSummary.items.length,
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
        discountOffer: payment.orderSummary?.discountOffer || null,
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
 * Validate paid payment for claim without consuming it yet.
 */
async function validatePaidPaymentForClaim({ paymentOrderId, donationId, receiverId }) {
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

  return { ok: true, payment };
}

async function consumePaidPaymentForClaim(payment, claimedDonationId) {
  if (!payment) return null;
  payment.status = 'consumed';
  payment.consumedAt = new Date();
  if (claimedDonationId) {
    payment.claimedDonationId = claimedDonationId;
  }
  await payment.save();
  return payment;
}

/**
 * Verify paid payment for claim; marks consumed on success.
 */
async function verifyPaidPaymentForClaim({ paymentOrderId, donationId, receiverId }) {
  const check = await validatePaidPaymentForClaim({ paymentOrderId, donationId, receiverId });
  if (!check.ok) return check;
  await consumePaidPaymentForClaim(check.payment);
  return { ok: true, payment: check.payment };
}

exports.validatePaidPaymentForClaim = validatePaidPaymentForClaim;
exports.consumePaidPaymentForClaim = consumePaidPaymentForClaim;
exports.verifyPaidPaymentForClaim = verifyPaidPaymentForClaim;

exports.getCustomerDiscountOfferStatus = async (req, res) => {
  try {
    if (!requireCustomer(req, res)) return;
    const status = await getDiscountOfferStatusForUser(req.user);
    return res.json({ success: true, ...status });
  } catch (err) {
    console.error('getCustomerDiscountOfferStatus error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load discount offer status',
    });
  }
};

exports.getReceiverDeliveryDiscountStatus = async (req, res) => {
  try {
    if (!requireReceiver(req, res)) return;
    const status = await getReceiverDeliveryDiscountStatus(req.user);
    return res.json({ success: true, ...status });
  } catch (err) {
    console.error('getReceiverDeliveryDiscountStatus error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load delivery discount status',
    });
  }
};
