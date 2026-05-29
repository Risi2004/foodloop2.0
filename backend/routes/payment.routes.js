const express = require('express');
const paymentController = require('../controllers/payment.controller');
const { verifyJwt } = require('../middleware/auth');

const router = express.Router();

router.use(verifyJwt);

router.post('/claim/checkout', paymentController.createClaimCheckout);
router.post('/claim/confirm', paymentController.confirmClaimPayment);
router.post('/customer/checkout', paymentController.createCustomerCheckout);
router.post('/customer/cod', paymentController.placeCustomerCodOrder);
router.post('/customer/confirm', paymentController.confirmCustomerCheckout);
router.get('/customer/discount-offer-status', paymentController.getCustomerDiscountOfferStatus);
router.get('/receiver/delivery-discount-status', paymentController.getReceiverDeliveryDiscountStatus);
router.get('/customer/history', paymentController.getCustomerPaymentHistory);

module.exports = router;
