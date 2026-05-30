const express = require('express');
const adminController = require('../controllers/admin.controller');
const earningsController = require('../controllers/earnings.controller');
const adminFinanceController = require('../controllers/adminFinance.controller');
const maintenanceController = require('../controllers/maintenance.controller');
const contactController = require('../controllers/contact.controller');
const notificationController = require('../controllers/notification.controller');
const reviewController = require('../controllers/review.controller');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.use(requireAdmin);

router.get('/pending-users', adminController.getPendingUsers);
router.get('/stats', adminController.getStats);
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.post('/users/:id/ai-verify', adminController.aiVerifyUser);
router.delete('/users/:id', adminController.deleteUser);

router.get('/orders', adminController.getAllOrders);
router.get('/orders/:orderType/:id', adminController.getOrderDetail);
router.get('/user-monitoring', adminController.getUserMonitoring);
router.get('/users/:id/orders', adminController.getUserOrders);

router.get('/payout-requests', earningsController.listAdminPayoutRequests);
router.get('/payout-requests/:id', earningsController.getAdminPayoutRequestDetail);
router.patch('/payout-requests/:id/approve', earningsController.approvePayoutRequest);
router.patch('/payout-requests/:id/reject', earningsController.rejectPayoutRequest);
router.patch('/payout-requests/:id/mark-paid', earningsController.markPayoutPaid);

router.get('/finance/summary', adminFinanceController.getFinanceSummary);
router.get('/finance/ledger', adminFinanceController.getFinanceLedger);

router.get('/maintenance', maintenanceController.getAdminMaintenance);
router.put('/maintenance/scheduled', maintenanceController.setScheduled);
router.post('/maintenance/sudden/start', maintenanceController.startSudden);
router.post('/maintenance/sudden/activate', maintenanceController.forceSuddenActive);
router.post('/maintenance/end', maintenanceController.endMaintenance);
router.post('/maintenance/cancel', maintenanceController.cancelMaintenance);

router.get('/contact-messages', contactController.listContactMessages);
router.post('/contact-messages/:id/reply', contactController.replyToContactMessage);

router.get('/notifications', notificationController.listAdminNotifications);
router.post('/notifications', notificationController.createAdminNotification);
router.patch('/notifications/:id', notificationController.updateAdminNotification);
router.delete('/notifications/:id', notificationController.deleteAdminNotification);

const auditController = require('../controllers/audit.controller');

router.get('/reviews/pending', reviewController.listPendingReviews);
router.get('/reviews/approved', reviewController.listApprovedReviewsForAdmin);
router.patch('/reviews/:id/approve', reviewController.approveReview);
router.patch('/reviews/:id/reject', reviewController.rejectReview);
router.delete('/reviews/:id', reviewController.deleteReview);

// Audit Logs Management
router.get('/audit-logs', auditController.getAuditLogs);
router.get('/audit-logs/settings', auditController.getAuditSettings);
router.post('/audit-logs/toggle', auditController.toggleAudit);

module.exports = router;
