const express = require('express');
const driverController = require('../controllers/driver.controller');
const { verifyJwt } = require('../middleware/auth');

const router = express.Router();

router.patch('/location', verifyJwt, driverController.updateLocation);
router.post('/demo/start', verifyJwt, driverController.startDemo);
router.post('/demo/stop', verifyJwt, driverController.stopDemo);
router.get('/pickups/available', verifyJwt, driverController.getAvailablePickups);
router.get('/deliveries/active', verifyJwt, driverController.getActiveDeliveries);
router.get('/donations/:donationId/tracking', verifyJwt, driverController.getDonationTracking);
router.post('/donations/:donationId/confirm-pickup', verifyJwt, driverController.confirmPickup);
router.post('/donations/:donationId/confirm-delivery', verifyJwt, driverController.confirmDelivery);
router.post('/pickups/:donationId/accept', verifyJwt, driverController.acceptPickup);

module.exports = router;
