import { getUser } from './auth';
import { geocodeAddress, isWithinSriLanka } from '../services/geocodingService';

const COLOMBO_FALLBACK = { lat: 6.9271, lng: 79.8612, source: 'fallback_colombo' };
const LAST_COORDS_KEY = 'foodloop_weather_last_coords';
const ADDRESS_COORDS_KEY = 'foodloop_weather_address_coords';

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function saveLastCoords(lat, lng) {
  if (!isWithinSriLanka(lat, lng)) return;
  try {
    localStorage.setItem(LAST_COORDS_KEY, JSON.stringify({ lat, lng, ts: Date.now() }));
  } catch {
    // Ignore localStorage issues
  }
}

function getLastCoords() {
  try {
    const raw = localStorage.getItem(LAST_COORDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const lat = asNumber(parsed?.lat);
    const lng = asNumber(parsed?.lng);
    if (lat == null || lng == null || !isWithinSriLanka(lat, lng)) return null;
    return { lat, lng, source: 'last_known' };
  } catch {
    return null;
  }
}

function getUserCoords() {
  const user = getUser();
  if (!user) return null;
  const candidates = [
    [user.driverLatitude, user.driverLongitude],
    [user.receiverLatitude, user.receiverLongitude],
    [user.latitude, user.longitude],
  ];

  for (const [la, ln] of candidates) {
    const lat = asNumber(la);
    const lng = asNumber(ln);
    if (lat != null && lng != null && isWithinSriLanka(lat, lng)) {
      return { lat, lng, source: 'user_profile' };
    }
  }
  return null;
}

function readAddressCache(address) {
  if (!address) return null;
  try {
    const raw = localStorage.getItem(ADDRESS_COORDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (String(parsed?.address || '').toLowerCase() !== String(address).toLowerCase()) return null;
    const lat = asNumber(parsed?.lat);
    const lng = asNumber(parsed?.lng);
    if (lat == null || lng == null || !isWithinSriLanka(lat, lng)) return null;
    return { lat, lng, source: 'address_cache', label: parsed?.label || address };
  } catch {
    return null;
  }
}

function writeAddressCache(address, lat, lng, label) {
  if (!address || !isWithinSriLanka(lat, lng)) return;
  try {
    localStorage.setItem(
      ADDRESS_COORDS_KEY,
      JSON.stringify({
        address,
        lat,
        lng,
        label: label || address,
        ts: Date.now(),
      })
    );
  } catch {
    // Ignore localStorage issues
  }
}

function getGeoPosition(timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: 'browser_geolocation',
        }),
      reject,
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 120000 }
    );
  });
}

export async function resolveWeatherLocation() {
  const user = getUser();
  const fromUser = getUserCoords();
  if (fromUser) {
    saveLastCoords(fromUser.lat, fromUser.lng);
    return fromUser;
  }

  const address = String(user?.address || '').trim();
  if (address) {
    const cachedByAddress = readAddressCache(address);
    if (cachedByAddress) {
      saveLastCoords(cachedByAddress.lat, cachedByAddress.lng);
      return cachedByAddress;
    }

    const geocoded = await geocodeAddress(`${address}, Sri Lanka`).catch(() => null);
    if (geocoded && isWithinSriLanka(geocoded.lat, geocoded.lng)) {
      writeAddressCache(address, geocoded.lat, geocoded.lng, geocoded.displayName);
      saveLastCoords(geocoded.lat, geocoded.lng);
      return {
        lat: geocoded.lat,
        lng: geocoded.lng,
        source: 'signup_address',
        label: geocoded.displayName || address,
      };
    }
  }

  try {
    const fromGeo = await getGeoPosition();
    if (!isWithinSriLanka(fromGeo.lat, fromGeo.lng)) {
      throw new Error('Geolocation outside Sri Lanka');
    }
    saveLastCoords(fromGeo.lat, fromGeo.lng);
    return fromGeo;
  } catch {
    const last = getLastCoords();
    if (last) return last;
    return { ...COLOMBO_FALLBACK, label: 'Colombo, Sri Lanka' };
  }
}
