const DEFAULT_WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const CURRENT_TTL_MS = 10 * 60 * 1000;
const FORECAST_TTL_MS = 30 * 60 * 1000;

const weatherCache = new Map();

function getWeatherBaseUrl() {
  return (process.env.WEATHER_BASE_URL || DEFAULT_WEATHER_BASE_URL).replace(/\/$/, '');
}

function buildCacheKey(prefix, lat, lng, units) {
  return `${prefix}:${Number(lat).toFixed(3)}:${Number(lng).toFixed(3)}:${units}`;
}

function getCached(key) {
  const entry = weatherCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    weatherCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data, ttlMs) {
  weatherCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function parseUnits(units) {
  const u = String(units || 'metric').toLowerCase();
  return ['metric', 'imperial', 'standard'].includes(u) ? u : 'metric';
}

async function fetchOpenWeather(path, params) {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    const err = new Error('WEATHER_API_KEY is not configured on server.');
    err.status = 503;
    throw err;
  }

  const qs = new URLSearchParams({ ...params, appid: apiKey });
  const response = await fetch(`${getWeatherBaseUrl()}${path}?${qs.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = data?.message || `OpenWeather error (${response.status})`;
    const err =
      response.status === 401
        ? new Error(
            'OpenWeather API key is invalid or inactive. Update WEATHER_API_KEY and restart backend.'
          )
        : new Error(providerMessage);
    err.status = response.status;
    throw err;
  }
  return data;
}

function toCurrentWeatherJSON(data) {
  const weather = Array.isArray(data.weather) ? data.weather[0] || {} : {};
  return {
    location: {
      name: data.name || 'Unknown location',
      country: data.sys?.country || '',
      latitude: data.coord?.lat ?? null,
      longitude: data.coord?.lon ?? null,
    },
    current: {
      timestamp: data.dt ? new Date(data.dt * 1000).toISOString() : new Date().toISOString(),
      temperature: data.main?.temp ?? null,
      feelsLike: data.main?.feels_like ?? null,
      humidity: data.main?.humidity ?? null,
      pressure: data.main?.pressure ?? null,
      windSpeed: data.wind?.speed ?? null,
      condition: weather.main || 'Unknown',
      description: weather.description || 'No description',
      icon: weather.icon ? `https://openweathermap.org/img/wn/${weather.icon}@2x.png` : null,
    },
  };
}

function toForecastJSON(data) {
  const list = Array.isArray(data.list) ? data.list : [];
  const entries = list.slice(0, 8).map((entry) => {
    const weather = Array.isArray(entry.weather) ? entry.weather[0] || {} : {};
    return {
      timestamp: entry.dt ? new Date(entry.dt * 1000).toISOString() : null,
      temperature: entry.main?.temp ?? null,
      feelsLike: entry.main?.feels_like ?? null,
      humidity: entry.main?.humidity ?? null,
      windSpeed: entry.wind?.speed ?? null,
      condition: weather.main || 'Unknown',
      description: weather.description || 'No description',
      icon: weather.icon ? `https://openweathermap.org/img/wn/${weather.icon}@2x.png` : null,
      pop: entry.pop ?? null,
    };
  });

  return {
    location: {
      name: data.city?.name || 'Unknown location',
      country: data.city?.country || '',
      latitude: data.city?.coord?.lat ?? null,
      longitude: data.city?.coord?.lon ?? null,
    },
    entries,
  };
}

async function getCurrentWeatherByCoords(lat, lng, units = 'metric') {
  const parsedUnits = parseUnits(units);
  const key = buildCacheKey('current', lat, lng, parsedUnits);
  const cached = getCached(key);
  if (cached) return { source: 'cache', weather: cached.weather };

  const data = await fetchOpenWeather('/weather', {
    lat: String(lat),
    lon: String(lng),
    units: parsedUnits,
  });
  const payload = { weather: toCurrentWeatherJSON(data) };
  setCached(key, payload, CURRENT_TTL_MS);
  return { source: 'live', weather: payload.weather };
}

async function getForecastWeatherByCoords(lat, lng, units = 'metric') {
  const parsedUnits = parseUnits(units);
  const key = buildCacheKey('forecast', lat, lng, parsedUnits);
  const cached = getCached(key);
  if (cached) return { source: 'cache', forecast: cached.forecast };

  const data = await fetchOpenWeather('/forecast', {
    lat: String(lat),
    lon: String(lng),
    units: parsedUnits,
  });
  const payload = { forecast: toForecastJSON(data) };
  setCached(key, payload, FORECAST_TTL_MS);
  return { source: 'live', forecast: payload.forecast };
}

module.exports = {
  parseUnits,
  getCurrentWeatherByCoords,
  getForecastWeatherByCoords,
};
