import { getAuthHeaders } from '../utils/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.response = { data, status: response.status };
    throw error;
  }
  return data;
}

function buildUrl(path) {
  const base = API_BASE.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

export const signup = async (formData) => {
  const response = await fetch(buildUrl('/api/auth/signup'), {
    method: 'POST',
    body: formData,
  });
  return parseResponse(response);
};

export const verifySignupOtp = async (email, otp) => {
  const response = await fetch(buildUrl('/api/auth/verify-otp'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  return parseResponse(response);
};

export const resendSignupOtp = async (email) => {
  const response = await fetch(buildUrl('/api/auth/resend-otp'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return parseResponse(response);
};

export const checkEmailExists = async (email) => {
  const params = new URLSearchParams({ email: email.trim() });
  const response = await fetch(buildUrl(`/api/auth/check-email?${params}`));
  return parseResponse(response);
};

export const checkContactNoExists = async (contactNo) => {
  const params = new URLSearchParams({ contactNo: contactNo.replace(/\s/g, '') });
  const response = await fetch(buildUrl(`/api/auth/check-contact?${params}`));
  return parseResponse(response);
};

export const login = async (email, password) => {
  const response = await fetch(buildUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return parseResponse(response);
};

export const getCurrentUser = async () => {
  const response = await fetch(buildUrl('/api/auth/me'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const requestPasswordReset = async (email) => {
  const response = await fetch(buildUrl('/api/auth/forgot-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  return parseResponse(response);
};

export const verifyResetOtp = async (email, otp) => {
  const response = await fetch(buildUrl('/api/auth/verify-reset-otp'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
  });
  return parseResponse(response);
};

export const resendResetOtp = async (email) => {
  const response = await fetch(buildUrl('/api/auth/resend-reset-otp'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  return parseResponse(response);
};

export const resetPassword = async (email, password, retypePassword) => {
  const response = await fetch(buildUrl('/api/auth/reset-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      retypePassword,
    }),
  });
  return parseResponse(response);
};

export const changePassword = async () => ({
  success: true,
  message: 'Change password is not configured yet.',
});

export const getAdminStats = async () => {
  const response = await fetch(buildUrl('/api/admin/stats'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const getPendingUsers = async () => {
  const response = await fetch(buildUrl('/api/admin/pending-users'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const updateUserStatus = async (userId, status) => {
  const response = await fetch(buildUrl(`/api/admin/users/${userId}/status`), {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  return parseResponse(response);
};

export const getAllUsers = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.role) params.set('role', filters.role);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  const path = qs ? `/api/admin/users?${qs}` : '/api/admin/users';
  const response = await fetch(buildUrl(path), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const deleteAccount = async () => ({ success: true });

export const uploadProfileImage = async () => {
  const me = await getCurrentUser();
  return { success: true, user: me.user };
};

export const updateDonorProfile = async (profile) => {
  const me = await getCurrentUser();
  return { success: true, user: { ...me.user, ...profile } };
};

export const updateReceiverProfile = async (profile) => {
  const me = await getCurrentUser();
  return { success: true, user: { ...me.user, ...profile } };
};

export const updateDriverProfile = async (profile) => {
  const me = await getCurrentUser();
  return { success: true, user: { ...me.user, ...profile } };
};

export const updateDriverLocation = async () => ({ success: true });

export const startDemo = async () => ({ success: true });

export const stopDemo = async () => ({ success: true });
