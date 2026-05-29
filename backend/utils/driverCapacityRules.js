const VEHICLE_LIMITS = {
  motorbike: 18,
  three_wheeler: 45,
  car: 80,
  van: 120,
  truck: 260,
};

const CATEGORY_WEIGHTS = {
  cooked: 1.0,
  bakery: 0.8,
  produce: 1.8,
  dairy: 2.0,
  packaged: 2.4,
  beverage: 2.2,
  other: 1.6,
};

function normalizeVehicleType(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'motorbike';
  if (raw.includes('scooter')) return 'motorbike';
  if (raw.includes('car')) return 'car';
  if (raw.includes('bike') || raw.includes('motor')) return 'motorbike';
  if (raw.includes('three') || raw.includes('3wheel') || raw.includes('tuk')) return 'three_wheeler';
  if (raw.includes('van')) return 'van';
  if (raw.includes('truck') || raw.includes('lorry')) return 'truck';
  return 'motorbike';
}

function getCategoryWeight(categoryLike) {
  const text = String(categoryLike || '').trim().toLowerCase();
  if (text.includes('cook')) return CATEGORY_WEIGHTS.cooked;
  if (text.includes('baker')) return CATEGORY_WEIGHTS.bakery;
  if (text.includes('produc') || text.includes('vegetable') || text.includes('fruit')) return CATEGORY_WEIGHTS.produce;
  if (text.includes('dairy') || text.includes('milk') || text.includes('yogurt') || text.includes('cheese'))
    return CATEGORY_WEIGHTS.dairy;
  if (text.includes('pack') || text.includes('bulk') || text.includes('crate')) return CATEGORY_WEIGHTS.packaged;
  if (text.includes('beverage') || text.includes('drink')) return CATEGORY_WEIGHTS.beverage;
  return CATEGORY_WEIGHTS.other;
}

function toNumberOr(defaultValue, input) {
  const n = Number(input);
  return Number.isNaN(n) ? defaultValue : n;
}

function getDonationLoadScore(donation) {
  const qty = Math.max(1, toNumberOr(1, donation?.quantity));
  const categoryWeight = getCategoryWeight(donation?.foodCategory || donation?.itemName);
  return Math.max(1, Math.round(qty * categoryWeight));
}

function getCustomerOrderLoadScore(order) {
  const items = Array.isArray(order?.orderSummary?.items) ? order.orderSummary.items : [];
  if (!items.length) return 1;
  return items.reduce((sum, item) => {
    const qty = Math.max(1, toNumberOr(1, item?.quantity));
    const w = getCategoryWeight(item?.category || item?.name);
    return sum + Math.round(qty * w);
  }, 0);
}

function isOrderCompatible(vehicleType, source, payload) {
  const normalizedVehicle = normalizeVehicleType(vehicleType);
  const limit = VEHICLE_LIMITS[normalizedVehicle] || VEHICLE_LIMITS.motorbike;
  const loadScore =
    source === 'customer_order' ? getCustomerOrderLoadScore(payload) : getDonationLoadScore(payload);
  const compatible = loadScore <= limit;
  const reason = compatible
    ? 'Vehicle can accommodate this order.'
    : `Load score ${loadScore} exceeds ${normalizedVehicle} limit ${limit}.`;

  return {
    compatible,
    loadScore,
    vehicleLimit: limit,
    normalizedVehicle,
    reason,
  };
}

module.exports = {
  normalizeVehicleType,
  getDonationLoadScore,
  getCustomerOrderLoadScore,
  isOrderCompatible,
  VEHICLE_LIMITS,
};
