import { buildUrl, parseResponse } from './api';
import { getAuthHeaders } from '../utils/auth';
export { formatLkr } from './earningsApi';

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') qs.set(key, String(value));
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export async function getAdminFinanceSummary({ from, to } = {}) {
  const response = await fetch(
    buildUrl(`/api/admin/finance/summary${buildQuery({ from, to })}`),
    { headers: getAuthHeaders() }
  );
  return parseResponse(response);
}

export async function getAdminFinanceLedger({ type, from, to, page = 1, limit = 25 } = {}) {
  const response = await fetch(
    buildUrl(
      `/api/admin/finance/ledger${buildQuery({ type, from, to, page, limit })}`
    ),
    { headers: getAuthHeaders() }
  );
  return parseResponse(response);
}

export function ledgerTypeLabel(type) {
  const labels = {
    commission: 'Commission',
    card_payment: 'Card payment',
    free_donation_subsidy: 'Free donation subsidy',
    payout: 'Payout',
  };
  return labels[type] || type || '—';
}

export function contextLabel(context) {
  const labels = {
    customer_checkout: 'Customer checkout',
    claim: 'Receiver claim',
    supplier_ai_subscription: 'Supplier AI subscription',
    donation_delivery: 'Donation delivery',
    payout: 'Payout',
  };
  return labels[context] || context || '—';
}

export function financeHealthLabel(status) {
  if (status === 'healthy') return 'Platform is healthy';
  if (status === 'at_loss') return 'Platform is at a loss';
  return status || '—';
}
