// Token management utilities

import { supplierRoutes } from '../constants/supplierRoutes';

const TOKEN_KEY = 'foodloop_token';
const USER_KEY = 'foodloop_user';

const VENDOR_ROLES = ['restaurant', 'supermarket', 'business', 'individual'];

/** Roles that use the donor dashboard (legacy Donor + vendor signups) */
export const DONOR_DASHBOARD_ROLES = ['Donor', ...VENDOR_ROLES];

export function isDonorDashboardRole(role) {
  const key = normalizeRole(role).toLowerCase();
  return key === 'donor' || VENDOR_ROLES.includes(key);
}

/** Display name for supplier dashboard navbar (business name, not email) */
export function getSupplierDisplayName(user) {
  if (!user) return 'User';
  const role = (user.role || '').toLowerCase();

  if (role === 'donor') {
    if (user.donorType === 'Business') return user.businessName?.trim() || user.username?.trim() || 'Business';
    return user.username?.trim() || 'Supplier';
  }

  if (['restaurant', 'supermarket', 'business'].includes(role)) {
    return user.businessName?.trim() || 'Business';
  }

  if (role === 'individual') {
    return user.businessName?.trim() || user.username?.trim() || 'Individual';
  }

  return user.businessName?.trim() || user.username?.trim() || 'User';
}

/** @deprecated Use getSupplierDisplayName */
export const getDonorDisplayName = getSupplierDisplayName;

/** Resolved profile photo URL from login/signup user object (R2, /uploads, or blob preview) */
export function getUserProfileImageUrl(user) {
  if (!user) return null;
  const raw = user.profileImageUrl || user.profileImage;
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^(https?:|blob:)/i.test(trimmed)) return trimmed;
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return base ? `${base}${path}` : path;
}

export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const setUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = () => {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

export const removeUser = () => {
  localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const clearAuth = () => {
  removeToken();
  removeUser();
};

export const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const isTokenExpired = () => {
  const token = getToken();
  if (!token) return true;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const payload = JSON.parse(atob(parts[1]));

    if (payload.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    }

    return false;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

export const normalizeRole = (role) => {
  if (!role) return '';
  const r = String(role).trim();
  if (r.toLowerCase() === 'receiver') return 'Receiver';
  if (r.toLowerCase() === 'driver') return 'Driver';
  if (r.toLowerCase() === 'donor') return 'Donor';
  if (r.toLowerCase() === 'admin') return 'Admin';
  return r;
};

export const getDashboardPath = (role) => {
  const key = normalizeRole(role).toLowerCase();

  if (isDonorDashboardRole(role)) return supplierRoutes.dashboard();
  if (key === 'receiver') return '/receiver/dashboard';
  if (key === 'driver') return '/driver/dashboard';
  if (key === 'admin') return '/admin/dashboard';
  if (key === 'customer') return '/customer/marketplace';
  return '/login';
};

export const rolesMatch = (userRole, allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const normalized = normalizeRole(userRole);
  const allowsDonorArea = allowedRoles.some((allowed) =>
    DONOR_DASHBOARD_ROLES.some(
      (donorRole) => donorRole.toLowerCase() === String(allowed).trim().toLowerCase()
    )
  );
  if (allowsDonorArea && isDonorDashboardRole(userRole)) return true;
  return allowedRoles.some((allowed) => {
    const a = String(allowed).trim();
    if (a.toLowerCase() === normalized.toLowerCase()) return true;
    if (VENDOR_ROLES.includes(a.toLowerCase()) && VENDOR_ROLES.includes(normalized.toLowerCase())) {
      return a.toLowerCase() === normalized.toLowerCase();
    }
    return false;
  });
};
