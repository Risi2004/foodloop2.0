import { buildUrl, parseResponse } from './api';
import { getAuthHeaders } from '../utils/auth';

const ERROR_MESSAGES = {
  AI_QUOTA_EXCEEDED:
    'You have used your free AI forecasts for today. Subscribe for unlimited access this month.',
  GEMINI_NOT_CONFIGURED: 'FoodLoop AI is not configured on the server yet.',
  GEMINI_UNAVAILABLE: 'FoodLoop AI is temporarily unavailable. Please try again later.',
  WEATHER_UNAVAILABLE: 'Weather data is unavailable right now.',
  default: 'Could not load AI insights. Please try again.',
};

function mapError(data, fallback) {
  const code = data?.code;
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return data?.message || fallback || ERROR_MESSAGES.default;
}

export async function getSupplierAiStatus() {
  const response = await fetch(buildUrl('/api/supplier/ai-insights/status'), {
    headers: getAuthHeaders(),
  });
  const data = await parseResponse(response);
  return data.status;
}

export async function getTomorrowInsights({ lat, lng, foodCategory, itemName } = {}) {
  const response = await fetch(buildUrl('/api/supplier/ai-insights/tomorrow'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ lat, lng, foodCategory, itemName }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(mapError(data, data?.message));
  }
  return data;
}

export async function startSubscriptionCheckout() {
  const response = await fetch(
    buildUrl('/api/supplier/ai-insights/subscription/checkout'),
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(mapError(data, data?.message));
  }
  return data;
}

export async function confirmSubscriptionPayment({
  orderId,
  cardNumber,
  expiry,
  cvv,
  cardLast4,
  autoRenew,
}) {
  const response = await fetch(
    buildUrl('/api/supplier/ai-insights/subscription/confirm'),
    {
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
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || 'Payment failed. Please try again.');
  }
  return data;
}

export async function cancelSubscriptionAutoRenew() {
  const response = await fetch(
    buildUrl('/api/supplier/ai-insights/subscription/cancel-auto-renew'),
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || 'Could not cancel automatic renewal.');
  }
  return data;
}
