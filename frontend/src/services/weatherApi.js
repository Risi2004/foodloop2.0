import { buildUrl, parseResponse } from './api';
import { getAuthHeaders } from '../utils/auth';

const CURRENT_TTL_MS = 10 * 60 * 1000;
const FORECAST_TTL_MS = 30 * 60 * 1000;

function key(prefix, lat, lng, units) {
  return `weather:${prefix}:${Number(lat).toFixed(3)}:${Number(lng).toFixed(3)}:${units}`;
}

function readCache(cacheKey) {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.expiresAt || Date.now() > parsed.expiresAt) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    return parsed.data || null;
  } catch {
    return null;
  }
}

function writeCache(cacheKey, data, ttlMs) {
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        data,
        expiresAt: Date.now() + ttlMs,
      })
    );
  } catch {
    // Ignore storage quota/private mode errors
  }
}

async function fetchWeather(path) {
  const response = await fetch(buildUrl(path), {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
}

export async function getCurrentWeather(lat, lng, units = 'metric', forceRefresh = false) {
  const cacheKey = key('current', lat, lng, units);
  if (!forceRefresh) {
    const cached = readCache(cacheKey);
    if (cached) return { ...cached, source: 'cache' };
  }

  const data = await fetchWeather(`/api/weather/current?lat=${lat}&lng=${lng}&units=${units}`);
  writeCache(cacheKey, data, CURRENT_TTL_MS);
  return data;
}

export async function getForecastWeather(lat, lng, units = 'metric', forceRefresh = false) {
  const cacheKey = key('forecast', lat, lng, units);
  if (!forceRefresh) {
    const cached = readCache(cacheKey);
    if (cached) return { ...cached, source: 'cache' };
  }

  const data = await fetchWeather(`/api/weather/forecast?lat=${lat}&lng=${lng}&units=${units}`);
  writeCache(cacheKey, data, FORECAST_TTL_MS);
  return data;
}
