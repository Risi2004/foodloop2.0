/** Dispatched when user views notifications page and marks all as read (for navbar badge refresh). */
export const NOTIFICATIONS_READ_EVENT = 'foodloop-notifications-read';

export const getAdminNotifications = async () => ({
  success: true,
  notifications: [],
});

export const createNotification = async () => ({
  success: true,
  notification: null,
});

export const getMyNotifications = async () => ({
  success: true,
  notifications: [],
  unreadCount: 0,
});

export const getUnreadCount = async () => ({
  success: true,
  unreadCount: 0,
});

export const markAsRead = async () => ({
  success: true,
});
