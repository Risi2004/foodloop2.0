/**
 * Demo Mode Service
 * Simulates driver movement along a path for competition demonstrations
 */

import { getRouteWaypoints } from './mapApi';

let simulationInterval = null;
let currentWaypointIndex = 0;
let waypoints = [];
let onLocationUpdateCallback = null;

/**
 * Generate intermediate waypoints between two coordinates
 * Uses linear interpolation to create a smooth path
 * 
 * @param {number} startLat - Starting latitude
 * @param {number} startLng - Starting longitude
 * @param {number} endLat - Ending latitude
 * @param {number} endLng - Ending longitude
 * @param {number} numPoints - Number of intermediate points (default: 12)
 * @returns {Array} Array of waypoint objects with latitude and longitude
 */
export const generatePathWaypoints = (startLat, startLng, endLat, endLng, numPoints = 12) => {
  if (!startLat || !startLng || !endLat || !endLng) {
    console.error('[DemoMode] Invalid coordinates provided');
    return [];
  }

  const points = [];
  
  // Include start point
  points.push({ latitude: startLat, longitude: startLng });
  
  // Generate intermediate points
  for (let i = 1; i < numPoints; i++) {
    const ratio = i / numPoints;
    const lat = startLat + (endLat - startLat) * ratio;
    const lng = startLng + (endLng - startLng) * ratio;
    points.push({ latitude: lat, longitude: lng });
  }
  
  // Include end point
  points.push({ latitude: endLat, longitude: endLng });
  
  console.log(`[DemoMode] Generated ${points.length} waypoints from [${startLat}, ${startLng}] to [${endLat}, ${endLng}]`);
  return points;
};

/**
 * Generate road-following waypoints via routing API; fall back to linear interpolation on failure.
 * @param {number} startLat
 * @param {number} startLng
 * @param {number} endLat
 * @param {number} endLng
 * @returns {Promise<Array<{ latitude: number, longitude: number }>>}
 */
export const generateRouteWaypoints = async (startLat, startLng, endLat, endLng) => {
  if (!startLat || !startLng || !endLat || !endLng) {
    console.error('[DemoMode] Invalid coordinates for route');
    return generatePathWaypoints(startLat, startLng, endLat, endLng, 12);
  }
  try {
    const waypoints = await getRouteWaypoints(startLat, startLng, endLat, endLng);
    if (waypoints && waypoints.length > 0) {
      console.log(`[DemoMode] Using road route: ${waypoints.length} waypoints`);
      return waypoints;
    }
  } catch (err) {
    console.warn('[DemoMode] Route API failed, using straight line:', err.message);
  }
  return generatePathWaypoints(startLat, startLng, endLat, endLng, 12);
};

/**
 * Start simulating movement along the waypoints
 * 
 * @param {Array} pathWaypoints - Array of waypoint objects with latitude and longitude
 * @param {Function} onLocationUpdate - Callback function called with each waypoint {latitude, longitude, index, total}
 * @param {number} intervalMs - Interval between waypoint updates in milliseconds (default: 2500)
 * @returns {boolean} True if simulation started successfully
 */
export const simulateMovement = (pathWaypoints, onLocationUpdate, intervalMs = 2500) => {
  // Stop any existing simulation
  stopSimulation();
  
  if (!pathWaypoints || pathWaypoints.length === 0) {
    console.error('[DemoMode] No waypoints provided');
    return false;
  }
  
  if (typeof onLocationUpdate !== 'function') {
    console.error('[DemoMode] onLocationUpdate must be a function');
    return false;
  }
  
  waypoints = pathWaypoints;
  currentWaypointIndex = 0;
  onLocationUpdateCallback = onLocationUpdate;
  
  console.log(`[DemoMode] Starting simulation with ${waypoints.length} waypoints, interval: ${intervalMs}ms`);
  
  // Immediately call callback with first waypoint
  if (waypoints.length > 0) {
    onLocationUpdateCallback({
      latitude: waypoints[0].latitude,
      longitude: waypoints[0].longitude,
      index: 0,
      total: waypoints.length
    });
  }
  
  // Start interval for remaining waypoints
  if (waypoints.length > 1) {
    currentWaypointIndex = 1;
    simulationInterval = setInterval(() => {
      if (currentWaypointIndex < waypoints.length) {
        const waypoint = waypoints[currentWaypointIndex];
        onLocationUpdateCallback({
          latitude: waypoint.latitude,
          longitude: waypoint.longitude,
          index: currentWaypointIndex,
          total: waypoints.length
        });
        currentWaypointIndex++;
      } else {
        // Reached destination
        console.log('[DemoMode] Reached destination');
        stopSimulation();
      }
    }, intervalMs);
  }
  
  return true;
};

/**
 * Stop the simulation and clear the interval
 */
export const stopSimulation = () => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    console.log('[DemoMode] Simulation stopped');
  }
  
  currentWaypointIndex = 0;
  waypoints = [];
  onLocationUpdateCallback = null;
};

/**
 * Check if simulation is currently running
 * @returns {boolean} True if simulation is active
 */
export const isSimulationActive = () => {
  return simulationInterval !== null;
};

/**
 * Get current simulation progress
 * @returns {Object} Progress info with current index and total waypoints
 */
export const getSimulationProgress = () => {
  return {
    currentIndex: currentWaypointIndex,
    total: waypoints.length,
    isActive: isSimulationActive()
  };
};
