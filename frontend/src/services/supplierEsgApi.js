import { buildUrl, parseResponse } from './api';
import { getAuthHeaders } from '../utils/auth';

export async function getEsgStatus() {
  const response = await fetch(buildUrl('/api/supplier/esg/status'), {
    headers: getAuthHeaders(),
  });
  const data = await parseResponse(response);
  return data.status;
}

export async function getEsgReport(period = 'this_month') {
  const response = await fetch(
    buildUrl(`/api/supplier/esg/report?period=${encodeURIComponent(period)}`),
    { headers: getAuthHeaders() }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.message || 'Failed to load ESG report.');
    err.code = data.code;
    throw err;
  }
  return data;
}

export async function startEsgSubscriptionCheckout() {
  const response = await fetch(buildUrl('/api/supplier/esg/subscription/checkout'), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Could not start checkout.');
  }
  return data;
}

export async function confirmEsgSubscriptionPayment({
  orderId,
  cardNumber,
  expiry,
  cvv,
  cardLast4,
  autoRenew,
}) {
  const response = await fetch(buildUrl('/api/supplier/esg/subscription/confirm'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      orderId,
      cardNumber,
      expiry,
      cvv,
      cardLast4,
      autoRenew: !!autoRenew,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Payment failed.');
  }
  return data;
}

export async function cancelEsgAutoRenew() {
  const response = await fetch(buildUrl('/api/supplier/esg/subscription/cancel-auto-renew'), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Could not cancel auto-renew.');
  }
  return data;
}
