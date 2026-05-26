const MAX_RECEIVER_RADIUS_KM = 25;
const MAX_DRIVER_RADIUS_KM = 40;
const DRIVER_EARNINGS_LKR = 350;

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  if (
    lat1 == null ||
    lng1 == null ||
    lat2 == null ||
    lng2 == null ||
    Number.isNaN(Number(lat1)) ||
    Number.isNaN(Number(lng1)) ||
    Number.isNaN(Number(lat2)) ||
    Number.isNaN(Number(lng2))
  ) {
    return null;
  }

  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Today at midnight in Asia/Colombo (date-only comparison for expiry). */
function getTodayColomboDateOnly() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === 'year').value);
  const m = Number(parts.find((p) => p.type === 'month').value);
  const d = Number(parts.find((p) => p.type === 'day').value);
  return new Date(y, m - 1, d);
}

function parseExpiryDateOnly(expiryStr) {
  if (!expiryStr || typeof expiryStr !== 'string') return null;
  const trimmed = expiryStr.trim();
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function formatDistanceKm(distanceKm) {
  if (distanceKm == null || Number.isNaN(distanceKm)) return null;
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

function isDonationExpired(userProvidedExpiryDate) {
  const expiryOnly = parseExpiryDateOnly(userProvidedExpiryDate);
  if (!expiryOnly) return true;
  const today = getTodayColomboDateOnly();
  return expiryOnly < today;
}

module.exports = {
  MAX_RECEIVER_RADIUS_KM,
  MAX_DRIVER_RADIUS_KM,
  DRIVER_EARNINGS_LKR,
  calculateDistanceKm,
  formatDistanceKm,
  isDonationExpired,
};
