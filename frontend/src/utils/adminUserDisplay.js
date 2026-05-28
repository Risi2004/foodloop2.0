import { getVenueTypeLabel } from '../constants/venueTypes';

const VENDOR_ROLE_LABELS = {
  restaurant: 'Restaurant / Wedding Hall',
  supermarket: 'Supermarket',
  business: 'Other Business',
  individual: 'Individual / Startup',
};

/** User-facing role label in admin UI (DB role values unchanged). */
export function getAdminRoleLabel(role) {
  const key = (role || '').toLowerCase();
  if (key === 'donor') return 'Supplier';
  if (key === 'receiver') return 'Receiver';
  if (key === 'driver') return 'Driver';
  if (key === 'admin') return 'Admin';
  if (key === 'customer') return 'Customer';
  if (VENDOR_ROLE_LABELS[key]) return VENDOR_ROLE_LABELS[key];
  return role || '—';
}

export function getAdminUserName(user) {
  if (!user) return '—';
  const role = (user.role || '').toLowerCase();

  if (role === 'donor') {
    if (user.donorType === 'Business' && user.businessName) return user.businessName;
    return user.username || user.email || 'Supplier';
  }
  if (role === 'receiver') return user.receiverName || user.email || 'Receiver';
  if (role === 'driver') return user.driverName || user.email || 'Driver';
  if (role === 'customer') return user.username || user.email || 'Customer';
  if (VENDOR_ROLE_LABELS[role]) {
    return user.businessName || user.username || user.email || VENDOR_ROLE_LABELS[role];
  }
  return user.username || user.businessName || user.email || '—';
}

export function getAdminUserOrganization(user) {
  if (!user) return '';
  const role = (user.role || '').toLowerCase();

  if (role === 'donor') {
    if (user.donorType === 'Business') return user.businessType || '';
    return user.donorType || 'Individual';
  }
  if (role === 'receiver') return user.receiverType || '';
  if (role === 'driver') {
    return user.vehicleType
      ? `${user.vehicleType}${user.vehicleNumber ? ` • ${user.vehicleNumber}` : ''}`
      : '';
  }
  if (role === 'customer') {
    if (user.customerIncomeLevel === 'low') return 'Customer • Low income';
    if (user.customerIncomeLevel === 'normal') return 'Customer • Normal income';
    return 'Customer';
  }
  if (role === 'restaurant') {
    const venueLabel = getVenueTypeLabel(user.venueType);
    return venueLabel || VENDOR_ROLE_LABELS.restaurant;
  }
  if (VENDOR_ROLE_LABELS[role]) return VENDOR_ROLE_LABELS[role];
  return user.role || '';
}
