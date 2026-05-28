/**
 * Shared helpers for driver pickup / delivery demo simulation.
 */

export function isValidCoord(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln);
}

function toCoordOrNull(lat, lng) {
  if (!isValidCoord(lat, lng)) return null;
  return { lat: Number(lat), lng: Number(lng) };
}

function extractDonorCoord(tracking) {
  const donorLoc = tracking?.donor?.location;
  if (donorLoc) {
    const fromDonorObj = toCoordOrNull(donorLoc.latitude, donorLoc.longitude);
    if (fromDonorObj) return fromDonorObj;
  }

  const donation = tracking?.donation;
  const fromDonation = toCoordOrNull(donation?.donorLatitude, donation?.donorLongitude);
  if (fromDonation) return fromDonation;

  return null;
}

function extractReceiverCoord(tracking) {
  const receiverLoc = tracking?.receiver?.location;
  if (receiverLoc) {
    const fromReceiverObj = toCoordOrNull(receiverLoc.latitude, receiverLoc.longitude);
    if (fromReceiverObj) return fromReceiverObj;
  }

  const donation = tracking?.donation;
  const fromDonation = toCoordOrNull(donation?.receiverLatitude, donation?.receiverLongitude);
  if (fromDonation) return fromDonation;

  return null;
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
  const donorCoord = extractDonorCoord(tracking);
  const receiverCoord = extractReceiverCoord(tracking);
  const driver = tracking?.driver?.location;
  const syntheticReceiver = donorCoord ? offsetStartSouth(donorCoord.lat, donorCoord.lng, 2) : null;

  const end =
    leg === 'pickup'
      ? donorCoord || receiverCoord
      : receiverCoord || syntheticReceiver || donorCoord;

  if (!end) {
    return { start: null, end: null, error: leg === 'pickup' ? 'Donor location is missing.' : 'Receiver location is missing.' };
  }

  let start = null;

  // After pickup: driver is at the donor, then heads to the receiver.
  if (leg === 'delivery' && donorCoord) {
    start = donorCoord;
  } else if (driverLocationState?.length === 2 && isValidCoord(driverLocationState[0], driverLocationState[1])) {
    start = { lat: Number(driverLocationState[0]), lng: Number(driverLocationState[1]) };
  } else if (driver && isValidCoord(driver.latitude, driver.longitude)) {
    start = { lat: Number(driver.latitude), lng: Number(driver.longitude) };
  } else if (leg === 'pickup' && end) {
    start = offsetStartSouth(end.lat, end.lng);
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
