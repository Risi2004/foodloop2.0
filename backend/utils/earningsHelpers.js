const MARKETPLACE_COMMISSION_RATE = 0.2;
const MIN_PAYOUT_LKR = Number(process.env.MIN_PAYOUT_LKR) || 1000;

const SUPPLIER_ROLES = ['donor', 'restaurant', 'supermarket', 'business', 'individual'];
const DRIVER_ROLES = ['driver'];

function roundCurrency(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100) / 100;
}

function reverseCommission(gross) {
  const g = Number(gross);
  if (Number.isNaN(g) || g <= 0) return 0;
  return roundCurrency(g / (1 + MARKETPLACE_COMMISSION_RATE));
}

function platformFee(gross) {
  const g = Number(gross);
  if (Number.isNaN(g) || g <= 0) return 0;
  return roundCurrency(g - reverseCommission(g));
}

function isSupplierRole(role) {
  return SUPPLIER_ROLES.includes(String(role || '').toLowerCase());
}

function isDriverRoleForEarnings(role) {
  return DRIVER_ROLES.includes(String(role || '').toLowerCase());
}

function earningsRoleType(role) {
  if (isDriverRoleForEarnings(role)) return 'driver';
  if (isSupplierRole(role)) return 'supplier';
  return null;
}

function getMinPayoutAmount() {
  return MIN_PAYOUT_LKR;
}

function formatLkr(amount) {
  return `LKR ${Number(amount || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

module.exports = {
  MARKETPLACE_COMMISSION_RATE,
  MIN_PAYOUT_LKR,
  SUPPLIER_ROLES,
  roundCurrency,
  reverseCommission,
  platformFee,
  isSupplierRole,
  isDriverRoleForEarnings,
  earningsRoleType,
  getMinPayoutAmount,
  formatLkr,
};
