const {
  parseUnits,
  getCurrentWeatherByCoords,
  getForecastWeatherByCoords,
} = require('../services/weatherService');

function parseCoordinates(req, res) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    res.status(400).json({
      success: false,
      message: 'Valid lat and lng query params are required.',
    });
    return null;
  }
  return { lat, lng };
}

exports.getCurrentWeather = async (req, res) => {
  try {
    const coords = parseCoordinates(req, res);
    if (!coords) return;
    const units = parseUnits(req.query.units);
    const payload = await getCurrentWeatherByCoords(coords.lat, coords.lng, units);
    return res.json({ success: true, ...payload });
  } catch (err) {
    if (err.status === 401) {
      console.warn('getCurrentWeather auth error:', err.message);
    } else {
      console.error('getCurrentWeather error:', err);
    }
    return res.status(err.status || 502).json({
      success: false,
      message: err.message || 'Weather service unavailable',
    });
  }
};

exports.getForecastWeather = async (req, res) => {
  try {
    const coords = parseCoordinates(req, res);
    if (!coords) return;
    const units = parseUnits(req.query.units);
    const payload = await getForecastWeatherByCoords(coords.lat, coords.lng, units);
    return res.json({ success: true, ...payload });
  } catch (err) {
    if (err.status === 401) {
      console.warn('getForecastWeather auth error:', err.message);
    } else {
      console.error('getForecastWeather error:', err);
    }
    return res.status(err.status || 502).json({
      success: false,
      message: err.message || 'Forecast service unavailable',
    });
  }
};
