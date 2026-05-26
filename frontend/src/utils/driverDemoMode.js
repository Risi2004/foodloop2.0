/**
 * Shared helpers for driver pickup / delivery demo simulation.
 */

export function isValidCoord(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln);
}

/** ~1.5 km south of a point (demo start when driver GPS is unset). */
export function offsetStartSouth(lat, lng, km = 1.5) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return { lat: la - km / 111, lng: ln };
}

/**
 * @param {'pickup' | 'delivery'} leg
 * @param {object} tracking
 * @param {[number, number] | null} driverLocationState [lat, lng]
 */
export async function resolveDemoEndpoints(leg, tracking, driverLocationState) {
  const donor = tracking?.donor?.location;
  const receiver = tracking?.receiver?.location;
  const driver = tracking?.driver?.location;

  const end =
    leg === 'pickup'
      ? donor && isValidCoord(donor.latitude, donor.longitude)
        ? { lat: Number(donor.latitude), lng: Number(donor.longitude) }
        : null
      : receiver && isValidCoord(receiver.latitude, receiver.longitude)
        ? { lat: Number(receiver.latitude), lng: Number(receiver.longitude) }
        : null;

  if (!end) {
    return { start: null, end: null, error: leg === 'pickup' ? 'Donor location is missing.' : 'Receiver location is missing.' };
  }

  let start = null;

  if (driverLocationState?.length === 2 && isValidCoord(driverLocationState[0], driverLocationState[1])) {
    start = { lat: Number(driverLocationState[0]), lng: Number(driverLocationState[1]) };
  } else if (driver && isValidCoord(driver.latitude, driver.longitude)) {
    start = { lat: Number(driver.latitude), lng: Number(driver.longitude) };
  } else if (leg === 'delivery' && donor && isValidCoord(donor.latitude, donor.longitude)) {
    start = { lat: Number(donor.latitude), lng: Number(donor.longitude) };
  } else if (leg === 'pickup' && donor && isValidCoord(donor.latitude, donor.longitude)) {
    start = offsetStartSouth(donor.latitude, donor.longitude);
  }

  if (!start) {
    try {
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (p) =>
            resolve({
              lat: p.coords.latitude,
              lng: p.coords.longitude,
            }),
          reject,
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      });
      if (isValidCoord(position.lat, position.lng)) {
        start = position;
      }
    } catch {
      // fall through
    }
  }

  if (!start) {
    return {
      start: null,
      end,
      error:
        leg === 'pickup'
          ? 'Set your location on the Delivery page, or allow browser location access.'
          : 'Set your location or confirm pickup first.',
    };
  }

  return { start, end, error: null };
}
