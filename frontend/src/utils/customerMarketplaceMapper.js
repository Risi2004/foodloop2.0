const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80';

function normalizeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function toTitleCase(value) {
  const text = normalizeText(value);
  if (!text) return 'General';
  return text
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatPickupWindow(from, to) {
  const start = normalizeText(from);
  const end = normalizeText(to);
  if (!start && !end) return 'Pickup time not specified';
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

function formatDateText(dateValue) {
  if (!dateValue) return 'Not specified';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return 'Not specified';
  return d.toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function mapDonationToMarketplaceItem(donation = {}) {
  const listingType = normalizeText(donation.listingType, 'donate').toLowerCase() === 'sell' ? 'sell' : 'donate';
  const amount = Number(donation.priceAmount);
  const priceAmount = listingType === 'sell' && !Number.isNaN(amount) && amount > 0 ? amount : 0;
  const quantity = Number(donation.quantity);
  const safeQuantity = Number.isNaN(quantity) || quantity < 1 ? 1 : quantity;
  const category = toTitleCase(donation.foodCategory);

  return {
    id: donation.id || donation._id || `listing-${Math.random().toString(16).slice(2)}`,
    donationId: donation.id || donation._id || null,
    name: normalizeText(donation.itemName, 'Untitled listing'),
    description: normalizeText(donation.storageRecommendation, 'No description provided'),
    category,
    quantity: safeQuantity,
    listingType,
    isDonation: listingType === 'donate',
    isSell: listingType === 'sell',
    price: priceAmount,
    priceCurrency: normalizeText(donation.priceCurrency, 'LKR'),
    priceLabel:
      normalizeText(donation.priceLabel) ||
      (listingType === 'sell'
        ? `LKR ${priceAmount.toLocaleString('en-LK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : 'Free donation'),
    image: normalizeText(donation.imageUrl, FALLBACK_IMAGE),
    donorName: normalizeText(donation.donorName, 'Supplier'),
    donorType: toTitleCase(donation.donorType || 'Supplier'),
    pickupAddress: normalizeText(donation.pickupAddress, 'Pickup address not provided'),
    pickupDate: formatDateText(donation.preferredPickupDate),
    pickupWindow: formatPickupWindow(donation.preferredPickupTimeFrom, donation.preferredPickupTimeTo),
    distanceLabel:
      donation.distanceKm != null && !Number.isNaN(Number(donation.distanceKm))
        ? `${Number(donation.distanceKm).toFixed(1)} km away`
        : 'Distance unavailable',
    qualityScore:
      donation.aiQualityScore != null && !Number.isNaN(Number(donation.aiQualityScore))
        ? Math.round(Number(donation.aiQualityScore) * 100)
        : null,
    expiryText: donation.expiryText || formatDateText(donation.userProvidedExpiryDate),
    raw: donation,
  };
}

export function mapDonationsToMarketplaceItems(donations = []) {
  if (!Array.isArray(donations)) return [];
  return donations.map(mapDonationToMarketplaceItem);
}
