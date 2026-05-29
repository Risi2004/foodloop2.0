export const SUPPLIER_BASE = '/supplier';

export function supplierPath(...segments) {
  const path = segments.filter(Boolean).join('/');
  return path ? `${SUPPLIER_BASE}/${path}` : SUPPLIER_BASE;
}

export const supplierRoutes = {
  dashboard: () => supplierPath('dashboard'),
  about: () => supplierPath('about'),
  privacyPolicy: () => supplierPath('privacy-policy'),
  terms: () => supplierPath('terms-&-conditions'),
  notifications: () => supplierPath('notifications'),
  profile: () => supplierPath('profile'),
  editProfile: () => supplierPath('edit-profile'),
  individualEditProfile: () => supplierPath('individual-edit-profile'),
  myDonation: () => supplierPath('my-donation'),
  newDonation: () => supplierPath('new-donation'),
  editDonation: (donationId) => supplierPath(`edit-donation/${donationId}`),
  trackOrder: (donationId) =>
    donationId
      ? `${supplierPath('track-order')}?donationId=${encodeURIComponent(donationId)}`
      : supplierPath('track-order'),
  digitalReceipt: (donationId) =>
    donationId
      ? `${supplierPath('digital-receipt')}?donationId=${encodeURIComponent(donationId)}`
      : supplierPath('digital-receipt'),
  earnings: () => supplierPath('earnings'),
  esgCsr: () => supplierPath('esg-csr'),
};

/** Map legacy /donor/* paths to /supplier/* (same sub-path). */
export function legacyDonorToSupplier(pathname) {
  if (!pathname || !pathname.startsWith('/donor')) return SUPPLIER_BASE;
  return pathname.replace(/^\/donor/, SUPPLIER_BASE);
}
