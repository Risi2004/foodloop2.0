/**
 * Offline stubs — no network. getCurrentUser role follows the URL path for sensible UI.
 */

function pathRole() {
  if (typeof window === 'undefined') return 'Donor';
  const p = window.location.pathname || '';
  if (p.startsWith('/admin')) return 'Admin';
  if (p.startsWith('/receiver')) return 'Receiver';
  if (p.startsWith('/driver')) return 'Driver';
  if (p.startsWith('/donor')) return 'Donor';
  return 'Donor';
}

function placeholderUser() {
  const role = pathRole();
  const base = {
    id: 'offline',
    _id: 'offline',
    email: 'offline@local',
    role,
    profileImageUrl: null,
  };
  if (role === 'Donor') {
    return { ...base, donorType: 'Individual', username: 'Demo Donor' };
  }
  if (role === 'Receiver') {
    return { ...base, receiverName: 'Demo Receiver' };
  }
  if (role === 'Driver') {
    return {
      ...base,
      driverName: 'Demo Driver',
      driverLatitude: 6.9271,
      driverLongitude: 79.8612,
    };
  }
  return base;
}

export const signup = async () => ({ success: true, message: 'Offline mode' });

export const verifySignupOtp = async () => ({ success: true });

export const resendSignupOtp = async () => ({ success: true });

export const checkEmailExists = async () => ({ exists: false });

export const checkContactNoExists = async () => ({ exists: false });

export const login = async () => {
  const err = new Error('Offline mode: use the address bar to open role pages (e.g. /donor/dashboard).');
  err.response = { data: { message: err.message } };
  throw err;
};

export const requestPasswordReset = async () => ({
  success: true,
  message: 'Offline mode',
});

export const resetPassword = async () => ({ success: true });

export const changePassword = async () => ({ success: true });

export const getAdminStats = async () => ({
  success: true,
  stats: {
    donors: 0,
    drivers: 0,
    receivers: 0,
  },
});

export const getPendingUsers = async () => ({ success: true, users: [] });

export const updateUserStatus = async () => ({ success: true });

export const getAllUsers = async () => ({ success: true, users: [] });

export const getCurrentUser = async () => ({
  success: true,
  user: placeholderUser(),
});

export const deleteAccount = async () => ({ success: true });

export const uploadProfileImage = async () => ({
  success: true,
  user: placeholderUser(),
});

export const updateDonorProfile = async (profile) => ({
  success: true,
  user: { ...placeholderUser(), ...profile },
});

export const updateReceiverProfile = async (profile) => ({
  success: true,
  user: { ...placeholderUser(), ...profile },
});

export const updateDriverProfile = async (profile) => ({
  success: true,
  user: { ...placeholderUser(), ...profile },
});

export const updateDriverLocation = async () => ({ success: true });

export const startDemo = async () => ({ success: true });

export const stopDemo = async () => ({ success: true });
