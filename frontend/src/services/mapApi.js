/**
 * Map routing — delegates to routingService (backend OSRM proxy).
 */

import { getRoute } from './routingService';

export const getMapLocations = async () => ({
  donors: [],
  receivers: [],
});

/**
 * @returns {Promise<Array<{ latitude: number, longitude: number }>>}
 */
export const getRouteWaypoints = async (startLat, startLng, endLat, endLng) => {
  const result = await getRoute(
    { latitude: startLat, longitude: startLng },
    { latitude: endLat, longitude: endLng },
    { alternatives: 0 }
  );
  return result?.route?.waypoints || [];
};
