import { buildUrl, parseResponse } from './api';
import { getAuthHeaders } from '../utils/auth';

export async function getEarningsSummary() {
  const response = await fetch(buildUrl('/api/earnings/summary'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
}

export async function getEarningsTransactions({ limit = 20, page = 1 } = {}) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('page', String(page));
  const response = await fetch(buildUrl(`/api/earnings/transactions?${params}`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
}

export async function getPayoutRequests() {
  const response = await fetch(buildUrl('/api/earnings/payout-requests'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
}

export async function createPayoutRequest(payload) {
  const response = await fetch(buildUrl('/api/earnings/payout-requests'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function updatePayoutProfile(payload) {
  const response = await fetch(buildUrl('/api/earnings/payout-profile'), {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function getAdminPayoutRequests(status) {
  const params = status ? new URLSearchParams({ status }) : '';
  const qs = params ? `?${params}` : '';
  const response = await fetch(buildUrl(`/api/admin/payout-requests${qs}`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
}

export async function getAdminPayoutRequestDetail(id) {
  const response = await fetch(buildUrl(`/api/admin/payout-requests/${id}`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
}

export async function approveAdminPayoutRequest(id, adminNote) {
  const response = await fetch(buildUrl(`/api/admin/payout-requests/${id}/approve`), {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ adminNote }),
  });
  return parseResponse(response);
}

export async function rejectAdminPayoutRequest(id, adminNote) {
  const response = await fetch(buildUrl(`/api/admin/payout-requests/${id}/reject`), {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ adminNote }),
  });
  return parseResponse(response);
}

export async function markAdminPayoutPaid(id) {
  const response = await fetch(buildUrl(`/api/admin/payout-requests/${id}/mark-paid`), {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
}

export function formatLkr(amount) {
  return `LKR ${Number(amount || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function sourceTypeLabel(sourceType) {
  if (sourceType === 'customer_order_delivery') return 'Customer order';
  if (sourceType === 'donation_delivery') return 'Donation delivery';
  return sourceType || '—';
}

export function statusLabel(status) {
  const map = {
    available: 'Available',
    locked: 'Pending payout',
    paid_out: 'Paid out',
    pending: 'Pending review',
    approved: 'Approved',
    rejected: 'Rejected',
    paid: 'Paid',
  };
  return map[status] || status;
}

export function paymentMethodLabel(method, sourceType) {
  if (method === 'cod') return 'COD';
  if (method === 'card') return 'Card';
  if (sourceType === 'donation_delivery') return 'Platform';
  return '—';
}

export function driverPaymentTypeLabel(tx) {
  if (tx?.paymentMethod === 'cod') return 'COD';
  if (tx?.paymentMethod === 'card') return 'Card';
  if (tx?.sourceType === 'donation_delivery') return 'Platform';
  return '—';
}

export function getDriverBankPayout(tx) {
  return tx?.deliveryFeeAmount ?? tx?.amount ?? 0;
}

export function getDriverCashCollected(tx) {
  return tx?.codAmountCollected ?? null;
}
