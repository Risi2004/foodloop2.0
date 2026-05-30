const path = require('path');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { SIGNUP_ROLES } = require('../models/User');
const { sendMail } = require('../config/mailer');
const { otpEmailHtml, otpEmailText } = require('../utils/emailTemplates');
const { generateOtp, hashOtp, verifyOtp, otpExpiryDate, MAX_OTP_ATTEMPTS } = require('../utils/otp');
const { canonicalRole, statusAfterVerification } = require('../utils/roles');
const { signToken } = require('../middleware/auth');
const {
  sendAccountCreatedEmail,
  sendPendingApprovalEmail,
  sendPasswordResetOtpEmail,
  sendPasswordChangedEmail,
  sendAdminLoginNotificationEmail,
} = require('../utils/sendNotificationEmail');
const { uploadSignupFilesToR2, uploadProfileImageFile } = require('../utils/r2Storage');
const {
  isValidEmail,
  isValidContactNo,
  isValidPassword,
  isValidNicNumber,
  normalizeNicNumber,
  normalizeContactNo,
  contactLookupVariants,
  PASSWORD_INVALID_MSG,
  NIC_INVALID_MSG,
} = require('../utils/signupValidation');
const { normalizeVenueType, isValidVenueType } = require('../constants/venueTypes');
const { logActivity } = require('../utils/auditLogger');

const PASSWORD_RESET_VERIFIED_MS = 15 * 60 * 1000;

const PASSWORD_RESET_USER_SELECT =
  '+passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetOtpAttempts +passwordResetVerifiedAt +password';

function fileUrl(req, relativePath) {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath;
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}${relativePath.startsWith('/') ? '' : '/'}${relativePath.replace(/\\/g, '/')}`;
}

function formatUserResponse(req, user) {
  const safe = user.toSafeJSON();
  safe.role = canonicalRole(safe.role) === safe.role ? safe.role : safe.role;
  if (safe.role === 'receiver' || safe.role === 'Receiver') safe.role = 'Receiver';
  else if (safe.role === 'driver' || safe.role === 'Driver') safe.role = 'Driver';
  else if (['restaurant', 'supermarket', 'business', 'individual', 'customer'].includes(safe.role)) {
    // keep lowercase for vendor/customer
  }

  if (safe.profileImage) safe.profileImageUrl = fileUrl(req, safe.profileImage);
  return safe;
}

function normalizeRoleForResponse(role) {
  const r = (role || '').toLowerCase();
  if (r === 'receiver') return 'Receiver';
  if (r === 'driver') return 'Driver';
  if (r === 'admin') return 'Admin';
  if (r === 'donor') return 'Donor';
  return role;
}

async function sendOtpEmail(email, otp) {
  await sendMail({
    to: email,
    subject: 'FoodLoop — Verify your email',
    text: otpEmailText(otp),
    html: otpEmailHtml(otp),
  });
}

async function assignOtp(user) {
  const otp = generateOtp();
  user.otpHash = await hashOtp(otp);
  user.otpExpiresAt = otpExpiryDate();
  user.otpAttempts = 0;
  await user.save();
  await sendOtpEmail(user.email, otp);
}

async function assignPasswordResetOtp(user) {
  const otp = generateOtp();
  user.passwordResetOtpHash = await hashOtp(otp);
  user.passwordResetOtpExpiresAt = otpExpiryDate();
  user.passwordResetOtpAttempts = 0;
  user.passwordResetVerifiedAt = undefined;
  await user.save();
  await sendPasswordResetOtpEmail(user, otp);
}

function clearPasswordResetFields(user) {
  user.passwordResetOtpHash = undefined;
  user.passwordResetOtpExpiresAt = undefined;
  user.passwordResetOtpAttempts = 0;
  user.passwordResetVerifiedAt = undefined;
}

function isPasswordResetVerified(user) {
  if (!user.passwordResetVerifiedAt) return false;
  return Date.now() - user.passwordResetVerifiedAt.getTime() < PASSWORD_RESET_VERIFIED_MS;
}

exports.signup = async (req, res) => {
  try {
    const body = req.body || {};
    const role = (body.role || '').toLowerCase().trim();
    const email = (body.email || '').toLowerCase().trim();
    const password = body.password || '';
    const retypePassword = body.retypePassword || '';
    const contactNo = normalizeContactNo(body.contactNo);
    const address = (body.address || '').trim();

    const errors = [];
    if (!SIGNUP_ROLES.includes(role)) errors.push({ field: 'role', message: 'Invalid role' });
    if (!email || !isValidEmail(email)) errors.push({ field: 'email', message: 'Valid email is required' });
    if (!password || password !== retypePassword) {
      errors.push({ field: 'retypePassword', message: 'Passwords must match' });
    }
    if (!isValidPassword(password)) {
      errors.push({
        field: 'password',
        message: PASSWORD_INVALID_MSG,
      });
    }
    if (!isValidContactNo(contactNo)) {
      errors.push({
        field: 'contactNo',
        message: 'Enter 9 digits after +94',
      });
    }
    if (!address) errors.push({ field: 'address', message: 'Address is required' });

    if (role === 'customer') {
      const level = (body.customerIncomeLevel || '').toLowerCase();
      if (!['normal', 'low'].includes(level)) {
        errors.push({ field: 'customerIncomeLevel', message: 'Please select an income level' });
      }
      if (level === 'low' && !(req.files?.gramaNiladhariLetter?.[0])) {
        errors.push({
          field: 'gramaNiladhariLetter',
          message: 'Grama Niladhari letter is required for low income customers',
        });
      }
    }

    if (role === 'receiver') {
      if (!req.files?.businessRegFile?.[0]) {
        errors.push({ field: 'businessRegFile', message: 'Business registration file is required' });
      }
      if (!req.files?.addressProofFile?.[0]) {
        errors.push({ field: 'addressProofFile', message: 'Address proof file is required' });
      }
      const level = (body.receiverIncomeLevel || '').toLowerCase();
      if (!['normal', 'low'].includes(level)) {
        errors.push({ field: 'receiverIncomeLevel', message: 'Please select an income level' });
      }
      if (level === 'low' && !(req.files?.gramaNiladhariLetter?.[0])) {
        errors.push({
          field: 'gramaNiladhariLetter',
          message: 'Grama Niladhari letter is required for low income receivers',
        });
      }
    }

    if (['restaurant', 'supermarket', 'business'].includes(role)) {
      if (!req.files?.businessRegFile?.[0]) {
        errors.push({ field: 'businessRegFile', message: 'Business registration file is required' });
      }
      if (!req.files?.addressProofFile?.[0]) {
        errors.push({ field: 'addressProofFile', message: 'Address proof file is required' });
      }
    }

    if (role === 'restaurant') {
      const venueType = normalizeVenueType(body.venueType);
      if (!venueType || !isValidVenueType(venueType)) {
        errors.push({
          field: 'venueType',
          message: 'Please select Restaurant or Wedding Hall',
        });
      }
    }

    if (role === 'individual') {
      if (!(body.username || '').trim()) {
        errors.push({ field: 'username', message: 'Name is required' });
      }
      const nicNumber = normalizeNicNumber(body.nicNumber);
      if (!nicNumber) {
        errors.push({ field: 'nicNumber', message: 'NIC number is required' });
      } else if (!isValidNicNumber(nicNumber)) {
        errors.push({ field: 'nicNumber', message: NIC_INVALID_MSG });
      }
      if (!(body.businessName || '').trim()) {
        errors.push({ field: 'businessName', message: 'Startup/business name is required' });
      }
      if (!(body.startupDetails || '').trim()) {
        errors.push({ field: 'startupDetails', message: 'Startup details are required' });
      }
      if (!req.files?.nicFile?.[0]) {
        errors.push({ field: 'nicFile', message: 'NIC document (PDF) is required' });
      }
    }

    if (role === 'driver') {
      if (!req.files?.nicFile?.[0]) {
        errors.push({ field: 'nicFile', message: 'NIC file is required' });
      }
      if (!req.files?.licenseFile?.[0]) {
        errors.push({ field: 'licenseFile', message: 'Driving license file is required' });
      }
    }

    if (errors.length) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
        errors: [{ field: 'email', message: 'This email is already registered.' }],
      });
    }

    const existingContact = await User.findOne({ contactNo: { $in: contactLookupVariants(contactNo) } });
    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: 'Contact already registered',
        errors: [{ field: 'contactNo', message: 'This contact number is already registered.' }],
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userData = {
      email,
      password: hashedPassword,
      role,
      contactNo,
      address,
      accountStatus: 'pending_verification',
      isEmailVerified: false,
    };

    if (role === 'customer') {
      userData.customerIncomeLevel = body.customerIncomeLevel.toLowerCase();
    }

    if (role === 'individual' || role === 'customer') {
      userData.username = (body.username || '').trim();
      if (role === 'individual') {
        userData.nicNumber = normalizeNicNumber(body.nicNumber);
        userData.businessName = (body.businessName || '').trim();
        userData.startupDetails = (body.startupDetails || '').trim();
      }
    }

    if (['restaurant', 'supermarket', 'business'].includes(role)) {
      userData.businessName = (body.businessName || '').trim();
    }

    if (role === 'restaurant') {
      userData.venueType = normalizeVenueType(body.venueType);
    }

    if (role === 'receiver') {
      userData.receiverName = (body.receiverName || '').trim();
      userData.receiverType = (body.receiverType || '').trim();
      userData.receiverIncomeLevel = (body.receiverIncomeLevel || '').toLowerCase();
    }

    if (role === 'driver') {
      userData.driverName = (body.driverName || '').trim();
      userData.vehicleNumber = (body.vehicleNumber || '').trim();
      userData.vehicleType = (body.vehicleType || '').trim();
    }

    const user = new User(userData);
    await user.save();

    const filePaths = await uploadSignupFilesToR2(user._id.toString(), req.files);
    if (Object.keys(filePaths).length > 0) {
      Object.assign(user, filePaths);
      await user.save();
    }

    await assignOtp(user);

    await logActivity(user._id, 'USER_REGISTER', { email: user.email, role: user.role }, req);

    return res.status(201).json({
      success: true,
      message: 'Check your email for the verification code.',
    });
  } catch (err) {
    console.error('Signup error:', err);
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email or contact already registered',
      });
    }
    return res.status(500).json({
      success: false,
      message: err.message || 'Signup failed',
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const otp = (req.body.otp || '').trim();

    if (!email || otp.length !== 6) {
      return res.status(400).json({ success: false, message: 'Email and 6-digit OTP are required' });
    }

    const user = await User.findOne({ email }).select('+otpHash +otpExpiresAt +otpAttempts +password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    if (user.isEmailVerified) {
      return res.json({ success: true, message: 'Email already verified. You can log in.' });
    }

    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please request a new code.',
      });
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Verification code has expired' });
    }

    const valid = await verifyOtp(otp, user.otpHash);
    if (!valid) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    user.isEmailVerified = true;
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = 0;
    user.accountStatus = statusAfterVerification(user.role, user.customerIncomeLevel);
    await user.save();

    const requiresAdminApproval = user.accountStatus === 'pending_approval';
    if (requiresAdminApproval) {
      await sendPendingApprovalEmail(user);
    } else {
      await sendAccountCreatedEmail(user);
    }

    return res.json({
      success: true,
      requiresAdminApproval,
      message: requiresAdminApproval
        ? 'Email verified. Your account is now waiting for administrator approval before you can sign in.'
        : 'Account created successfully! You can log in now.',
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email }).select('+otpHash +otpExpiresAt +otpAttempts');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }

    await assignOtp(user);

    return res.json({ success: true, message: 'A new verification code has been sent to your email.' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    return res.status(500).json({ success: false, message: 'Failed to resend code' });
  }
};

exports.checkEmail = async (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email || !isValidEmail(email)) return res.json({ exists: false });
  const user = await User.findOne({ email });
  return res.json({ exists: !!user });
};

exports.checkContact = async (req, res) => {
  const contactNo = normalizeContactNo(req.query.contactNo);
  if (!contactNo || !isValidContactNo(contactNo)) return res.json({ exists: false });
  const user = await User.findOne({ contactNo: { $in: contactLookupVariants(contactNo) } });
  return res.json({ exists: !!user });
};

exports.login = async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const password = req.body.password || '';

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        errors: [
          ...(!email ? [{ field: 'email', message: 'Email is required' }] : []),
          ...(!password ? [{ field: 'password', message: 'Password is required' }] : []),
        ],
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        errors: [{ field: 'email', message: 'Invalid email or password' }],
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        errors: [{ field: 'password', message: 'Invalid email or password' }],
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.',
      });
    }

    if (user.accountStatus === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Your registration was rejected. Contact support for details.',
      });
    }

    if (user.accountStatus === 'deactivated') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact an administrator to reactivate.',
      });
    }

    if (user.accountStatus === 'pending_approval') {
      return res.status(403).json({
        success: false,
        code: 'PENDING_ADMIN_APPROVAL',
        message: 'Your account is waiting for administrator approval.',
        details:
          'Your email is already verified. A FoodLoop administrator must review and approve your registration before you can sign in. Please try again after you receive approval, or contact support if you have waited more than a few business days.',
      });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact support.',
      });
    }

    const token = signToken(user);
    const safeUser = formatUserResponse(req, user);
    safeUser.role = normalizeRoleForResponse(safeUser.role);

    await logActivity(user._id, 'USER_LOGIN', { email: user.email, role: safeUser.role }, req);

    // Send login notification for Admin logins
    if (safeUser.role === 'Admin') {
      const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' }) + ' (Colombo Time)';
      const rawUserAgent = req.headers['user-agent'] || 'Unknown Device';

      // Parse User-Agent into a friendly device/browser format
      let deviceOS = 'Unknown Device';
      if (rawUserAgent.includes('Windows')) deviceOS = 'Windows PC';
      else if (rawUserAgent.includes('Macintosh')) deviceOS = 'macOS Device';
      else if (rawUserAgent.includes('iPhone')) deviceOS = 'iPhone';
      else if (rawUserAgent.includes('iPad')) deviceOS = 'iPad';
      else if (rawUserAgent.includes('Android')) deviceOS = 'Android Mobile';
      else if (rawUserAgent.includes('Linux')) deviceOS = 'Linux Device';

      let browser = 'Browser';
      if (rawUserAgent.includes('Chrome')) browser = 'Google Chrome';
      else if (rawUserAgent.includes('Safari') && !rawUserAgent.includes('Chrome')) browser = 'Apple Safari';
      else if (rawUserAgent.includes('Firefox')) browser = 'Mozilla Firefox';
      else if (rawUserAgent.includes('Edg')) browser = 'Microsoft Edge';

      const deviceDetails = `${deviceOS} via ${browser}`;

      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'Unknown IP';
      let locationDetails = 'Colombo, Sri Lanka';

      if (clientIp === '::1' || clientIp === '127.0.0.1' || clientIp.startsWith('::ffff:127.0.0.1')) {
        locationDetails = `Localhost Development Server (${clientIp}) — Colombo, Sri Lanka (Mocked)`;
      } else {
        locationDetails = `IP: ${clientIp} (Colombo, Sri Lanka)`;
      }

      // Fire email in background (does not block API response)
      sendAdminLoginNotificationEmail(user, {
        timestamp,
        device: deviceDetails,
        location: locationDetails,
      }).catch((e) => console.error('[email] Error sending admin login notification:', e.message));
    }

    return res.json({
      success: true,
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
};

exports.me = async (req, res) => {
  const safeUser = formatUserResponse(req, req.user);
  safeUser.role = normalizeRoleForResponse(safeUser.role);
  return res.json({ success: true, user: safeUser });
};

exports.forgotPassword = async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
        errors: [{ field: 'email', message: 'Please enter a valid email address' }],
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found for this email.',
        errors: [{ field: 'email', message: 'No account found for this email.' }],
      });
    }

    await assignPasswordResetOtp(user);

    return res.json({
      success: true,
      message: 'A password reset code has been sent to your email.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send reset code' });
  }
};

exports.verifyResetOtp = async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const otp = (req.body.otp || '').trim();

    if (!email || otp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Email and 6-digit code are required',
      });
    }

    const user = await User.findOne({ email }).select(PASSWORD_RESET_USER_SELECT);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found for this email.',
      });
    }

    if (user.passwordResetOtpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please request a new code.',
      });
    }

    if (!user.passwordResetOtpExpiresAt || user.passwordResetOtpExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Reset code has expired. Please request a new one.',
      });
    }

    const valid = await verifyOtp(otp, user.passwordResetOtpHash);
    if (!valid) {
      user.passwordResetOtpAttempts += 1;
      await user.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid reset code',
      });
    }

    user.passwordResetVerifiedAt = new Date();
    user.passwordResetOtpHash = undefined;
    user.passwordResetOtpExpiresAt = undefined;
    user.passwordResetOtpAttempts = 0;
    await user.save();

    return res.json({
      success: true,
      message: 'Code verified. You can now set a new password.',
    });
  } catch (err) {
    console.error('Verify reset OTP error:', err);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

exports.resendResetOtp = async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found for this email.',
      });
    }

    await assignPasswordResetOtp(user);

    return res.json({
      success: true,
      message: 'A new password reset code has been sent to your email.',
    });
  } catch (err) {
    console.error('Resend reset OTP error:', err);
    return res.status(500).json({ success: false, message: 'Failed to resend code' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const password = req.body.password || '';
    const retypePassword = req.body.retypePassword || '';

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    if (!password || password !== retypePassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords must match',
        errors: [{ field: 'retypePassword', message: 'Passwords must match' }],
      });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: PASSWORD_INVALID_MSG,
        errors: [{ field: 'password', message: PASSWORD_INVALID_MSG }],
      });
    }

    const user = await User.findOne({ email }).select(PASSWORD_RESET_USER_SELECT);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found for this email.',
      });
    }

    if (!isPasswordResetVerified(user)) {
      return res.status(400).json({
        success: false,
        message: 'Please verify the reset code first, or request a new one.',
      });
    }

    user.password = await bcrypt.hash(password, 12);
    clearPasswordResetFields(user);
    await user.save();
    await sendPasswordChangedEmail(user);

    return res.json({
      success: true,
      message: 'Password updated successfully. You can now sign in.',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};

exports.deleteMe = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = (req.user.role || '').toLowerCase();

    const Donation = require('../models/Donation');
    const CustomerOrder = require('../models/CustomerOrder');
    const UserNotification = require('../models/UserNotification');

    const DONOR_ROLES = ['donor', 'restaurant', 'supermarket', 'business', 'individual'];

    // 1. Supplier / Donor cleanups
    if (DONOR_ROLES.includes(role)) {
      // Delete any non-delivered listing they listed
      await Donation.deleteMany({
        donorId: userId,
        status: { $ne: 'delivered' },
      });
    }
    // 2. NGO Receiver cleanups
    else if (role === 'receiver') {
      // Release active uncompleted claims back to available pool
      await Donation.updateMany(
        {
          receiverId: userId,
          status: { $ne: 'delivered' },
        },
        {
          $set: {
            receiverId: null,
            claimedAt: null,
            status: 'available',
          },
        }
      );
    }
    // 3. Volunteer Driver cleanups
    else if (role === 'driver') {
      // Return accepted uncompleted donation deliveries to claimed status
      await Donation.updateMany(
        {
          driverId: userId,
          status: { $in: ['driver_assigned', 'picked_up', 'in_transit'] },
        },
        {
          $set: {
            driverId: null,
            assignedAt: null,
            pickedUpAt: null,
            status: 'claimed',
          },
        }
      );
      // Return accepted uncompleted customer orders to finding_driver status
      await CustomerOrder.updateMany(
        {
          driverId: userId,
          status: { $in: ['driver_assigned', 'picked_up', 'in_transit'] },
        },
        {
          $set: {
            driverId: null,
            assignedAt: null,
            pickedUpAt: null,
            status: 'finding_driver',
          },
        }
      );
    }

    // 4. Delete user notifications
    await UserNotification.deleteMany({ userId });

    await logActivity(userId, 'USER_DELETED', { email: req.user.email, role }, req);

    // 5. Delete user profile record
    await User.findByIdAndDelete(userId);

    return res.json({
      success: true,
      message: 'Your account has been deleted successfully.',
    });
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
};

// Allowed fields per role for updateProfile
const PROFILE_ALLOWED_FIELDS_COMMON = ['contactNo', 'address', 'email'];
const PROFILE_ALLOWED_FIELDS = {
  restaurant: [...PROFILE_ALLOWED_FIELDS_COMMON, 'businessName', 'businessType'],
  supermarket: [...PROFILE_ALLOWED_FIELDS_COMMON, 'businessName', 'businessType'],
  business: [...PROFILE_ALLOWED_FIELDS_COMMON, 'businessName', 'businessType'],
  individual: [...PROFILE_ALLOWED_FIELDS_COMMON, 'username', 'nicNumber', 'businessName', 'startupDetails'],
  customer: [...PROFILE_ALLOWED_FIELDS_COMMON, 'username'],
  receiver: [...PROFILE_ALLOWED_FIELDS_COMMON, 'receiverName', 'receiverType', 'aboutUs'],
  driver: [...PROFILE_ALLOWED_FIELDS_COMMON, 'driverName', 'vehicleType', 'vehicleNumber'],
  donor: [...PROFILE_ALLOWED_FIELDS_COMMON, 'businessName', 'businessType', 'username', 'nicNumber', 'startupDetails'],
  admin: [...PROFILE_ALLOWED_FIELDS_COMMON],
};

exports.updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const role = (user.role || '').toLowerCase();
    const allowedFields = PROFILE_ALLOWED_FIELDS[role] || PROFILE_ALLOWED_FIELDS_COMMON;

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const val = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
        if (val !== '') updates[field] = val;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided for update' });
    }

    // Special handling: contactNo normalization
    if (updates.contactNo) {
      updates.contactNo = normalizeContactNo(updates.contactNo);
      if (!isValidContactNo(updates.contactNo)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid contact number',
          errors: [{ field: 'contactNo', message: 'Enter 9 digits after +94' }],
        });
      }
      // Check uniqueness (exclude self)
      const existing = await User.findOne({
        _id: { $ne: user._id },
        contactNo: { $in: contactLookupVariants(updates.contactNo) },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Contact number already in use',
          errors: [{ field: 'contactNo', message: 'This contact number is already registered.' }],
        });
      }
    }

    // Email change: validate and check uniqueness
    if (updates.email) {
      updates.email = updates.email.toLowerCase();
      if (!isValidEmail(updates.email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address',
          errors: [{ field: 'email', message: 'Please enter a valid email.' }],
        });
      }
      const existing = await User.findOne({ _id: { $ne: user._id }, email: updates.email });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use',
          errors: [{ field: 'email', message: 'This email is already registered.' }],
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await logActivity(user._id, 'PROFILE_UPDATED', { fields: Object.keys(updates) }, req);

    const safeUser = formatUserResponse(req, updatedUser);
    safeUser.role = normalizeRoleForResponse(safeUser.role);
    return res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update profile' });
  }
};

exports.uploadProfileImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const user = req.user;
    const imageUrl = await uploadProfileImageFile({ userId: user._id.toString(), file });

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: { profileImage: imageUrl } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await logActivity(user._id, 'PROFILE_IMAGE_UPDATED', {}, req);

    const safeUser = formatUserResponse(req, updatedUser);
    safeUser.role = normalizeRoleForResponse(safeUser.role);
    return res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error('Upload profile image error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to upload profile image' });
  }
};
