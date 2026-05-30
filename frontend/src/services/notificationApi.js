import { buildUrl, parseResponse } from './api';
import { getAuthHeaders } from '../utils/auth';

/** Dispatched when user views notifications page and marks all as read (for navbar badge refresh). */
export const NOTIFICATIONS_READ_EVENT = 'foodloop-notifications-read';

export const getAdminNotifications = async () => {
  const response = await fetch(buildUrl('/api/admin/notifications'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const createNotification = async ({ title, message, roles }) => {
  const response = await fetch(buildUrl('/api/admin/notifications'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title, message, roles }),
  });
  return parseResponse(response);
};

export const deactivateNotification = async (id) => {
  const response = await fetch(buildUrl(`/api/admin/notifications/${id}`), {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status: 'inactive' }),
  });
  return parseResponse(response);
};

export const deleteNotification = async (id) => {
  const response = await fetch(buildUrl(`/api/admin/notifications/${id}`), {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const getMyNotifications = async () => {
  const response = await fetch(buildUrl('/api/notifications'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const getUnreadCount = async () => {
  const response = await fetch(buildUrl('/api/notifications/unread-count'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const markAsRead = async ({ all = false, ids = [] } = {}) => {
  const response = await fetch(buildUrl('/api/notifications/read'), {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(all ? { all: true } : { ids }),
  });
  return parseResponse(response);
};
