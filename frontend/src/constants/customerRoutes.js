export const CUSTOMER_BASE = '/customer';

export function customerPath(...segments) {
  const path = segments.filter(Boolean).join('/');
  return path ? `${CUSTOMER_BASE}/${path}` : CUSTOMER_BASE;
}

export const customerRoutes = {
  marketplace: () => customerPath('marketplace'),
  cart: () => customerPath('cart'),
  payment: () => customerPath('payment'),
  orderHistory: () => customerPath('order-history'),
  orderTracking: () => customerPath('order-tracking'),
  trackOrder: (orderId) => `${customerPath('track-order')}?donationId=${encodeURIComponent(orderId)}`,
  profile: () => customerPath('profile'),
  about: () => customerPath('about'),
  notifications: () => customerPath('notifications'),
  privacyPolicy: () => customerPath('privacy-policy'),
  terms: () => customerPath('terms-&-conditions'),
  contact: () => `${customerPath('marketplace')}#contact`,
};
