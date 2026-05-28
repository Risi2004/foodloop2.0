const express = require('express');
const paymentController = require('../controllers/payment.controller');
const { verifyJwt } = require('../middleware/auth');

const router = express.Router();

router.use(verifyJwt);

router.post('/claim/checkout', paymentController.createClaimCheckout);
router.post('/claim/confirm', paymentController.confirmClaimPayment);

module.exports = router;
