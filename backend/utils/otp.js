const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

async function verifyOtp(otp, hash) {
  return bcrypt.compare(otp, hash);
}

function otpExpiryDate() {
  return new Date(Date.now() + OTP_EXPIRY_MS);
}

module.exports = {
  OTP_EXPIRY_MS,
  MAX_OTP_ATTEMPTS,
  generateOtp,
  hashOtp,
  verifyOtp,
  otpExpiryDate,
};
