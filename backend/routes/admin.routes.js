const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.use(requireAdmin);

router.get('/pending-users', adminController.getPendingUsers);
router.get('/stats', adminController.getStats);
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);

module.exports = router;
