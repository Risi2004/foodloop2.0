const ReceiverDeliveryDiscountUsage = require('../models/ReceiverDeliveryDiscountUsage');
const {
  DELIVERY_QUOTE_RATE_LKR,
  LOW_INCOME_DELIVERY_MONTHLY_LIMIT,
  computeDeliveryDistanceKm,
  buildDeliveryQuote,
  coordsMatch,
  roundCurrency,
} = require('./deliveryPricing');
const { isWithinSriLanka } = require('./donationHelpers');
const { computeClaimFoodSubtotal } = require('./donationClaimFork');

function getCurrentYearMonth() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

function isLowIncomeReceiver(user) {
  return String(user?.receiverIncomeLevel || '').toLowerCase() === 'low';
}

async function getReceiverDeliveryDiscountStatus(user) {
  const yearMonth = getCurrentYearMonth();
  const eligible = isLowIncomeReceiver(user);
  if (!eligible) {
    return {
      eligible: false,
      yearMonth,
      monthlyLimit: LOW_INCOME_DELIVERY_MONTHLY_LIMIT,
      used: 0,
      remaining: 0,
    };
  }

  const usage = await ReceiverDeliveryDiscountUsage.findOne({
    receiverId: user._id,
    yearMonth,
  }).lean();
  const used = Math.max(0, Number(usage?.discountedDeliveriesUsed || 0));
  const remaining = Math.max(0, LOW_INCOME_DELIVERY_MONTHLY_LIMIT - used);
  return {
    eligible: true,
    yearMonth,
    monthlyLimit: LOW_INCOME_DELIVERY_MONTHLY_LIMIT,
    used,
    remaining,
  };
}

async function incrementReceiverDeliveryDiscountUsage(receiverId, yearMonth) {
  const doc = await ReceiverDeliveryDiscountUsage.findOneAndUpdate(
    { receiverId, yearMonth },
    { $inc: { discountedDeliveriesUsed: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (doc.discountedDeliveriesUsed > LOW_INCOME_DELIVERY_MONTHLY_LIMIT) {
    doc.discountedDeliveriesUsed = LOW_INCOME_DELIVERY_MONTHLY_LIMIT;
    await doc.save();
  }
  return doc;
}

function validateReceiverCoords(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return { ok: false, message: 'Delivery location (latitude and longitude) is required.' };
  }
  if (!isWithinSriLanka(latitude, longitude)) {
    return { ok: false, message: 'Delivery location must be within Sri Lanka.' };
  }
  return { ok: true, latitude, longitude };
}

async function buildReceiverDeliveryQuoteForDonation(donation, user, lat, lng, claimQuantity = 1) {
  const coordCheck = validateReceiverCoords(lat, lng);
  if (!coordCheck.ok) return { error: coordCheck.message };

  const qty = Math.max(1, Math.round(Number(claimQuantity) || 1));

  const distanceKm = computeDeliveryDistanceKm(
    donation.donorLatitude,
    donation.donorLongitude,
    coordCheck.latitude,
    coordCheck.longitude
  );
  if (distanceKm == null) {
    return { error: 'Could not calculate delivery distance.' };
  }

  const discountStatus = await getReceiverDeliveryDiscountStatus(user);
  const applyDiscount =
    donation.listingType === 'sell' &&
    discountStatus.eligible &&
    discountStatus.remaining > 0;

  const quote = buildDeliveryQuote({ distanceKm, applyDiscount });
  const foodSubtotal =
    donation.listingType === 'sell' ? computeClaimFoodSubtotal(donation, qty) : 0;

  return {
    ...quote,
    receiverLatitude: coordCheck.latitude,
    receiverLongitude: coordCheck.longitude,
    claimQuantity: qty,
    foodSubtotal,
    totalAmount:
      donation.listingType === 'sell'
        ? roundCurrency(foodSubtotal + quote.deliveryFeeAfterDiscount)
        : 0,
    deliveryPayer: donation.listingType === 'sell' ? 'receiver' : 'platform',
    discountStatus,
    currency: donation.priceCurrency || 'LKR',
  };
}

function paymentMatchesDeliveryQuote(payment, lat, lng) {
  const summary = payment?.orderSummary || {};
  const payLat = summary.receiverLatitude;
  const payLng = summary.receiverLongitude;
  if (payLat == null || payLng == null) {
    // Older payments may not have stored checkout coordinates.
    return true;
  }
  return coordsMatch(payLat, payLng, lat, lng);
}

module.exports = {
  getCurrentYearMonth,
  isLowIncomeReceiver,
  getReceiverDeliveryDiscountStatus,
  incrementReceiverDeliveryDiscountUsage,
  validateReceiverCoords,
  buildReceiverDeliveryQuoteForDonation,
  paymentMatchesDeliveryQuote,
  DELIVERY_QUOTE_RATE_LKR,
};
