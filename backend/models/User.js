const mongoose = require('mongoose');

const SIGNUP_ROLES = [
  'receiver',
  'driver',
  'restaurant',
  'supermarket',
  'business',
  'individual',
  'customer',
];

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: [...SIGNUP_ROLES, 'Admin', 'Donor'] },
    contactNo: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    profileImage: { type: String, default: null },

    isEmailVerified: { type: Boolean, default: false },
    accountStatus: {
      type: String,
      enum: ['pending_verification', 'pending_approval', 'active', 'rejected', 'deactivated'],
      default: 'pending_verification',
    },

    otpHash: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },

    passwordResetOtpHash: { type: String, select: false },
    passwordResetOtpExpiresAt: { type: Date, select: false },
    passwordResetOtpAttempts: { type: Number, default: 0, select: false },
    passwordResetVerifiedAt: { type: Date, select: false },

    username: { type: String, trim: true },
    businessName: { type: String, trim: true },
    receiverName: { type: String, trim: true },
    receiverType: { type: String, trim: true },
    receiverIncomeLevel: { type: String, enum: ['normal', 'low'], default: null },
    venueType: {
      type: String,
      enum: ['restaurant', 'wedding_hall'],
      default: null,
    },
    driverName: { type: String, trim: true },
    vehicleNumber: { type: String, trim: true },
    vehicleType: { type: String, trim: true },
    driverLatitude: { type: Number, default: null },
    driverLongitude: { type: Number, default: null },
    driverLocationUpdatedAt: { type: Date, default: null },

    businessRegFile: { type: String, default: null },
    addressProofFile: { type: String, default: null },
    nicNumber: { type: String, default: null, trim: true },
    nicFile: { type: String, default: null },
    licenseFile: { type: String, default: null },
    gramaNiladhariLetter: { type: String, default: null },

    customerIncomeLevel: { type: String, enum: ['normal', 'low'], default: null },
    startupDetails: { type: String, default: null },

    payoutBankName: { type: String, default: null, trim: true },
    payoutAccountName: { type: String, default: null, trim: true },
    payoutAccountNumber: { type: String, default: null, trim: true },
    payoutBranch: { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otpHash;
  delete obj.otpExpiresAt;
  delete obj.otpAttempts;
  delete obj.passwordResetOtpHash;
  delete obj.passwordResetOtpExpiresAt;
  delete obj.passwordResetOtpAttempts;
  delete obj.passwordResetVerifiedAt;
  obj.id = obj._id.toString();
  return obj;
};

module.exports = mongoose.model('User', userSchema);
module.exports.SIGNUP_ROLES = SIGNUP_ROLES;
