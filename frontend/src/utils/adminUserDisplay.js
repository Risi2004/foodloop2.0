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

function formatProfileValue(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function formatProfileDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAccountStatus(user) {
  const status = user?.status || user?.accountStatus;
  if (!status) return null;
  const labels = {
    completed: 'Active',
    active: 'Active',
    pending: 'Pending approval',
    pending_approval: 'Pending approval',
    pending_verification: 'Pending email verification',
    rejected: 'Rejected',
    inactive: 'Deactivated',
    deactivated: 'Deactivated',
    unverified: 'Unverified',
  };
  return labels[status] || status;
}

function formatIncomeLevel(level) {
  if (!level) return null;
  if (level === 'low') return 'Low income';
  if (level === 'normal') return 'Normal income';
  return level;
}

/** Profile fields for admin user detail modal (label + value pairs). */
export function getAdminUserProfileDetails(user) {
  if (!user) return [];

  const rows = [];
  const add = (label, value) => {
    const formatted = formatProfileValue(value);
    if (formatted) rows.push({ label, value: formatted });
  };

  const role = (user.role || '').toLowerCase();

  add('Display Name', getAdminUserName(user));
  add('Email', user.email);
  add('Role', getAdminRoleLabel(user.role));
  add('Organization / Type', getAdminUserOrganization(user));

  if (['restaurant', 'supermarket', 'business'].includes(role)) {
    add('Business Name', user.businessName);
    if (role === 'restaurant') add('Venue Type', getVenueTypeLabel(user.venueType));
  } else if (role === 'individual') {
    add('Username', user.username);
    add('Business / Startup Name', user.businessName);
    add('Startup Details', user.startupDetails);
  } else if (role === 'donor') {
    add('Username', user.username);
    add('Business Name', user.businessName);
    add('Supplier Type', user.donorType);
    add('Business Type', user.businessType);
  } else if (role === 'receiver') {
    add('Organization Name', user.receiverName);
    add('Receiver Type', user.receiverType);
    add('Income Level', formatIncomeLevel(user.receiverIncomeLevel));
  } else if (role === 'driver') {
    add('Driver Name', user.driverName);
    add('Vehicle Type', user.vehicleType);
    add('Vehicle Number', user.vehicleNumber);
  } else if (role === 'customer') {
    add('Username', user.username);
    add('Income Level', formatIncomeLevel(user.customerIncomeLevel));
  }

  add('Contact Number', user.contactNo);
  add('Address', user.address);
  add('NIC Number', user.nicNumber);
  add('Registered On', formatProfileDate(user.createdAt));
  add('Account Status', formatAccountStatus(user));
  add('Email Verified', user.isEmailVerified ? 'Yes' : 'No');

  return rows;
}
