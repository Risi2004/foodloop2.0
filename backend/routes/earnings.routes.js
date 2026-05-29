const express = require('express');
const earningsController = require('../controllers/earnings.controller');
const { verifyJwt } = require('../middleware/auth');
const { blockNewOrdersDuringMaintenance } = require('../middleware/maintenanceGate');

const router = express.Router();
const maintenanceBlock = blockNewOrdersDuringMaintenance;

router.use(verifyJwt);

router.get('/summary', earningsController.getSummary);
router.get('/transactions', earningsController.getTransactions);
router.get('/payout-requests', earningsController.getPayoutRequests);
router.post('/payout-requests', maintenanceBlock, earningsController.createPayoutRequest);
router.patch('/payout-profile', earningsController.updatePayoutProfile);

module.exports = router;
