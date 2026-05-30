const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const Payment = require('../models/Payment');
const { isDonationExpired } = require('../utils/distance');
const {
  isWithinSriLanka,
  toAvailableDonationJSON,
  toClaimJSON,
  enrichClaimFromParent,
} = require('../utils/donationHelpers');
const { emitToReceivers, emitToDonor, emitToDrivers } = require('../socket');
const { isSupplierPremium } = require('./supplierPremiumAccess');
const { sendDonationClaimedEmails } = require('../utils/sendNotificationEmail');
const {
  buildReceiverDeliveryQuoteForDonation,
  paymentMatchesDeliveryQuote,
  DELIVERY_QUOTE_RATE_LKR,
} = require('../utils/receiverDeliveryQuote');
const {
  computeClaimFoodSubtotal,
  claimListingInPlace,
  forkClaimFromListing,
} = require('../utils/donationClaimFork');

function claimError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function resolveReceiverObjectId(receiverUser) {
  if (!receiverUser?._id) {
    throw claimError('Receiver account is missing.', 401);
  }
  return receiverUser._id;
}

async function buildDeliveryFieldsForClaim({
  isPaidSell,
  resolvedPayment,
  freshParent,
  receiverUser,
  lat,
  lng,
  claimQuantity,
}) {
  if (isPaidSell && resolvedPayment) {
    const summary = resolvedPayment.orderSummary || {};
    return {
      deliveryDistanceKm: summary.deliveryDistanceKm ?? null,
      deliveryFeeQuoted: summary.deliveryFeeAfterDiscount ?? summary.deliveryFee ?? 0,
      deliveryFeeDiscount: summary.deliveryDiscount ?? 0,
      deliveryQuotedRatePerKm: summary.deliveryQuotedRatePerKm ?? DELIVERY_QUOTE_RATE_LKR,
      deliveryPayer: 'receiver',
    };
  }

  const quoteResult = await buildReceiverDeliveryQuoteForDonation(
    freshParent,
    receiverUser,
    lat,
    lng,
    claimQuantity
  );
  if (quoteResult.error) {
    throw claimError(quoteResult.error);
  }

  return {
    deliveryDistanceKm: quoteResult.distanceKm,
    deliveryFeeQuoted: 0,
    deliveryFeeDiscount: 0,
    deliveryQuotedRatePerKm: DELIVERY_QUOTE_RATE_LKR,
    deliveryPayer: 'platform',
  };
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

async function validatePaymentForClaim({ payment, paymentOrderId, donationId, receiverId, lat, lng, parentListing, claimQuantity }) {
  let resolvedPayment = payment;

  if (!resolvedPayment && paymentOrderId) {
    resolvedPayment = await Payment.findOne({
      orderId: paymentOrderId,
      donationId,
      receiverId,
    });
  }

  if (!resolvedPayment) {
    throw claimError('Payment not found for this order.', 402);
  }
  if (resolvedPayment.status === 'consumed') {
    throw claimError('This payment was already used for a claim.', 402);
  }
  if (resolvedPayment.status !== 'paid') {
    throw claimError('Complete payment before claiming this listing.', 402);
  }
  if (resolvedPayment.expiresAt < new Date()) {
    throw claimError('Payment session expired. Please pay again.', 402);
  }
  if (!paymentMatchesDeliveryQuote(resolvedPayment, lat, lng)) {
    throw claimError(
      'Delivery location does not match your paid checkout. Please pay again with the correct location.',
      400
    );
  }

  const summary = resolvedPayment.orderSummary || {};
  const expectedFood = computeClaimFoodSubtotal(parentListing, claimQuantity);
  const paidQty = Math.max(1, Math.round(Number(summary.claimQuantity) || claimQuantity));
  if (summary.claimQuantity != null && paidQty !== claimQuantity) {
    throw claimError('Claim quantity does not match your paid checkout.', 400);
  }
  const paidFood = Number(summary.foodSubtotal ?? expectedFood);
  if (summary.foodSubtotal != null && Math.abs(paidFood - expectedFood) > 0.01) {
    throw claimError('Payment amount does not match the selected quantity.', 400);
  }

  return resolvedPayment;
}

/**
 * Core claim execution: updates the listing (in-place or fork) and persists receiver fields.
 */
async function performDonationClaim({
  donationId,
  receiverUser,
  receiverLatitude,
  receiverLongitude,
  receiverAddress,
  claimQuantity: rawClaimQuantity,
  payment = null,
  paymentOrderId = null,
  skipPaymentValidation = false,
  deferPaymentConsumption = false,
}) {
  const claimQuantity = Math.max(1, Math.round(Number(rawClaimQuantity) || 1));
  const lat = Number(receiverLatitude);
  const lng = Number(receiverLongitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw claimError('Delivery location (latitude and longitude) is required.');
  }
  if (!isWithinSriLanka(lat, lng)) {
    throw claimError('Delivery location must be within Sri Lanka.');
  }
  if (!receiverAddress?.trim()) {
    throw claimError('Delivery address is required.');
  }

  const parentListing = await Donation.findById(donationId);
  if (!parentListing) {
    throw claimError('Donation not found.', 404);
  }
  if (parentListing.status !== 'available' || parentListing.parentListingId) {
    throw claimError('This donation is no longer available.');
  }
  if (isDonationExpired(parentListing.userProvidedExpiryDate)) {
    throw claimError('This donation has expired.');
  }
  if (claimQuantity > parentListing.quantity) {
    throw claimError(`Only ${parentListing.quantity} serving(s) available.`);
  }

  let resolvedPayment = payment;
  const isPaidSell =
    parentListing.listingType === 'sell' && Number(parentListing.priceAmount) > 0;

  if (isPaidSell) {
    if (skipPaymentValidation && resolvedPayment) {
      if (resolvedPayment.status === 'consumed') {
        throw claimError('This payment was already used for a claim.', 402);
      }
      if (resolvedPayment.status !== 'paid') {
        throw claimError('Complete payment before claiming this listing.', 402);
      }
    } else {
      const orderId = paymentOrderId?.trim();
      if (!orderId && !resolvedPayment) {
        throw claimError('Complete payment before claiming this listing.', 402);
      }
      resolvedPayment = await validatePaymentForClaim({
        payment: resolvedPayment,
        paymentOrderId: orderId,
        donationId: parentListing._id,
        receiverId: receiverUser._id,
        lat,
        lng,
        parentListing,
        claimQuantity,
      });
    }
  }

  // Re-read parent quantity inside claim path to avoid stale full/partial decision.
  const freshParent = await Donation.findById(parentListing._id);
  if (!freshParent || freshParent.status !== 'available' || freshParent.parentListingId) {
    throw claimError('This donation is no longer available.', 409);
  }
  if (claimQuantity > freshParent.quantity) {
    throw claimError(`Only ${freshParent.quantity} serving(s) available.`, 409);
  }

  const receiverObjectId = resolveReceiverObjectId(receiverUser);
  const deliveryFields = await buildDeliveryFieldsForClaim({
    isPaidSell,
    resolvedPayment,
    freshParent,
    receiverUser,
    lat,
    lng,
    claimQuantity,
  });

  let parent;
  let child;
  const isFullClaim = claimQuantity >= freshParent.quantity;

  try {
    if (isFullClaim) {
      ({ parent, child } = await claimListingInPlace({
        listingId: freshParent._id,
        claimQuantity,
        receiverId: receiverObjectId,
        receiverLatitude: lat,
        receiverLongitude: lng,
        receiverAddress: receiverAddress.trim(),
      }));
    } else {
      ({ parent, child } = await forkClaimFromListing({
        parentId: freshParent._id,
        parentSnapshot: freshParent,
        claimQuantity,
        receiverId: receiverObjectId,
        receiverLatitude: lat,
        receiverLongitude: lng,
        receiverAddress: receiverAddress.trim(),
      }));
    }
  } catch (forkErr) {
    if (forkErr.statusCode === 409) {
      throw claimError(forkErr.message, 409);
    }
    throw forkErr;
  }

  if (parent?._id) {
    parent = await Donation.findById(parent._id);
  }

  const childId = child?._id;
  if (!childId) {
    throw claimError('Claim record missing after save.', 500);
  }

  child = await Donation.findById(childId);
  if (!child) {
    throw claimError('Claim record missing after save.', 500);
  }

  Object.assign(child, deliveryFields, {
    receiverId: receiverObjectId,
    receiverLatitude: lat,
    receiverLongitude: lng,
    receiverAddress: receiverAddress.trim(),
    claimedAt: child.claimedAt || new Date(),
    status: 'claimed',
  });

  await child.save();

  if (resolvedPayment && resolvedPayment.status === 'paid' && !deferPaymentConsumption) {
    await consumePaidPaymentForClaim(resolvedPayment, child._id);
  }

  await child.populate([
    { path: 'donorId', select: 'username businessName role email' },
    { path: 'receiverId', select: 'username receiverName email' },
    { path: 'parentListingId' },
  ]);

  if (parent) {
    await parent.populate([
      { path: 'donorId', select: 'username businessName role email' },
    ]);
  }

  return { parent, child, claimQuantity, parentListing: freshParent };
}

async function notifyDonationClaimed({ child, parent }) {
  const childId = child._id.toString();
  const parentId = parent?._id?.toString() || childId;
  const donorId = child.donorId._id?.toString?.() || child.donorId.toString();
  const claimPayload = child.parentListingId ? enrichClaimFromParent(child) : toClaimJSON(child);
  let parentPayload = null;
  if (parent) {
    const premiumDonorId = parent.donorId?._id || parent.donorId;
    const donorIsPremium = premiumDonorId ? await isSupplierPremium(premiumDonorId) : false;
    parentPayload = toAvailableDonationJSON(parent, null, { donorIsPremium });
  }

  if (parent && parent.quantity > 0) {
    emitToReceivers('donation:stockUpdated', {
      donationId: parentId,
      donation: parentPayload,
      claimedChildId: childId,
    });
  } else {
    emitToReceivers('donation:claimed', { donationId: childId });
  }

  emitToDonor(donorId, 'donation:claimedForDonor', {
    donationId: childId,
    parentListingId: parent ? parentId : null,
    donorId,
    donation: claimPayload,
    parentListing: parentPayload,
  });
  emitToDrivers('donation:newPickup', { donationId: childId, donation: claimPayload });
  sendDonationClaimedEmails(child, child.donorId, child.receiverId);

  return { claimPayload, parentPayload };
}

/**
 * Retry claim for a paid but unconsumed payment (idempotent recovery).
 */
async function retryClaimFromPaidPayment({ orderId, receiverUser }) {
  const payment = await Payment.findOne({
    orderId: orderId?.trim(),
    receiverId: receiverUser._id,
  });

  if (!payment) {
    throw claimError('Payment not found for this order.', 404);
  }
  if (payment.status === 'consumed' && payment.claimedDonationId) {
    const existing = await Donation.findById(payment.claimedDonationId).populate([
      { path: 'donorId', select: 'username businessName role email' },
      { path: 'receiverId', select: 'username receiverName email' },
      { path: 'parentListingId' },
    ]);
    if (existing) {
      const parent =
        existing.parentListingId != null
          ? await Donation.findById(existing.parentListingId)
          : null;
      return {
        alreadyClaimed: true,
        parent,
        child: existing,
        claimQuantity: Math.max(
          1,
          Math.round(Number(payment.orderSummary?.claimQuantity) || existing.quantity || 1)
        ),
      };
    }
  }
  if (payment.status !== 'paid') {
    throw claimError('No paid claim is pending for this order.', 402);
  }

  const summary = payment.orderSummary || {};
  const lat = summary.receiverLatitude;
  const lng = summary.receiverLongitude;
  const address = summary.receiverAddress?.trim() || 'Delivery location';
  const qty = Math.max(1, Math.round(Number(summary.claimQuantity) || 1));

  if (lat == null || lng == null) {
    throw claimError('Checkout location missing. Please start checkout again from the listing.');
  }

  const result = await performDonationClaim({
    donationId: payment.donationId,
    receiverUser,
    receiverLatitude: lat,
    receiverLongitude: lng,
    receiverAddress: address,
    claimQuantity: qty,
    payment,
    skipPaymentValidation: true,
  });

  return { alreadyClaimed: false, ...result };
}

module.exports = {
  performDonationClaim,
  consumePaidPaymentForClaim,
  notifyDonationClaimed,
  retryClaimFromPaidPayment,
};
