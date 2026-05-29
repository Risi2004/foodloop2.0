const express = require('express');
const supplierBundleController = require('../controllers/supplierBundle.controller');
const { verifyJwt } = require('../middleware/auth');

const router = express.Router();

router.get('/status', verifyJwt, supplierBundleController.getStatus);
router.post('/subscription/checkout', verifyJwt, supplierBundleController.subscriptionCheckout);
router.post('/subscription/confirm', verifyJwt, supplierBundleController.subscriptionConfirm);
router.post(
  '/subscription/cancel-auto-renew',
  verifyJwt,
  supplierBundleController.cancelSubscriptionAutoRenew
);

module.exports = router;
