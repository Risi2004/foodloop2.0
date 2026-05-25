// Token management utilities

const TOKEN_KEY = 'foodloop_token';
const USER_KEY = 'foodloop_user';

const VENDOR_ROLES = ['restaurant', 'supermarket', 'business', 'individual'];

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

  if (key === 'donor') return '/donor/dashboard';
  if (key === 'receiver') return '/receiver/dashboard';
  if (key === 'driver') return '/driver/dashboard';
  if (key === 'admin') return '/admin/dashboard';
  if (key === 'customer') return '/customer/marketplace';
  if (VENDOR_ROLES.includes(key)) return '/vendor/dashboard';
  return '/login';
};

export const rolesMatch = (userRole, allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const normalized = normalizeRole(userRole);
  return allowedRoles.some((allowed) => {
    const a = String(allowed).trim();
    if (a.toLowerCase() === normalized.toLowerCase()) return true;
    if (VENDOR_ROLES.includes(a.toLowerCase()) && VENDOR_ROLES.includes(normalized.toLowerCase())) {
      return a.toLowerCase() === normalized.toLowerCase();
    }
    return false;
  });
};
