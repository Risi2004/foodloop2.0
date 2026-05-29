const express = require('express');
const supplierAiController = require('../controllers/supplierAi.controller');
const { verifyJwt } = require('../middleware/auth');

const router = express.Router();

router.get('/status', verifyJwt, supplierAiController.getStatus);
router.post('/tomorrow', verifyJwt, supplierAiController.getTomorrowInsights);
router.post(
  '/subscription/checkout',
  verifyJwt,
  supplierAiController.subscriptionCheckout
);
router.post(
  '/subscription/confirm',
  verifyJwt,
  supplierAiController.subscriptionConfirm
);
router.post(
  '/subscription/cancel-auto-renew',
  verifyJwt,
  supplierAiController.cancelSubscriptionAutoRenew
);

module.exports = router;
