import { getToken, getAuthHeaders } from '../utils/auth';
import { buildUrl, parseResponse } from './api';

export const uploadDonationImage = async (file) => {
  const imageUrl = file instanceof File ? URL.createObjectURL(file) : '';
  return { success: true, imageUrl };
};

export const analyzeFoodImage = async () => ({
  success: true,
  predictions: null,
});

export const uploadAndAnalyzeImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const token = getToken();
  const response = await fetch(buildUrl('/api/donations/analyze-image'), {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return parseResponse(response);
};

export const getAvailableDonations = async (lat, lng) => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    throw new Error('Receiver location is required to load donations.');
  }
  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
  });
  const response = await fetch(buildUrl(`/api/donations/available?${params}`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

const DEFAULT_MARKETPLACE_LOCATION = {
  lat: 6.9271,
  lng: 79.8612,
};

export const getCustomerMarketplaceListings = async (options = {}) => {
  const rawLat = options?.lat;
  const rawLng = options?.lng;

  const latitude = Number(rawLat);
  const longitude = Number(rawLng);

  const lat = Number.isNaN(latitude) ? DEFAULT_MARKETPLACE_LOCATION.lat : latitude;
  const lng = Number.isNaN(longitude) ? DEFAULT_MARKETPLACE_LOCATION.lng : longitude;

  return getAvailableDonations(lat, lng);
};

export const claimDonation = async (donationId, payload = {}) => {
  const response = await fetch(buildUrl(`/api/donations/${donationId}/claim`), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
};

export const cancelClaim = async (donationId) => {
  const response = await fetch(buildUrl(`/api/donations/${donationId}/cancel-claim`), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const getMyDonations = async () => {
  const response = await fetch(buildUrl('/api/donations/mine'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const getDonation = async (donationId) => {
  const response = await fetch(buildUrl(`/api/donations/${donationId}`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const updateDonation = async (donationId, payload) => {
  const response = await fetch(buildUrl(`/api/donations/${donationId}`), {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
};

export const deleteDonation = async (donationId) => {
  const response = await fetch(buildUrl(`/api/donations/${donationId}`), {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const getDiscountSuggestion = async (donationId) => {
  const response = await fetch(buildUrl(`/api/donations/${donationId}/discount-suggestion`), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const applyDiscountSuggestion = async (donationId, payload) => {
  const response = await fetch(buildUrl(`/api/donations/${donationId}/apply-discount`), {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
};

export const getMyClaims = async () => {
  const response = await fetch(buildUrl('/api/donations/my-claims'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const getAvailablePickups = async (lat, lng) => {
  const params = new URLSearchParams();
  if (lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))) {
    params.set('lat', String(lat));
    params.set('lng', String(lng));
  }
  const qs = params.toString();
  const response = await fetch(
    buildUrl(`/api/driver/pickups/available${qs ? `?${qs}` : ''}`),
    { headers: getAuthHeaders() }
  );
  return parseResponse(response);
};

export const acceptOrder = async (donationId) => {
  const response = await fetch(buildUrl(`/api/driver/pickups/${donationId}/accept`), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const confirmPickup = async (donationId) => {
  const response = await fetch(buildUrl(`/api/driver/donations/${donationId}/confirm-pickup`), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const getActiveDeliveries = async (lat, lng) => {
  const params = new URLSearchParams();
  if (lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))) {
    params.set('lat', String(lat));
    params.set('lng', String(lng));
  }
  const qs = params.toString();
  const response = await fetch(
    buildUrl(`/api/driver/deliveries/active${qs ? `?${qs}` : ''}`),
    { headers: getAuthHeaders() }
  );
  return parseResponse(response);
};

export const getDonorStatistics = async () => ({
  success: true,
  statistics: {
    badgeProgress: null,
  },
});

export const getDriverStatistics = async () => {
  const { getEarningsSummary } = await import('./earningsApi');
  const res = await getEarningsSummary();
  const summary = res.summary || {};
  const deliveryCount = summary.transactionCount || 0;
  return {
    success: true,
    statistics: {
      totalDeliveriesCompleted: deliveryCount,
      deliveriesTrend: summary.earningsTrend || 0,
      totalDistanceTravelledFormatted: '—',
      distanceTrend: 0,
      totalEarnings: summary.totalEarned || 0,
      earningsTrend: summary.earningsTrend || 0,
      thisMonthEarned: summary.thisMonthEarned || 0,
      availableBalance: summary.availableBalance || 0,
      impactProgress: {
        badgeLevel: 'Hero',
        currentCount: deliveryCount,
        nextBadgeTarget: Math.max(deliveryCount + 10, 10),
        progressPercentage: Math.min(100, (deliveryCount % 10) * 10),
        remainingForNextBadge: Math.max(0, 10 - (deliveryCount % 10)),
      },
    },
  };
};

export const getDriverCompletedDeliveries = async () => {
  const { getEarningsTransactions } = await import('./earningsApi');
  const res = await getEarningsTransactions({ limit: 10, page: 1 });
  const deliveries = (res.transactions || []).map((tx) => ({
    id: tx.id,
    itemName: tx.referenceLabel || 'Delivery',
    quantity: 1,
    donorName: tx.sourceType === 'customer_order_delivery' ? 'FoodLoop Customer' : 'Supplier',
    receiverName: tx.sourceType === 'customer_order_delivery' ? 'Customer' : 'Receiver',
    deliveredAt: tx.creditedAt,
    earnings: tx.deliveryFeeAmount ?? tx.amount,
    deliveryFeeAmount: tx.deliveryFeeAmount ?? tx.amount,
    paymentMethod: tx.paymentMethod,
    codAmount: tx.codAmountCollected,
    status: 'delivered',
  }));
  return { success: true, deliveries };
};

export const getDonationTracking = async (donationId) => {
  const response = await fetch(buildUrl(`/api/driver/donations/${donationId}/tracking`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const confirmDelivery = async (donationId) => {
  const response = await fetch(buildUrl(`/api/driver/donations/${donationId}/confirm-delivery`), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const submitDonation = async (donationData) => {
  const response = await fetch(buildUrl('/api/donations'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(donationData),
  });
  return parseResponse(response);
};

async function fetchReceiptPdf(donationId) {
  const response = await fetch(buildUrl(`/api/donations/${donationId}/receipt/pdf`), {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to download PDF');
  }
  return response.blob();
}

export const getDonationReceiptDetails = async (donationId) => {
  const response = await fetch(buildUrl(`/api/donations/${donationId}/receipt/details`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const createImpactReceipt = async () => ({
  success: false,
  message: 'Receipts are generated automatically after delivery.',
});

export const getReceiptPDF = async (donationId) => fetchReceiptPdf(donationId);

export const getDonorReceiptView = async (donationId) => {
  const response = await fetch(buildUrl(`/api/donations/${donationId}/receipt/view`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const getDonorReceiptPDF = async (donationId) => fetchReceiptPdf(donationId);
