const notificationService = require('../services/notificationService');

function handleServiceError(res, err, fallbackMessage) {
  const status = err.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: err.message || fallbackMessage,
  });
}

async function listAdminNotifications(req, res) {
  try {
    const notifications = await notificationService.listAdminNotifications();
    return res.json({ success: true, notifications });
  } catch (err) {
    console.error('[notification] listAdminNotifications error:', err);
    return handleServiceError(res, err, 'Failed to load notifications.');
  }
}

async function createAdminNotification(req, res) {
  try {
    const notification = await notificationService.createBroadcast({
      title: req.body?.title,
      message: req.body?.message,
      roles: req.body?.roles,
      adminId: req.user?._id,
    });
    return res.status(201).json({ success: true, notification });
  } catch (err) {
    console.error('[notification] createAdminNotification error:', err);
    return handleServiceError(res, err, 'Failed to send notification.');
  }
}

async function updateAdminNotification(req, res) {
  try {
    const status = String(req.body?.status || '').toLowerCase();
    if (status !== 'inactive') {
      return res.status(400).json({ success: false, message: 'Only deactivation is supported.' });
    }
    const notification = await notificationService.deactivateNotification(req.params.id);
    return res.json({ success: true, notification });
  } catch (err) {
    console.error('[notification] updateAdminNotification error:', err);
    return handleServiceError(res, err, 'Failed to update notification.');
  }
}

async function deleteAdminNotification(req, res) {
  try {
    await notificationService.deleteNotification(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    console.error('[notification] deleteAdminNotification error:', err);
    return handleServiceError(res, err, 'Failed to delete notification.');
  }
}

async function listMyNotifications(req, res) {
  try {
    const userId = req.user._id.toString();
    const [notifications, unreadCount] = await Promise.all([
      notificationService.listUserNotifications(userId),
      notificationService.getUnreadCount(userId),
    ]);
    return res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    console.error('[notification] listMyNotifications error:', err);
    return handleServiceError(res, err, 'Failed to load notifications.');
  }
}

async function getMyUnreadCount(req, res) {
  try {
    const unreadCount = await notificationService.getUnreadCount(req.user._id.toString());
    return res.json({ success: true, unreadCount });
  } catch (err) {
    console.error('[notification] getMyUnreadCount error:', err);
    return handleServiceError(res, err, 'Failed to load unread count.');
  }
}

async function markMyNotificationsRead(req, res) {
  try {
    const all = Boolean(req.body?.all);
    const ids = req.body?.ids;
    await notificationService.markNotificationsRead(req.user._id.toString(), { all, ids });
    const unreadCount = await notificationService.getUnreadCount(req.user._id.toString());
    return res.json({ success: true, unreadCount });
  } catch (err) {
    console.error('[notification] markMyNotificationsRead error:', err);
    return handleServiceError(res, err, 'Failed to mark notifications as read.');
  }
}

module.exports = {
  listAdminNotifications,
  createAdminNotification,
  updateAdminNotification,
  deleteAdminNotification,
  listMyNotifications,
  getMyUnreadCount,
  markMyNotificationsRead,
};
