import { buildUrl, parseResponse } from './api';
import { getAuthHeaders } from '../utils/auth';

export const createClaimCheckout = async (donationId) => {
  const response = await fetch(buildUrl('/api/payments/claim/checkout'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ donationId }),
  });
  return parseResponse(response);
};

export const confirmClaimPayment = async ({ orderId, cardNumber, expiry, cvv, cardLast4 }) => {
  const response = await fetch(buildUrl('/api/payments/claim/confirm'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ orderId, cardNumber, expiry, cvv, cardLast4 }),
  });
  return parseResponse(response);
};
