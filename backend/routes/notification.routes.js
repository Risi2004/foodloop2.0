const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { verifyJwt } = require('../middleware/auth');

const router = express.Router();

router.use(verifyJwt);

router.get('/', notificationController.listMyNotifications);
router.get('/unread-count', notificationController.getMyUnreadCount);
router.patch('/read', notificationController.markMyNotificationsRead);

module.exports = router;
