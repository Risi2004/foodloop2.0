const mongoose = require('mongoose');
const User = require('../models/User');
const Notification = require('../models/Notification');
const UserNotification = require('../models/UserNotification');
const { SUPPLIER_ROLES } = require('../utils/earningsHelpers');
const { sendAdminBroadcastNotificationEmails } = require('../utils/sendNotificationEmail');
const { emitToUser } = require('../socket');

const VALID_TARGET_ROLES = ['Donor', 'Receiver', 'Driver', 'All'];

function normalizeTargetRoles(roles) {
  if (!Array.isArray(roles)) return [];
  const unique = [...new Set(roles.map((r) => String(r).trim()).filter(Boolean))];
  return unique.filter((r) => VALID_TARGET_ROLES.includes(r));
}

function buildRoleQuery(roles) {
  if (roles.includes('All')) {
    return { accountStatus: 'active', role: { $ne: 'Admin' } };
  }

  const roleList = new Set();
  if (roles.includes('Donor')) {
    SUPPLIER_ROLES.forEach((r) => roleList.add(r));
    roleList.add('Donor');
  }
  if (roles.includes('Receiver')) {
    roleList.add('receiver');
    roleList.add('customer');
  }
  if (roles.includes('Driver')) {
    roleList.add('driver');
  }

  return {
    accountStatus: 'active',
    role: { $in: [...roleList] },
  };
}

async function resolveTargetUsers(roles) {
  const normalized = normalizeTargetRoles(roles);
  if (!normalized.length) return [];

  return User.find(buildRoleQuery(normalized))
    .select('_id email username receiverName driverName businessName role isEmailVerified accountStatus')
    .lean();
}

function mapUserInboxItem(userNotification, notification) {
  return {
    id: notification._id.toString(),
    title: notification.title || 'Update',
    message: notification.message,
    createdAt: notification.createdAt,
    readAt: userNotification.readAt || null,
  };
}

async function createBroadcast({ title, message, roles, adminId }) {
  const normalizedRoles = normalizeTargetRoles(roles);
  const trimmedMessage = String(message || '').trim();
  const trimmedTitle = String(title || '').trim() || 'Update';

  if (!trimmedMessage) {
    const err = new Error('Message is required.');
    err.statusCode = 400;
    throw err;
  }
  if (!normalizedRoles.length) {
    const err = new Error('At least one target role is required.');
    err.statusCode = 400;
    throw err;
  }
  if (trimmedMessage.length > 5000) {
    const err = new Error('Message exceeds the maximum length.');
    err.statusCode = 400;
    throw err;
  }

  const users = await resolveTargetUsers(normalizedRoles);

  const notification = await Notification.create({
    title: trimmedTitle,
    message: trimmedMessage,
    targetRoles: normalizedRoles,
    status: 'active',
    createdBy: adminId || null,
    recipientCount: users.length,
  });

  if (users.length > 0) {
    const inboxRows = users.map((user) => ({
      userId: user._id,
      notificationId: notification._id,
      readAt: null,
    }));

    await UserNotification.insertMany(inboxRows, { ordered: false }).catch((err) => {
      if (err.code !== 11000) throw err;
    });
  }

  const payload = {
    id: notification._id.toString(),
    title: notification.title,
    message: notification.message,
    createdAt: notification.createdAt,
  };

  users.forEach((user) => {
    emitToUser(user._id.toString(), 'notification:new', payload);
  });

  sendAdminBroadcastNotificationEmails({
    title: notification.title,
    message: notification.message,
    users,
  }).catch((err) => {
    console.error('[email] Admin broadcast notification batch error:', err.message);
  });

  return notification.toAdminJSON();
}

async function listAdminNotifications() {
  const docs = await Notification.find().sort({ createdAt: -1 }).limit(200);
  return docs.map((doc) => doc.toAdminJSON());
}

async function deactivateNotification(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid notification id.');
    err.statusCode = 400;
    throw err;
  }

  const doc = await Notification.findByIdAndUpdate(
    id,
    { status: 'inactive' },
    { new: true }
  );
  if (!doc) {
    const err = new Error('Notification not found.');
    err.statusCode = 404;
    throw err;
  }
  return doc.toAdminJSON();
}

async function deleteNotification(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid notification id.');
    err.statusCode = 400;
    throw err;
  }

  const doc = await Notification.findByIdAndDelete(id);
  if (!doc) {
    const err = new Error('Notification not found.');
    err.statusCode = 404;
    throw err;
  }

  await UserNotification.deleteMany({ notificationId: id });
  return { success: true };
}

async function listUserNotifications(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const rows = await UserNotification.find({ userId: userObjectId })
    .sort({ createdAt: -1 })
    .populate({
      path: 'notificationId',
      match: { status: 'active' },
    })
    .limit(200)
    .lean();

  return rows
    .filter((row) => row.notificationId)
    .map((row) => mapUserInboxItem(row, row.notificationId));
}

async function getUnreadCount(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const unreadRows = await UserNotification.find({
    userId: userObjectId,
    readAt: null,
  })
    .select('notificationId')
    .lean();

  if (!unreadRows.length) return 0;

  const notificationIds = unreadRows.map((row) => row.notificationId);
  const activeCount = await Notification.countDocuments({
    _id: { $in: notificationIds },
    status: 'active',
  });

  return activeCount;
}

async function markNotificationsRead(userId, { all = false, ids = [] } = {}) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();

  if (all) {
    const unreadRows = await UserNotification.find({
      userId: userObjectId,
      readAt: null,
    })
      .select('notificationId')
      .lean();

    if (!unreadRows.length) return { updated: 0 };

    const notificationIds = unreadRows.map((row) => row.notificationId);
    const activeIds = await Notification.find({
      _id: { $in: notificationIds },
      status: 'active',
    })
      .select('_id')
      .lean();

    const activeIdSet = activeIds.map((n) => n._id.toString());
    if (!activeIdSet.length) return { updated: 0 };

    const result = await UserNotification.updateMany(
      {
        userId: userObjectId,
        notificationId: { $in: activeIdSet },
        readAt: null,
      },
      { $set: { readAt: now } }
    );

    return { updated: result.modifiedCount || 0 };
  }

  const validIds = (Array.isArray(ids) ? ids : [])
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (!validIds.length) return { updated: 0 };

  const activeIds = await Notification.find({
    _id: { $in: validIds },
    status: 'active',
  })
    .select('_id')
    .lean();

  const activeIdList = activeIds.map((n) => n._id);
  if (!activeIdList.length) return { updated: 0 };

  const result = await UserNotification.updateMany(
    {
      userId: userObjectId,
      notificationId: { $in: activeIdList },
      readAt: null,
    },
    { $set: { readAt: now } }
  );

  return { updated: result.modifiedCount || 0 };
}

module.exports = {
  createBroadcast,
  listAdminNotifications,
  deactivateNotification,
  deleteNotification,
  listUserNotifications,
  getUnreadCount,
  markNotificationsRead,
  normalizeTargetRoles,
};
