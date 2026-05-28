const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONTACT_REGEX = /^\+94\d{9}$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_INVALID_MSG =
  'Password must be at least 8 characters and include letters, numbers, and special characters';
/** Sri Lankan NIC: 9 digits + optional V/X, or 12 digits. */
const NIC_NUMBER_REGEX = /^(\d{9}[vVxX]?|\d{12})$/;
const NIC_INVALID_MSG = 'Enter a valid NIC (9 digits + V/X, or 12 digits)';

function normalizeContactNo(value) {
  return (value || '').replace(/\s/g, '');
}

/**
 * Legacy DB may store 0771234567; new signups use +94771234567.
 */
function contactLookupVariants(contactNo) {
  const normalized = normalizeContactNo(contactNo);
  if (!CONTACT_REGEX.test(normalized)) return [normalized];

  const nineDigits = normalized.slice(3);
  return [...new Set([normalized, `0${nineDigits}`, nineDigits, `94${nineDigits}`])];
}

function isValidEmail(email) {
  return EMAIL_REGEX.test((email || '').toLowerCase().trim());
}

function isValidContactNo(contactNo) {
  return CONTACT_REGEX.test(normalizeContactNo(contactNo));
}

function isValidPassword(password) {
  return PASSWORD_REGEX.test(password || '');
}

function normalizeNicNumber(value) {
  return String(value || '').replace(/\s/g, '').toUpperCase();
}

function isValidNicNumber(value) {
  return NIC_NUMBER_REGEX.test(normalizeNicNumber(value));
}

module.exports = {
  EMAIL_REGEX,
  CONTACT_REGEX,
  PASSWORD_REGEX,
  PASSWORD_INVALID_MSG,
  NIC_NUMBER_REGEX,
  NIC_INVALID_MSG,
  normalizeContactNo,
  contactLookupVariants,
  normalizeNicNumber,
  isValidEmail,
  isValidContactNo,
  isValidPassword,
  isValidNicNumber,
};
