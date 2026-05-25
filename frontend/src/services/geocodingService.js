import { buildUrl, parseResponse } from './api';

export function isWithinSriLanka(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  return la >= 5 && la <= 10 && ln >= 79 && ln <= 82;
}

/**
 * Forward geocode a street address in Sri Lanka (via backend proxy).
 * @returns {{ lat: number, lng: number, displayName: string } | null}
 */
export async function geocodeAddress(address) {
  const query = String(address || '').trim();
  if (!query) return null;

  const params = new URLSearchParams({ q: query });
  const response = await fetch(buildUrl(`/api/geocode/search?${params}`));
  const data = await parseResponse(response);

  if (!data?.success || !data.result) return null;

  const { lat, lng, displayName } = data.result;
  if (!isWithinSriLanka(lat, lng)) return null;

  return {
    lat: Number(lat),
    lng: Number(lng),
    displayName: displayName || query,
  };
}

/**
 * Reverse geocode coordinates to a readable address (via backend proxy).
 */
export async function reverseGeocode(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (Number.isNaN(la) || Number.isNaN(ln)) return null;
  if (!isWithinSriLanka(la, ln)) return null;

  const params = new URLSearchParams({
    lat: String(la),
    lon: String(ln),
  });
  const response = await fetch(buildUrl(`/api/geocode/reverse?${params}`));
  const data = await parseResponse(response);

  if (!data?.success) {
    throw new Error(data?.message || 'Reverse geocoding failed');
  }

  return data.displayName || `${la.toFixed(5)}, ${ln.toFixed(5)}`;
}
