const express = require('express');
const paymentController = require('../controllers/payment.controller');
const { verifyJwt } = require('../middleware/auth');
const { blockNewOrdersDuringMaintenance } = require('../middleware/maintenanceGate');

const router = express.Router();
const maintenanceBlock = blockNewOrdersDuringMaintenance;

router.use(verifyJwt);

router.post('/claim/checkout', maintenanceBlock, paymentController.createClaimCheckout);
router.post('/claim/confirm', maintenanceBlock, paymentController.confirmClaimPayment);
router.post('/claim/retry', maintenanceBlock, paymentController.retryClaimPayment);
router.post('/customer/checkout', maintenanceBlock, paymentController.createCustomerCheckout);
router.post('/customer/cod', maintenanceBlock, paymentController.placeCustomerCodOrder);
router.post('/customer/confirm', maintenanceBlock, paymentController.confirmCustomerCheckout);
router.get('/customer/discount-offer-status', paymentController.getCustomerDiscountOfferStatus);
router.get('/receiver/delivery-discount-status', paymentController.getReceiverDeliveryDiscountStatus);
router.get('/customer/history', paymentController.getCustomerPaymentHistory);

module.exports = router;
