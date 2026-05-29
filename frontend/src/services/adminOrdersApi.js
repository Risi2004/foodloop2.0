import { buildUrl, parseResponse } from './api';
import { getAuthHeaders } from '../utils/auth';

export async function getAdminOrders(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') qs.set(key, String(value));
  });
  const query = qs.toString();
  const response = await fetch(buildUrl(`/api/admin/orders${query ? `?${query}` : ''}`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
}

export async function getAdminOrderDetail(orderType, id) {
  const response = await fetch(buildUrl(`/api/admin/orders/${orderType}/${id}`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
}

export async function getUserMonitoring(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') qs.set(key, String(value));
  });
  const query = qs.toString();
  const response = await fetch(buildUrl(`/api/admin/user-monitoring${query ? `?${query}` : ''}`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
}

export async function getAdminUserOrders(userId, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') qs.set(key, String(value));
  });
  const query = qs.toString();
  const response = await fetch(
    buildUrl(`/api/admin/users/${userId}/orders${query ? `?${query}` : ''}`),
    { headers: getAuthHeaders() }
  );
  return parseResponse(response);
}

export function orderTypeLabel(orderType) {
  const map = {
    donation: 'Donation',
    claim_payment: 'Claim payment',
    customer_order: 'Customer order',
  };
  return map[orderType] || orderType;
}

export function formatOrderAmount(amount, currency = 'LKR') {
  if (amount == null) return '—';
  return `${currency} ${Number(amount).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatOrderDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

export function partiesSummary(parties = {}) {
  const labels = [];
  if (parties.donor?.name) labels.push(`Donor: ${parties.donor.name}`);
  if (parties.receiver?.name) labels.push(`Receiver: ${parties.receiver.name}`);
  if (parties.customer?.name) labels.push(`Customer: ${parties.customer.name}`);
  if (parties.driver?.name) labels.push(`Driver: ${parties.driver.name}`);
  return labels.join(' · ') || '—';
}
