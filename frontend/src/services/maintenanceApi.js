import { buildUrl, parseResponse } from './api';
import { getAuthHeaders } from '../utils/auth';

export async function getMaintenanceStatus() {
  const response = await fetch(buildUrl('/api/maintenance/status'));
  return parseResponse(response);
}

export async function getAdminMaintenance() {
  const response = await fetch(buildUrl('/api/admin/maintenance'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
}

export async function setScheduledMaintenance(payload) {
  const response = await fetch(buildUrl('/api/admin/maintenance/scheduled'), {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function startSuddenMaintenance() {
  const response = await fetch(buildUrl('/api/admin/maintenance/sudden/start'), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
}

export async function forceSuddenMaintenanceActive() {
  const response = await fetch(buildUrl('/api/admin/maintenance/sudden/activate'), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
}

export async function endMaintenance() {
  const response = await fetch(buildUrl('/api/admin/maintenance/end'), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
}

export async function cancelMaintenance() {
  const response = await fetch(buildUrl('/api/admin/maintenance/cancel'), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
}

export function formatMaintenanceDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function phaseLabel(phase) {
  const labels = {
    off: 'Normal operation',
    scheduled_upcoming: 'Scheduled (upcoming)',
    scheduled_active: 'Scheduled (active)',
    sudden_drain: 'Sudden (draining)',
    sudden_active: 'Sudden (active)',
  };
  return labels[phase] || phase || '—';
}

export const MAINTENANCE_BLOCK_MESSAGE =
  'FoodLoop is temporarily unavailable for new orders. Please try again after maintenance ends.';

export function getMaintenanceErrorMessage(err) {
  if (err?.response?.data?.code === 'MAINTENANCE') {
    return err.response.data.message || MAINTENANCE_BLOCK_MESSAGE;
  }
  return err?.message || null;
}
