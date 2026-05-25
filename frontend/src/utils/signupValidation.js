export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const CONTACT_PREFIX = '+94';
export const CONTACT_REGEX = /^\+94\d{9}$/;
export const PASSWORD_MIN_LENGTH = 8;
/** At least 8 chars with letters, numbers, and special characters. */
export const PASSWORD_REGEX =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
export const PASSWORD_INVALID_MSG =
  'Password must be at least 8 characters and include letters, numbers, and special characters';
export const NAME_REGEX = /^[a-zA-Z\s]+$/;
export const VEHICLE_NUMBER_REGEX = /^[a-zA-Z0-9\s]+$/;

export const EMAIL_DUPLICATE_MSG = 'This email is already registered.';
export const CONTACT_DUPLICATE_MSG = 'This contact number is already registered.';

export function normalizeEmail(value) {
  return (value || '').toLowerCase().trim();
}

export function normalizeContactNo(value) {
  return (value || '').replace(/\s/g, '');
}

/** Nine digits only (user input after fixed +94 prefix). */
export function getContactDigits(contactNo) {
  const normalized = normalizeContactNo(contactNo);
  if (normalized.startsWith(CONTACT_PREFIX)) {
    return normalized.slice(CONTACT_PREFIX.length).replace(/\D/g, '').slice(0, 9);
  }
  return normalized.replace(/\D/g, '').slice(0, 9);
}

export function buildContactNo(digits) {
  const nine = (digits || '').replace(/\D/g, '').slice(0, 9);
  return nine ? `${CONTACT_PREFIX}${nine}` : '';
}

export function isValidEmail(value) {
  return EMAIL_REGEX.test(normalizeEmail(value));
}

export function isValidContactNo(value) {
  return CONTACT_REGEX.test(normalizeContactNo(value));
}

export function isValidPassword(value) {
  return PASSWORD_REGEX.test(value || '');
}

/**
 * @param {string} fieldId
 * @param {string} value
 * @param {{ roleType?: string, password?: string }} context
 */
export function validateSignupField(fieldId, value, context = {}) {
  const { roleType, password: passwordRef } = context;
  const trimmed = typeof value === 'string' ? value.trim() : '';

  switch (fieldId) {
    case 'username':
    case 'receiverName':
    case 'driverName':
    case 'businessName':
      if (!trimmed) return 'Name is required';
      if (!NAME_REGEX.test(trimmed)) return 'Name must contain only letters and spaces';
      return null;
    case 'email':
      if (!trimmed) return 'Email is required';
      if (!isValidEmail(trimmed)) return 'Please enter a valid email address';
      return null;
    case 'contactNo': {
      const digits = getContactDigits(value);
      if (!digits) return 'Contact number is required';
      if (digits.length < 9) return 'Enter 9 digits after +94';
      if (!CONTACT_REGEX.test(buildContactNo(digits))) {
        return 'Enter 9 digits after +94';
      }
      return null;
    }
    case 'vehicleNumber':
      if (!trimmed) return 'Vehicle number is required';
      if (!VEHICLE_NUMBER_REGEX.test(trimmed)) {
        return 'Vehicle number can contain only letters, numbers and spaces';
      }
      return null;
    case 'password':
      if (!value) return 'Password is required';
      if (!isValidPassword(value)) {
        return PASSWORD_INVALID_MSG;
      }
      return null;
    case 'retypePassword':
      if (!value) return 'Retype password is required';
      if ((passwordRef ?? '') !== value) return 'Passwords do not match';
      return null;
    default:
      return null;
  }
}
