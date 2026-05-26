import { calculateDistance, formatDistance } from './distance';
import { getRoute, getRouteMatrix, applyTrafficModel, formatEta } from '../services/routingService';

export const MAX_DRIVER_RADIUS_KM = 40;

export function computeRouteDistances(pickup, driverLat, driverLng) {
  if (!pickup) return pickup;

  const donorLat = pickup.donorLatitude;
  const donorLng = pickup.donorLongitude;
  const receiverLat = pickup.receiverLatitude;
  const receiverLng = pickup.receiverLongitude;

  if (
    driverLat == null ||
    driverLng == null ||
    donorLat == null ||
    donorLng == null ||
    receiverLat == null ||
    receiverLng == null
  ) {
    return pickup;
  }

  const driverToDonorKm = calculateDistance(
    driverLat,
    driverLng,
    donorLat,
    donorLng
  );
  const donorToReceiverKm = calculateDistance(
    donorLat,
    donorLng,
    receiverLat,
    receiverLng
  );
  const totalRouteKm =
    driverToDonorKm != null && donorToReceiverKm != null
      ? driverToDonorKm + donorToReceiverKm
      : null;

  return {
    ...pickup,
    driverToDonorKm,
    donorToReceiverKm,
    totalRouteKm,
    driverToDonorDistanceFormatted: formatDistance(driverToDonorKm),
    donorToReceiverDistanceFormatted: formatDistance(donorToReceiverKm),
    totalRouteDistanceFormatted: formatDistance(totalRouteKm),
    roadRoute: false,
  };
}

/**
 * Enrich pickup with OSRM road distances and adjusted ETAs (falls back to Haversine).
 */
export async function computeRoadRouteDistances(pickup, driverLat, driverLng) {
  const base = computeRouteDistances(pickup, driverLat, driverLng);
  if (!base?.donorLatitude) return base;

  try {
    const from = { latitude: driverLat, longitude: driverLng };
    const donor = { latitude: base.donorLatitude, longitude: base.donorLongitude };
    const receiver = {
      latitude: base.receiverLatitude,
      longitude: base.receiverLongitude,
    };

    const [leg1, leg2] = await Promise.all([
      getRoute(from, donor, { alternatives: 0 }),
      getRoute(donor, receiver, { alternatives: 0 }),
    ]);

    const t1 = leg1.traffic || applyTrafficModel(leg1.route.durationSec);
    const t2 = leg2.traffic || applyTrafficModel(leg2.route.durationSec);
    const totalAdjustedSec = t1.adjustedSec + t2.adjustedSec;

    const driverToDonorKm = (leg1.route.distanceM || 0) / 1000;
    const donorToReceiverKm = (leg2.route.distanceM || 0) / 1000;
    const totalRouteKm = driverToDonorKm + donorToReceiverKm;

    return {
      ...base,
      roadRoute: true,
      approximateRoute: leg1.approximate || leg2.approximate,
      driverToDonorKm,
      donorToReceiverKm,
      totalRouteKm,
      driverToDonorDistanceFormatted: formatDistance(driverToDonorKm),
      donorToReceiverDistanceFormatted: formatDistance(donorToReceiverKm),
      totalRouteDistanceFormatted: formatDistance(totalRouteKm),
      etaToDonorSec: t1.adjustedSec,
      etaToDonorFormatted: formatEta(t1.adjustedSec),
      totalEtaSec: totalAdjustedSec,
      totalEtaFormatted: formatEta(totalAdjustedSec),
      trafficLabel: t1.label,
    };
  } catch (err) {
    console.warn('[driverRoute] road routing failed:', err.message);
    return { ...base, approximateRoute: true };
  }
}

/**
 * Rank pickups by road duration (driver → donor) using OSRM Table API.
 */
export async function enrichPickupsWithRoadEta(pickups, driverLat, driverLng) {
  if (!pickups?.length || driverLat == null || driverLng == null) {
    return pickups || [];
  }

  const withDonor = pickups.filter(
    (p) => p.donorLatitude != null && p.donorLongitude != null
  );
  if (withDonor.length === 0) return pickups;

  const sources = [{ latitude: driverLat, longitude: driverLng }];
  const destinations = withDonor.map((p) => ({
    latitude: p.donorLatitude,
    longitude: p.donorLongitude,
  }));

  const matrix = await getRouteMatrix(sources, destinations);
  const durationRow = matrix?.durations?.[0];

  const enriched = pickups.map((p) => {
    const idx = withDonor.findIndex((w) => w.id === p.id);
    if (idx < 0 || !durationRow || durationRow[idx] == null) {
      return computeRouteDistances(p, driverLat, driverLng);
    }

    const baseSec = durationRow[idx];
    const traffic = applyTrafficModel(baseSec);
    const distM = matrix.distances?.[0]?.[idx];
    const km = distM != null ? distM / 1000 : null;

    const donorToReceiverKm = calculateDistance(
      p.donorLatitude,
      p.donorLongitude,
      p.receiverLatitude,
      p.receiverLongitude
    );
    const leg2Sec =
      donorToReceiverKm != null ? (donorToReceiverKm / 30) * 3600 : 0;
    const totalAdjusted = traffic.adjustedSec + applyTrafficModel(leg2Sec).adjustedSec;

    return {
      ...p,
      roadRoute: true,
      driverToDonorKm: km,
      driverToDonorDistanceFormatted: formatDistance(km),
      etaToDonorSec: traffic.adjustedSec,
      etaToDonorFormatted: formatEta(traffic.adjustedSec),
      totalEtaSec: totalAdjusted,
      totalEtaFormatted: formatEta(totalAdjusted),
      totalRouteKm: km != null && donorToReceiverKm != null ? km + donorToReceiverKm : p.totalRouteKm,
      totalRouteDistanceFormatted: formatDistance(
        km != null && donorToReceiverKm != null ? km + donorToReceiverKm : null
      ),
      trafficLabel: traffic.label,
    };
  });

  return enriched.sort((a, b) => {
    const ea = a.totalEtaSec ?? Infinity;
    const eb = b.totalEtaSec ?? Infinity;
    return ea - eb;
  });
}

export function isPickupWithinDriverRadius(pickup, driverLat, driverLng) {
  if (driverLat == null || driverLng == null) return false;
  const donorLat = pickup?.donorLatitude;
  const donorLng = pickup?.donorLongitude;
  if (donorLat == null || donorLng == null) return false;
  const km = calculateDistance(driverLat, driverLng, donorLat, donorLng);
  return km != null && km <= MAX_DRIVER_RADIUS_KM;
}
