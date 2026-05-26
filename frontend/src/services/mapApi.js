/**
 * Map routing via OSRM (public demo server). Falls back to empty array so
 * demoModeService can interpolate a straight line.
 */

function isValidCoord(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln);
}

export const getMapLocations = async () => ({
  donors: [],
  receivers: [],
});

/**
 * @returns {Promise<Array<{ latitude: number, longitude: number }>>}
 */
export const getRouteWaypoints = async (startLat, startLng, endLat, endLng) => {
  if (!isValidCoord(startLat, startLng) || !isValidCoord(endLat, endLng)) {
    return [];
  }

  const slat = Number(startLat);
  const slng = Number(startLng);
  const elat = Number(endLat);
  const elng = Number(endLng);

  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${slng},${slat};${elng},${elat}?overview=full&geometries=geojson`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Routing HTTP ${response.status}`);
  }

  const data = await response.json();
  const coordinates = data?.routes?.[0]?.geometry?.coordinates;
  if (data?.code !== 'Ok' || !Array.isArray(coordinates) || coordinates.length < 2) {
    return [];
  }

  const maxPoints = 48;
  const step = Math.max(1, Math.floor(coordinates.length / maxPoints));
  const waypoints = [];

  for (let i = 0; i < coordinates.length; i += step) {
    const [lng, lat] = coordinates[i];
    waypoints.push({ latitude: lat, longitude: lng });
  }

  const last = coordinates[coordinates.length - 1];
  const lastWp = waypoints[waypoints.length - 1];
  if (
    !lastWp ||
    lastWp.latitude !== last[1] ||
    lastWp.longitude !== last[0]
  ) {
    waypoints.push({ latitude: last[1], longitude: last[0] });
  }

  return waypoints;
};
