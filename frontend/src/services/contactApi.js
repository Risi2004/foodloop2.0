import { buildUrl, parseResponse } from './api';
import { getAuthHeaders, isAuthenticated } from '../utils/auth';

export const submitContactMessage = async ({ name, email, contactNo, subject, message }) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(isAuthenticated() ? getAuthHeaders() : {}),
  };

  const response = await fetch(buildUrl('/api/contact'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name,
      email,
      contactNo,
      subject,
      message,
      sourcePage: window.location.pathname,
    }),
  });

  return parseResponse(response);
};

export const getContactMessages = async () => {
  const response = await fetch(buildUrl('/api/admin/contact-messages'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

export const replyToMessage = async (messageId, reply) => {
  const response = await fetch(buildUrl(`/api/admin/contact-messages/${messageId}/reply`), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reply }),
  });
  return parseResponse(response);
};
