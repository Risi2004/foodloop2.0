const DEFAULT_OSRM = 'https://router.project-osrm.org';

const routeCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getOsrmBase() {
  return (process.env.OSRM_BASE_URL || DEFAULT_OSRM).replace(/\/$/, '');
}

function cacheKey(prefix, parts) {
  return `${prefix}:${parts.map((p) => p.toFixed(5)).join(';')}`;
}

function getCached(key) {
  const entry = routeCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    routeCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  routeCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function parseOsrmRoute(route, approximate = false) {
  const coordinates = route?.geometry?.coordinates || [];
  const maxPoints = 48;
  const step = Math.max(1, Math.floor(coordinates.length / maxPoints));
  const waypoints = [];

  for (let i = 0; i < coordinates.length; i += step) {
    const [lng, lat] = coordinates[i];
    waypoints.push({ latitude: lat, longitude: lng });
  }

  const last = coordinates[coordinates.length - 1];
  if (last) {
    const lastWp = waypoints[waypoints.length - 1];
    if (!lastWp || lastWp.latitude !== last[1] || lastWp.longitude !== last[0]) {
      waypoints.push({ latitude: last[1], longitude: last[0] });
    }
  }

  return {
    waypoints,
    distanceM: route?.distance ?? 0,
    durationSec: route?.duration ?? 0,
    approximate,
  };
}

async function fetchOsrmJson(path) {
  const url = `${getOsrmBase()}${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OSRM HTTP ${response.status}`);
  }
  const data = await response.json();
  if (data.code && data.code !== 'Ok') {
    throw new Error(data.message || `OSRM error: ${data.code}`);
  }
  return data;
}

exports.getRoute = async (req, res) => {
  try {
    const fromLat = Number(req.query.fromLat);
    const fromLng = Number(req.query.fromLng);
    const toLat = Number(req.query.toLat);
    const toLng = Number(req.query.toLng);
    const alternatives = Math.min(Number(req.query.alternatives) || 0, 3);

    if ([fromLat, fromLng, toLat, toLng].some((n) => Number.isNaN(n))) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates.' });
    }

    const key = cacheKey('route', [fromLat, fromLng, toLat, toLng, alternatives]);
    const cached = getCached(key);
    if (cached) {
      return res.json({ success: true, ...cached });
    }

    const coords = `${fromLng},${fromLat};${toLng},${toLat}`;
    const altParam = alternatives > 0 ? `&alternatives=${alternatives}` : '';
    const path =
      `/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true` +
      `&annotations=duration,distance${altParam}`;

    const data = await fetchOsrmJson(path);
    const routes = data.routes || [];
    if (routes.length === 0) {
      return res.status(404).json({ success: false, message: 'No route found.' });
    }

    const primary = parseOsrmRoute(routes[0], false);
    const alternativeRoutes = routes.slice(1).map((r) => parseOsrmRoute(r, false));

    const payload = {
      route: primary,
      alternativeRoutes,
    };
    setCache(key, payload);

    return res.json({ success: true, ...payload });
  } catch (err) {
    console.error('getRoute error:', err);
    return res.status(502).json({
      success: false,
      message: err.message || 'Routing service unavailable',
    });
  }
};

exports.getTable = async (req, res) => {
  try {
    const { sources = [], destinations = [] } = req.body || {};

    if (!Array.isArray(sources) || !Array.isArray(destinations) || sources.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'sources and destinations arrays are required.',
      });
    }

    const all = [...sources, ...destinations];
    for (const p of all) {
      if (Number.isNaN(Number(p.latitude)) || Number.isNaN(Number(p.longitude))) {
        return res.status(400).json({ success: false, message: 'Invalid point in matrix.' });
      }
    }

    const coordStr = all.map((p) => `${p.longitude},${p.latitude}`).join(';');
    const sourceIdx = sources.map((_, i) => i).join(';');
    const destIdx = destinations.map((_, i) => i + sources.length).join(';');

    const path =
      `/table/v1/driving/${coordStr}?sources=${sourceIdx}&destinations=${destIdx}` +
      '&annotations=duration,distance';

    const data = await fetchOsrmJson(path);
    const durations = data.durations || [];
    const distances = data.distances || [];

    return res.json({
      success: true,
      durations,
      distances,
    });
  } catch (err) {
    console.error('getTable error:', err);
    return res.status(502).json({
      success: false,
      message: err.message || 'Routing matrix unavailable',
    });
  }
};
