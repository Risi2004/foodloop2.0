export const VENUE_TYPES = ['restaurant', 'wedding_hall'];

export const VENUE_TYPE_OPTIONS = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'wedding_hall', label: 'Wedding Hall' },
];

export const VENUE_TYPE_LABELS = {
  restaurant: 'Restaurant',
  wedding_hall: 'Wedding Hall',
};

export const VENUE_TYPE_REQUIRED_MSG = 'Please select Restaurant or Wedding Hall';

export function getVenueTypeLabel(value) {
  return VENUE_TYPE_LABELS[(value || '').trim().toLowerCase()] || '';
}
