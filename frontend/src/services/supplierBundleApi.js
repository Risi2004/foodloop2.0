import { buildUrl, parseResponse } from './api';
import { getAuthHeaders } from '../utils/auth';

export async function getBundleStatus() {
  const response = await fetch(buildUrl('/api/supplier/bundle/status'), {
    headers: getAuthHeaders(),
  });
  const data = await parseResponse(response);
  return data.status;
}

export async function startBundleSubscriptionCheckout() {
  const response = await fetch(buildUrl('/api/supplier/bundle/subscription/checkout'), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Could not start checkout.');
  }
  return data;
}

export async function confirmBundleSubscriptionPayment({
  orderId,
  cardNumber,
  expiry,
  cvv,
  cardLast4,
  autoRenew,
}) {
  const response = await fetch(buildUrl('/api/supplier/bundle/subscription/confirm'), {
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

export async function cancelBundleAutoRenew() {
  const response = await fetch(buildUrl('/api/supplier/bundle/subscription/cancel-auto-renew'), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Could not cancel auto-renew.');
  }
  return data;
}
