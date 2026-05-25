import { getToken, getAuthHeaders } from '../utils/auth';
import { buildUrl, parseResponse } from './api';

const emptyPdfBlob = () =>
  new Blob(['%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n'], { type: 'application/pdf' });

const demoDonation = (id = 'offline') => ({
  _id: id,
  id,
  itemName: 'Demo item',
  foodCategory: 'Other',
  quantity: 1,
  storageRecommendation: 'Room temperature',
  imageUrl: '',
  preferredPickupDate: '',
  preferredPickupTimeFrom: '',
  preferredPickupTimeTo: '',
  status: 'draft',
  donorLatitude: 6.9271,
  donorLongitude: 79.8612,
});

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

export const getAvailableDonations = async () => ({
  success: true,
  donations: [],
});

export const claimDonation = async () => ({
  success: true,
  donation: demoDonation(),
});

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

export const getMyClaims = async () => ({
  success: true,
  donations: [],
});

export const getAvailablePickups = async () => ({
  success: true,
  pickups: [
    {
      id: 'p1',
      donorName: 'Harvest Bakery',
      itemName: 'Leftover Bread Loaves',
      quantity: 12,
      expiryText: 'Expires in 4 hours',
      earnings: 350, // LKR
      donorLatitude: 6.9271,
      donorLongitude: 79.8612,
    },
    {
      id: 'p2',
      donorName: 'Fresh Fruits Co',
      itemName: 'Organic Strawberries',
      quantity: 5,
      expiryText: 'Expires in 1 day',
      earnings: 350, // LKR
      donorLatitude: 6.9371,
      donorLongitude: 79.8812,
    }
  ],
  driverLocation: null,
});

export const acceptOrder = async () => ({
  success: true,
});

export const confirmPickup = async () => ({
  success: true,
});

export const getActiveDeliveries = async () => ({
  success: true,
  deliveries: [],
  driverLocation: null,
});

export const getDonorStatistics = async () => ({
  success: true,
  statistics: {
    badgeProgress: null,
  },
});

export const getDriverStatistics = async () => ({
  success: true,
  statistics: {
    totalDeliveriesCompleted: 145,
    deliveriesTrend: 12,
    totalDistanceTravelledFormatted: '1,240 Km',
    distanceTrend: 8,
    totalEarnings: 48500, // LKR
    earningsTrend: 15,
    impactProgress: {
      badgeLevel: 'Hero',
      currentCount: 145,
      nextBadgeTarget: 200,
      progressPercentage: 72,
      remainingForNextBadge: 55
    }
  },
});

export const getDriverCompletedDeliveries = async () => ({
  success: true,
  deliveries: [
    {
      id: 'd1',
      itemName: 'Mixed Vegetables Bag',
      quantity: 1,
      donorName: 'Green Market',
      receiverName: 'Colombo Ops Center',
      deliveredAt: new Date(Date.now() - 3600000).toISOString(),
      earnings: 350,
      status: 'delivered'
    },
    {
      id: 'd2',
      itemName: 'Assorted Pastries',
      quantity: 10,
      donorName: 'French Patisserie',
      receiverName: 'Welfare Society',
      deliveredAt: new Date(Date.now() - 86400000).toISOString(),
      earnings: 350,
      status: 'delivered'
    }
  ],
});

export const getDonationTracking = async () => ({
  success: false,
  message: 'Offline mode',
});

export const confirmDelivery = async () => ({
  success: true,
});

export const submitDonation = async (donationData) => {
  const response = await fetch(buildUrl('/api/donations'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(donationData),
  });
  return parseResponse(response);
};

export const getDonationReceiptDetails = async (donationId) => ({
  success: true,
  donation: demoDonation(donationId),
  receipt: null,
});

export const createImpactReceipt = async () => ({
  success: true,
});

export const getReceiptPDF = async () => emptyPdfBlob();

export const getDonorReceiptView = async (donationId) => ({
  donation: demoDonation(donationId),
  donor: { name: 'Demo Donor' },
  receiver: { name: 'Demo Receiver' },
  driver: { name: 'Demo Driver' },
  deliveryDate: null,
  receipt: null,
});

export const getDonorReceiptPDF = async () => emptyPdfBlob();
