const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'FoodLoop/2.0 (donation pickup location)';

function isWithinSriLanka(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  return la >= 5 && la <= 10 && ln >= 79 && ln <= 82;
}

async function nominatimFetch(path) {
  const url = `${NOMINATIM_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`Geocoding service unavailable (${response.status})`);
  }
  return response.json();
}

exports.search = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ success: false, message: 'Query address is required.' });
    }

    const params = new URLSearchParams({
      q,
      format: 'json',
      limit: '1',
      countrycodes: 'lk',
    });

    const results = await nominatimFetch(`/search?${params}`);
    if (!Array.isArray(results) || results.length === 0) {
      return res.json({ success: true, result: null });
    }

    const hit = results[0];
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng) || !isWithinSriLanka(lat, lng)) {
      return res.json({ success: true, result: null });
    }

    return res.json({
      success: true,
      result: {
        lat,
        lng,
        displayName: hit.display_name || q,
      },
    });
  } catch (err) {
    console.error('geocode search error:', err);
    return res.status(503).json({
      success: false,
      message: err.message || 'Address lookup failed. Try again or use current location.',
    });
  }
};

exports.reverse = async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lon ?? req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'Valid coordinates are required.' });
    }
    if (!isWithinSriLanka(lat, lng)) {
      return res.status(400).json({ success: false, message: 'Location is outside Sri Lanka.' });
    }

    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'json',
    });

    const data = await nominatimFetch(`/reverse?${params}`);
    return res.json({
      success: true,
      displayName: data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    });
  } catch (err) {
    console.error('geocode reverse error:', err);
    return res.status(503).json({
      success: false,
      message: err.message || 'Could not resolve address for this point.',
    });
  }
};
