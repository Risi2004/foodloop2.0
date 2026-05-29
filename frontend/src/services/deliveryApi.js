import { buildUrl, parseResponse } from './api';
import { getAuthHeaders } from '../utils/auth';

export async function getDeliveryQuote(donationId, lat, lng, quantity = 1) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    quantity: String(quantity),
  });
  const response = await fetch(
    buildUrl(`/api/donations/${donationId}/delivery-quote?${params}`),
    { headers: getAuthHeaders() }
  );
  return parseResponse(response);
}

export async function getReceiverDeliveryDiscountStatus() {
  const response = await fetch(buildUrl('/api/payments/receiver/delivery-discount-status'), {
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
