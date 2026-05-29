const express = require('express');
const supplierEsgController = require('../controllers/supplierEsg.controller');
const { verifyJwt } = require('../middleware/auth');

const router = express.Router();

router.get('/status', verifyJwt, supplierEsgController.getStatus);
router.get('/report', verifyJwt, supplierEsgController.getReport);
router.post('/subscription/checkout', verifyJwt, supplierEsgController.subscriptionCheckout);
router.post('/subscription/confirm', verifyJwt, supplierEsgController.subscriptionConfirm);
router.post(
  '/subscription/cancel-auto-renew',
  verifyJwt,
  supplierEsgController.cancelSubscriptionAutoRenew
);

module.exports = router;
