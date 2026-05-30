import { buildUrl, parseResponse } from './api';
import { getAuthHeaders } from '../utils/auth';

export const submitReview = async (text) => {
  const response = await fetch(buildUrl('/api/reviews'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text }),
  });
  return parseResponse(response);
};

export const getApprovedReviews = async () => {
  const response = await fetch(buildUrl('/api/reviews/approved'));
  return parseResponse(response);
};

export const getPendingReviews = async () => {
  const response = await fetch(buildUrl('/api/admin/reviews/pending'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const approveReview = async (id) => {
  const response = await fetch(buildUrl(`/api/admin/reviews/${id}/approve`), {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const rejectReview = async (id, reason) => {
  const response = await fetch(buildUrl(`/api/admin/reviews/${id}/reject`), {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  return parseResponse(response);
};

export const getApprovedReviewsAdmin = async () => {
  const response = await fetch(buildUrl('/api/admin/reviews/approved'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const deleteReview = async (id) => {
  const response = await fetch(buildUrl(`/api/admin/reviews/${id}`), {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};
