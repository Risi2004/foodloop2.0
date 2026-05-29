const express = require('express');
const adminController = require('../controllers/admin.controller');
const earningsController = require('../controllers/earnings.controller');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.use(requireAdmin);

router.get('/pending-users', adminController.getPendingUsers);
router.get('/stats', adminController.getStats);
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);

router.get('/orders', adminController.getAllOrders);
router.get('/orders/:orderType/:id', adminController.getOrderDetail);
router.get('/user-monitoring', adminController.getUserMonitoring);
router.get('/users/:id/orders', adminController.getUserOrders);

router.get('/payout-requests', earningsController.listAdminPayoutRequests);
router.get('/payout-requests/:id', earningsController.getAdminPayoutRequestDetail);
router.patch('/payout-requests/:id/approve', earningsController.approvePayoutRequest);
router.patch('/payout-requests/:id/reject', earningsController.rejectPayoutRequest);
router.patch('/payout-requests/:id/mark-paid', earningsController.markPayoutPaid);

module.exports = router;
