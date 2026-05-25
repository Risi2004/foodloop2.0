const VENUE_TYPES = ['restaurant', 'wedding_hall'];

const VENUE_TYPE_LABELS = {
  restaurant: 'Restaurant',
  wedding_hall: 'Wedding Hall',
};

function isValidVenueType(value) {
  return VENUE_TYPES.includes((value || '').trim().toLowerCase());
}

function getVenueTypeLabel(value) {
  return VENUE_TYPE_LABELS[(value || '').trim().toLowerCase()] || '';
}

function normalizeVenueType(value) {
  const v = (value || '').trim().toLowerCase();
  return isValidVenueType(v) ? v : null;
}

module.exports = {
  VENUE_TYPES,
  VENUE_TYPE_LABELS,
  isValidVenueType,
  getVenueTypeLabel,
  normalizeVenueType,
};
