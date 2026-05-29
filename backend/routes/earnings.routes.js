const express = require('express');
const earningsController = require('../controllers/earnings.controller');
const { verifyJwt } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.use(verifyJwt);

router.get('/summary', earningsController.getSummary);
router.get('/transactions', earningsController.getTransactions);
router.get('/payout-requests', earningsController.getPayoutRequests);
router.post('/payout-requests', earningsController.createPayoutRequest);
router.patch('/payout-profile', earningsController.updatePayoutProfile);

module.exports = router;
