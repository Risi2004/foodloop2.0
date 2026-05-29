const { calculateDistanceKm } = require('./distance');

const DELIVERY_QUOTE_RATE_LKR = 100;
const LOW_INCOME_DELIVERY_DISCOUNT_RATE = 0.2;
const LOW_INCOME_DELIVERY_MONTHLY_LIMIT = 20;

const DELIVERY_RATES_LKR = {
  small: 50,
  car_van: 100,
  lorry: 120,
};

function roundCurrency(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100) / 100;
}

function getDeliveryTierFromVehicle(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'small';
  if (raw.includes('scooter') || raw.includes('bike') || raw.includes('motor')) return 'small';
  if (raw.includes('three') || raw.includes('3wheel') || raw.includes('tuk')) return 'small';
  if (raw.includes('truck') || raw.includes('lorry')) return 'lorry';
  if (raw.includes('van') || raw.includes('car')) return 'car_van';
  return 'small';
}

function getRatePerKmForTier(tier) {
  return DELIVERY_RATES_LKR[tier] || DELIVERY_RATES_LKR.car_van;
}

function getRatePerKmForVehicle(vehicleType) {
  return getRatePerKmForTier(getDeliveryTierFromVehicle(vehicleType));
}

function calculateDeliveryFee(distanceKm, ratePerKm) {
  const dist = Number(distanceKm);
  const rate = Number(ratePerKm);
  if (Number.isNaN(dist) || dist <= 0 || Number.isNaN(rate) || rate <= 0) return 0;
  return roundCurrency(dist * rate);
}

function computeDeliveryDistanceKm(donorLat, donorLng, receiverLat, receiverLng) {
  const dist = calculateDistanceKm(donorLat, donorLng, receiverLat, receiverLng);
  if (dist == null || Number.isNaN(dist)) return null;
  return roundCurrency(Math.max(dist, 0.1));
}

function buildDeliveryQuote({ distanceKm, applyDiscount = false }) {
  const dist = Number(distanceKm);
  const deliveryFee = calculateDeliveryFee(dist, DELIVERY_QUOTE_RATE_LKR);
  const discountAmount = applyDiscount
    ? roundCurrency(deliveryFee * LOW_INCOME_DELIVERY_DISCOUNT_RATE)
    : 0;
  const deliveryFeeAfterDiscount = roundCurrency(deliveryFee - discountAmount);

  return {
    distanceKm: dist,
    ratePerKm: DELIVERY_QUOTE_RATE_LKR,
    deliveryFee,
    deliveryDiscount: discountAmount,
    deliveryFeeAfterDiscount,
    discountApplied: applyDiscount && discountAmount > 0,
  };
}

function computeFinalDeliveryFee(donation, driverVehicleType) {
  const dist =
    donation?.deliveryDistanceKm != null
      ? Number(donation.deliveryDistanceKm)
      : computeDeliveryDistanceKm(
          donation?.donorLatitude,
          donation?.donorLongitude,
          donation?.receiverLatitude,
          donation?.receiverLongitude
        );

  if (dist == null || Number.isNaN(dist) || dist <= 0) return null;

  const tier = getDeliveryTierFromVehicle(driverVehicleType);
  const ratePerKm = getRatePerKmForTier(tier);
  const finalFee = calculateDeliveryFee(dist, ratePerKm);

  return {
    deliveryDistanceKm: dist,
    deliveryFeeFinal: finalFee,
    deliveryFinalRatePerKm: ratePerKm,
    deliveryVehicleTier: tier,
  };
}

function coordsMatch(aLat, aLng, bLat, bLng, tolerance = 0.0005) {
  const latDiff = Math.abs(Number(aLat) - Number(bLat));
  const lngDiff = Math.abs(Number(aLng) - Number(bLng));
  return latDiff <= tolerance && lngDiff <= tolerance;
}

module.exports = {
  DELIVERY_QUOTE_RATE_LKR,
  LOW_INCOME_DELIVERY_DISCOUNT_RATE,
  LOW_INCOME_DELIVERY_MONTHLY_LIMIT,
  DELIVERY_RATES_LKR,
  roundCurrency,
  getDeliveryTierFromVehicle,
  getRatePerKmForTier,
  getRatePerKmForVehicle,
  calculateDeliveryFee,
  computeDeliveryDistanceKm,
  buildDeliveryQuote,
  computeFinalDeliveryFee,
  coordsMatch,
};
