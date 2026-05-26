function parseExpiryDateInput(date) {
  if (!date) return null;
  if (date instanceof Date) return date;
  const s = String(date).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Full expiry date for listings (day/month/year).
 */
export function formatExpiryDate(date) {
  const expiryDate = parseExpiryDateInput(date);
  if (!expiryDate) return 'N/A';
  const day = expiryDate.getDate().toString().padStart(2, '0');
  const month = (expiryDate.getMonth() + 1).toString().padStart(2, '0');
  const year = expiryDate.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getDonationExpiryDisplay(donation) {
  if (!donation) return 'N/A';
  const raw = donation.expiryDate ?? donation.userProvidedExpiryDate;
  return formatExpiryDate(raw);
}

/**
 * Format price for sell listings; returns null for donate/free listings.
 */
export function formatListingPrice(donation) {
  if (!donation) return null;
  if ((donation.listingType || '').toLowerCase() !== 'sell') return null;
  const amount = Number(donation.priceAmount);
  if (Number.isNaN(amount) || amount <= 0) return null;
  const currency = (donation.priceCurrency || 'LKR').trim();
  return `${currency} ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function isPaidListing(donation) {
  return (donation?.listingType || '').toLowerCase() === 'sell' && formatListingPrice(donation);
}
