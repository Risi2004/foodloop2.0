// Token management utilities

const TOKEN_KEY = 'foodloop_token';
const USER_KEY = 'foodloop_user';

/**
 * Store authentication token
 * @param {string} token - JWT token
 */
export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Get authentication token
 * @returns {string|null} JWT token or null
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Remove authentication token
 */
export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Store user data
 * @param {Object} user - User object
 */
export const setUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Get stored user data
 * @returns {Object|null} User object or null
 */
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

/**
 * Remove user data
 */
export const removeUser = () => {
  localStorage.removeItem(USER_KEY);
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if token exists
 */
export const isAuthenticated = () => {
  return !!getToken();
};

/**
 * Clear all authentication data (logout)
 */
export const clearAuth = () => {
  removeToken();
  removeUser();
};

/**
 * Get authorization header for API requests
 * @returns {Object} Headers object with Authorization
 */
export const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

/**
 * Check if token is expired (basic client-side check)
 * Note: This is a basic check. Server-side verification is required for security.
 * @returns {boolean} True if token appears to be expired
 */
export const isTokenExpired = () => {
  const token = getToken();
  if (!token) return true;

  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    // Decode payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    
    // Check expiration
    if (payload.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // Assume expired if we can't parse
  }
};
