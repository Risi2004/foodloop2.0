const express = require('express');
const authController = require('../controllers/auth.controller');
const { signupUpload, profileImageUpload } = require('../middleware/upload');
const { verifyJwt } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/signup',
  (req, res, next) => {
    signupUpload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed',
        });
      }
      next();
    });
  },
  authController.signup
);

router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
router.get('/check-email', authController.checkEmail);
router.get('/check-contact', authController.checkContact);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-otp', authController.verifyResetOtp);
router.post('/resend-reset-otp', authController.resendResetOtp);
router.post('/reset-password', authController.resetPassword);
router.get('/me', verifyJwt, authController.me);
router.delete('/me', verifyJwt, authController.deleteMe);

// Profile update routes (protected)
router.patch('/profile', verifyJwt, authController.updateProfile);
router.post(
  '/profile/image',
  verifyJwt,
  (req, res, next) => {
    profileImageUpload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Image upload failed',
        });
      }
      next();
    });
  },
  authController.uploadProfileImage
);

module.exports = router;


