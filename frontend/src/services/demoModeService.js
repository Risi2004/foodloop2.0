/**
 * Demo Mode Service — simulates driver movement along a road path.
 */

import { getRouteWaypoints } from './mapApi';
import { calculateDistance } from '../utils/distance';
import { getDemoSimulationDurationMs } from './routingService';

let simulationTimeouts = [];
let waypoints = [];
let onLocationUpdateCallback = null;

function coordsValid(startLat, startLng, endLat, endLng) {
  return [startLat, startLng, endLat, endLng].every((n) => Number.isFinite(Number(n)));
}

export const generatePathWaypoints = (startLat, startLng, endLat, endLng, numPoints = 12) => {
  if (!coordsValid(startLat, startLng, endLat, endLng)) {
    console.error('[DemoMode] Invalid coordinates provided');
    return [];
  }

  startLat = Number(startLat);
  startLng = Number(startLng);
  endLat = Number(endLat);
  endLng = Number(endLng);

  const points = [{ latitude: startLat, longitude: startLng }];

  for (let i = 1; i < numPoints; i++) {
    const ratio = i / numPoints;
    points.push({
      latitude: startLat + (endLat - startLat) * ratio,
      longitude: startLng + (endLng - startLng) * ratio,
    });
  }

  points.push({ latitude: endLat, longitude: endLng });
  return points;
};

export const generateRouteWaypoints = async (startLat, startLng, endLat, endLng) => {
  if (!coordsValid(startLat, startLng, endLat, endLng)) {
    return [];
  }
  try {
    const wps = await getRouteWaypoints(startLat, startLng, endLat, endLng);
    if (wps && wps.length > 0) return wps;
  } catch (err) {
    console.warn('[DemoMode] Route API failed, using straight line:', err.message);
  }
  return generatePathWaypoints(startLat, startLng, endLat, endLng, 12);
};

function segmentWeights(pathWaypoints) {
  const weights = [0];
  let totalKm = 0;

  for (let i = 1; i < pathWaypoints.length; i++) {
    const a = pathWaypoints[i - 1];
    const b = pathWaypoints[i];
    const km =
      calculateDistance(a.latitude, a.longitude, b.latitude, b.longitude) || 0;
    totalKm += km;
    weights.push(totalKm);
  }

  if (totalKm <= 0) {
    const even = 1 / Math.max(1, pathWaypoints.length - 1);
    return pathWaypoints.map((_, i) => i * even);
  }

  return weights.map((w) => w / totalKm);
}

function clearSimulationTimers() {
  simulationTimeouts.forEach((id) => clearTimeout(id));
  simulationTimeouts = [];
}

/**
 * Move along path with timing proportional to segment distance.
 * @param {Array} pathWaypoints
 * @param {Function} onLocationUpdate
 * @param {{ totalDurationMs?: number }} options
 */
export const simulateMovement = (pathWaypoints, onLocationUpdate, options = {}) => {
  stopSimulation();

  if (!pathWaypoints?.length) {
    console.error('[DemoMode] No waypoints provided');
    return false;
  }
  if (typeof onLocationUpdate !== 'function') {
    console.error('[DemoMode] onLocationUpdate must be a function');
    return false;
  }

  waypoints = pathWaypoints;
  onLocationUpdateCallback = onLocationUpdate;

  const totalDurationMs =
    options.totalDurationMs ?? getDemoSimulationDurationMs();
  const cumulative = segmentWeights(pathWaypoints);
  const total = pathWaypoints.length;

  const emit = (index) => {
    const wp = pathWaypoints[index];
    onLocationUpdateCallback({
      latitude: wp.latitude,
      longitude: wp.longitude,
      index,
      total,
    });
  };

  emit(0);

  for (let i = 1; i < pathWaypoints.length; i++) {
    const delay = Math.max(50, Math.round(totalDurationMs * cumulative[i]));
    const timeoutId = setTimeout(() => {
      emit(i);
      if (i === pathWaypoints.length - 1) {
        console.log('[DemoMode] Reached destination');
        clearSimulationTimers();
        waypoints = [];
        onLocationUpdateCallback = null;
      }
    }, delay);
    simulationTimeouts.push(timeoutId);
  }

  return true;
};

export const stopSimulation = () => {
  clearSimulationTimers();
  waypoints = [];
  onLocationUpdateCallback = null;
};

export const isSimulationActive = () => simulationTimeouts.length > 0;

export const getSimulationProgress = () => ({
  currentIndex: 0,
  total: waypoints.length,
  isActive: isSimulationActive(),
});
