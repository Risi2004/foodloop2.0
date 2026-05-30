/**
 * Map locations and routing helpers.
 */

import { buildUrl, parseResponse } from './api';
import { getRoute } from './routingService';

export const getMapLocations = async () => {
  const response = await fetch(buildUrl('/api/map/locations'));
  const data = await parseResponse(response);
  return {
    donors: Array.isArray(data.donors) ? data.donors : [],
    receivers: Array.isArray(data.receivers) ? data.receivers : [],
  };
};

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
