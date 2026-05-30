/**
 * Shared helpers for driver pickup / delivery demo simulation.
 */

import { getRoute, getDemoSimulationDurationMs } from '../services/routingService';
import { startDemo, stopDemo } from '../services/api';
import { simulateMovement, stopSimulation } from '../services/demoModeService';

export function isValidCoord(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln);
}

function toCoordOrNull(lat, lng) {
  if (!isValidCoord(lat, lng)) return null;
  return { lat: Number(lat), lng: Number(lng) };
}

function extractDonorCoord(tracking) {
  const donorLoc = tracking?.donor?.location;
  if (donorLoc) {
    const fromDonorObj = toCoordOrNull(donorLoc.latitude, donorLoc.longitude);
    if (fromDonorObj) return fromDonorObj;
  }

  const donation = tracking?.donation;
  const fromDonation = toCoordOrNull(donation?.donorLatitude, donation?.donorLongitude);
  if (fromDonation) return fromDonation;

  return null;
}

function extractReceiverCoord(tracking) {
  const receiverLoc = tracking?.receiver?.location;
  if (receiverLoc) {
    const fromReceiverObj = toCoordOrNull(receiverLoc.latitude, receiverLoc.longitude);
    if (fromReceiverObj) return fromReceiverObj;
  }

  const donation = tracking?.donation;
  const fromDonation = toCoordOrNull(donation?.receiverLatitude, donation?.receiverLongitude);
  if (fromDonation) return fromDonation;

  return null;
}

/** Lat/lng pair for map markers, or null if missing. */
export function getSupplierCoordFromTracking(tracking) {
  return extractDonorCoord(tracking);
}

export function getReceiverCoordFromTracking(tracking) {
  return extractReceiverCoord(tracking);
}

export function getSupplierAddressFromTracking(tracking) {
  return (
    tracking?.donor?.address?.trim() ||
    tracking?.donation?.pickupAddress?.trim() ||
    tracking?.donation?.donorAddress?.trim() ||
    ''
  );
}

export function getReceiverAddressFromTracking(tracking) {
  return (
    tracking?.receiver?.address?.trim() ||
    tracking?.donation?.receiverAddress?.trim() ||
    ''
  );
}

function extractDriverCoord(tracking, driverLocationState) {
  if (driverLocationState?.length === 2 && isValidCoord(driverLocationState[0], driverLocationState[1])) {
    return { lat: Number(driverLocationState[0]), lng: Number(driverLocationState[1]) };
  }

  const driver = tracking?.driver?.location;
  if (driver && isValidCoord(driver.latitude, driver.longitude)) {
    return { lat: Number(driver.latitude), lng: Number(driver.longitude) };
  }

  return null;
}

/** ~1.5 km south of a point (demo start when driver GPS is unset). */
export function offsetStartSouth(lat, lng, km = 1.5) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return { lat: la - km / 111, lng: ln };
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function resolveDriverStart(leg, tracking, driverLocationState, end) {
  if (leg === 'delivery') {
    const donorCoord = extractDonorCoord(tracking);
    if (donorCoord) return donorCoord;
    return extractDriverCoord(tracking, driverLocationState);
  }

  let start = extractDriverCoord(tracking, driverLocationState);

  if (!start) {
    try {
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (p) =>
            resolve({
              lat: p.coords.latitude,
              lng: p.coords.longitude,
            }),
          reject,
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      });
      if (isValidCoord(position.lat, position.lng)) {
        start = position;
      }
    } catch {
      // fall through
    }
  }

  if (!start && end) {
    start = offsetStartSouth(end.lat, end.lng, 2);
  }

  if (start && end && haversineKm(start, end) < 0.2) {
    start = offsetStartSouth(end.lat, end.lng, 2) || start;
  }

  return start;
}

/**
 * @param {'pickup' | 'delivery'} leg
 * @param {object} tracking
 * @param {[number, number] | null} driverLocationState [lat, lng]
 */
export async function resolveDemoEndpoints(leg, tracking, driverLocationState) {
  const donorCoord = extractDonorCoord(tracking);
  const receiverCoord = extractReceiverCoord(tracking);

  if (leg === 'pickup') {
    if (!donorCoord) {
      return { start: null, end: null, error: 'Supplier pickup location is missing.' };
    }

    const start = await resolveDriverStart('pickup', tracking, driverLocationState, donorCoord);
    if (!start) {
      return {
        start: null,
        end: donorCoord,
        error: 'Set your location on the Delivery page, or allow browser location access.',
      };
    }

    return { start, end: donorCoord, error: null };
  }

  if (!donorCoord) {
    return { start: null, end: null, error: 'Supplier location is missing.' };
  }
  if (!receiverCoord) {
    return { start: null, end: null, error: 'Receiver delivery location is missing.' };
  }

  const start = await resolveDriverStart('delivery', tracking, driverLocationState, receiverCoord);
  if (!start) {
    return {
      start: null,
      end: receiverCoord,
      error: 'Confirm pickup first so the route starts from the supplier.',
    };
  }

  return { start, end: receiverCoord, error: null };
}

/**
 * Run one demo leg: fetch route, draw path, simulate movement.
 */
export async function runDriverDemoLeg({
  leg,
  tracking,
  driverLocationState,
  onLocationUpdate,
  onRouteInsight,
}) {
  const { start, end, error: endpointError } = await resolveDemoEndpoints(
    leg,
    tracking,
    driverLocationState
  );

  if (endpointError || !start || !end) {
    return { ok: false, error: endpointError || 'Cannot start demo: missing location data.' };
  }

  const routeResult = await getRoute(
    { latitude: start.lat, longitude: start.lng },
    { latitude: end.lat, longitude: end.lng },
    { alternatives: 2 }
  );

  const waypoints = routeResult.suggested?.waypoints || routeResult.route?.waypoints || [];
  if (waypoints.length === 0) {
    return { ok: false, error: 'Failed to generate path waypoints. Check location coordinates.' };
  }

  const routeInsight = {
    eta: routeResult.eta,
    traffic: routeResult.traffic,
    suggested: routeResult.suggested,
    shorterDistanceRoute: routeResult.shorterDistanceRoute,
    distanceKm: (routeResult.suggested?.distanceM || 0) / 1000,
    approximate: routeResult.approximate,
  };

  if (typeof onRouteInsight === 'function') {
    onRouteInsight(routeInsight);
  }

  try {
    await startDemo(waypoints);
  } catch (err) {
    console.warn('[DemoMode] Server demo unavailable, using client simulation only:', err.message);
  }

  const simMs = Math.min(
    60000,
    Math.max(20000, (routeResult.traffic?.adjustedSec || 60) * 40)
  );

  const success = simulateMovement(
    waypoints,
    onLocationUpdate,
    { totalDurationMs: simMs || getDemoSimulationDurationMs() }
  );

  if (!success) {
    await stopDemo().catch(() => {});
    return { ok: false, error: 'Failed to start demo mode' };
  }

  return {
    ok: true,
    start,
    end,
    waypoints,
    routeInsight,
  };
}

export async function stopDriverDemo() {
  stopSimulation();
  try {
    await stopDemo();
  } catch (err) {
    console.warn('[DemoMode] Error stopping server demo:', err.message);
  }
}
