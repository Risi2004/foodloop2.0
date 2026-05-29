import { buildUrl, parseResponse } from './api';
import { getAuthHeaders } from '../utils/auth';

export const createClaimCheckout = async (donationId, receiverLatitude, receiverLongitude, claimQuantity = 1) => {
  const response = await fetch(buildUrl('/api/payments/claim/checkout'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ donationId, receiverLatitude, receiverLongitude, claimQuantity }),
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

export const createCustomerCheckout = async (payload) => {
  const response = await fetch(buildUrl('/api/payments/customer/checkout'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
};

export const placeCustomerCodOrder = async (payload) => {
  const response = await fetch(buildUrl('/api/payments/customer/cod'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
};

export const confirmCustomerPayment = async ({ orderId, cardNumber, expiry, cvv, cardLast4 }) => {
  const response = await fetch(buildUrl('/api/payments/customer/confirm'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ orderId, cardNumber, expiry, cvv, cardLast4 }),
  });
  return parseResponse(response);
};

export const getReceiverDeliveryDiscountStatus = async () => {
  const response = await fetch(buildUrl('/api/payments/receiver/delivery-discount-status'), {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const getCustomerPaymentHistory = async () => {
  const response = await fetch(buildUrl('/api/payments/customer/history'), {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const getCustomerDiscountOfferStatus = async () => {
  const response = await fetch(buildUrl('/api/payments/customer/discount-offer-status'), {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const getCustomerOrders = async () => {
  const response = await fetch(buildUrl('/api/customer-orders/mine'), {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const getCustomerOrderTracking = async (orderId) => {
  const response = await fetch(buildUrl(`/api/customer-orders/${orderId}/tracking`), {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};
