/**
 * Road routing, ETA, and heuristic traffic (via backend OSRM proxy).
 */

import { buildUrl, parseResponse } from './api';
import { getAuthHeaders } from '../utils/auth';
import { calculateDistance } from '../utils/distance';

const COLOMBO_TZ = 'Asia/Colombo';
const DEMO_SIMULATION_MS = 45000;
const FALLBACK_SPEED_KMH = 30;

function point(lat, lng) {
  return { latitude: Number(lat), longitude: Number(lng) };
}

/** Colombo time-of-day traffic heuristic (not live traffic). */
export function getTrafficFactor(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: COLOMBO_TZ,
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const weekday = parts.find((p) => p.type === 'weekday')?.value || '';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 12);
  const isWeekday = !['Sat', 'Sun'].includes(weekday);

  if (isWeekday && ((hour >= 7 && hour < 10) || (hour >= 16 && hour < 19))) {
    return { factor: 1.4, label: 'Heavy traffic' };
  }
  if (hour >= 12 && hour < 14) {
    return { factor: 1.15, label: 'Moderate traffic' };
  }
  if (hour >= 22 || hour < 6) {
    return { factor: 0.9, label: 'Light traffic' };
  }
  return { factor: 1.0, label: 'Normal traffic' };
}

export function applyTrafficModel(durationSec, date = new Date()) {
  const baseSec = Math.max(0, Math.round(Number(durationSec) || 0));
  const { factor, label } = getTrafficFactor(date);
  const adjustedSec = Math.round(baseSec * factor);
  const delaySec = Math.max(0, adjustedSec - baseSec);
  return { baseSec, adjustedSec, factor, label, delaySec };
}

export function formatEta(seconds) {
  const sec = Math.max(0, Math.round(Number(seconds) || 0));
  if (sec < 60) return '< 1 min';
  const mins = Math.round(sec / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

export function formatEtaWithTraffic(trafficResult) {
  const { adjustedSec, label, delaySec } = trafficResult;
  const eta = formatEta(adjustedSec);
  if (delaySec <= 0) return { eta, detail: label };
  return {
    eta,
    detail: `${label}, +${formatEta(delaySec)}`,
  };
}

function fallbackRoute(from, to) {
  const fromLat = Number(from.latitude ?? from.lat);
  const fromLng = Number(from.longitude ?? from.lng);
  const toLat = Number(to.latitude ?? to.lat);
  const toLng = Number(to.longitude ?? to.lng);

  const km = calculateDistance(fromLat, fromLng, toLat, toLng);
  const distanceM = km != null ? km * 1000 : 0;
  const durationSec = km != null ? (km / FALLBACK_SPEED_KMH) * 3600 : 0;
  const numPoints = 14;

  const waypoints = [];
  for (let i = 0; i <= numPoints; i++) {
    const ratio = i / numPoints;
    waypoints.push({
      latitude: fromLat + (toLat - fromLat) * ratio,
      longitude: fromLng + (toLng - fromLng) * ratio,
    });
  }

  return {
    waypoints,
    distanceM,
    durationSec,
    approximate: true,
  };
}

function pickSuggestedRoute(primary, alternatives = []) {
  const all = [primary, ...alternatives].filter(Boolean);
  if (all.length === 0) return null;

  let best = all[0];
  let bestAdj = applyTrafficModel(best.durationSec).adjustedSec;

  for (let i = 1; i < all.length; i++) {
    const adj = applyTrafficModel(all[i].durationSec).adjustedSec;
    if (adj < bestAdj) {
      best = all[i];
      bestAdj = adj;
    }
  }

  const shortestDist = all.reduce(
    (min, r) => (r.distanceM < min.distanceM ? r : min),
    all[0]
  );

  return {
    suggested: best,
    shortestDistance:
      shortestDist.distanceM < best.distanceM - 50 ? shortestDist : null,
  };
}

/**
 * @param {{ latitude, longitude } | { lat, lng }} from
 * @param {{ latitude, longitude } | { lat, lng }} to
 * @param {{ alternatives?: number }} options
 */
export async function getRoute(from, to, options = {}) {
  const fromLat = Number(from.latitude ?? from.lat);
  const fromLng = Number(from.longitude ?? from.lng);
  const toLat = Number(to.latitude ?? to.lat);
  const toLng = Number(to.longitude ?? to.lng);

  if ([fromLat, fromLng, toLat, toLng].some((n) => Number.isNaN(n))) {
    return { success: false, route: fallbackRoute(from, to), approximate: true };
  }

  const alternatives = options.alternatives ?? 2;

  try {
    const params = new URLSearchParams({
      fromLat: String(fromLat),
      fromLng: String(fromLng),
      toLat: String(toLat),
      toLng: String(toLng),
      alternatives: String(alternatives),
    });

    const response = await fetch(buildUrl(`/api/routing/route?${params}`), {
      headers: getAuthHeaders(),
    });
    const data = await parseResponse(response);

    if (!data.route) {
      throw new Error('No route in response');
    }

    const traffic = applyTrafficModel(data.route.durationSec);
    const picked = pickSuggestedRoute(data.route, data.alternativeRoutes || []);

    return {
      success: true,
      route: data.route,
      alternativeRoutes: data.alternativeRoutes || [],
      suggested: picked?.suggested || data.route,
      shorterDistanceRoute: picked?.shortestDistance || null,
      traffic,
      eta: formatEtaWithTraffic(traffic),
      approximate: !!data.route.approximate,
    };
  } catch (err) {
    console.warn('[routingService] getRoute failed, using fallback:', err.message);
    const route = fallbackRoute(from, to);
    const traffic = applyTrafficModel(route.durationSec);
    return {
      success: true,
      route,
      alternativeRoutes: [],
      suggested: route,
      shorterDistanceRoute: null,
      traffic,
      eta: formatEtaWithTraffic(traffic),
      approximate: true,
    };
  }
}

/**
 * Duration matrix: sources[i] -> destinations[j]
 */
export async function getRouteMatrix(sources, destinations) {
  try {
    const response = await fetch(buildUrl('/api/routing/table'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sources, destinations }),
    });
    return parseResponse(response);
  } catch (err) {
    console.warn('[routingService] getRouteMatrix failed:', err.message);
    return { success: false, durations: null, distances: null };
  }
}

export function getDemoSimulationDurationMs() {
  return DEMO_SIMULATION_MS;
}

export { point as routingPoint };
