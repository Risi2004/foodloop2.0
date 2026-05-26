import { calculateDistance, formatDistance } from './distance';

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
  };
}

export function isPickupWithinDriverRadius(pickup, driverLat, driverLng) {
  if (driverLat == null || driverLng == null) return false;
  const donorLat = pickup?.donorLatitude;
  const donorLng = pickup?.donorLongitude;
  if (donorLat == null || donorLng == null) return false;
  const km = calculateDistance(driverLat, driverLng, donorLat, donorLng);
  return km != null && km <= MAX_DRIVER_RADIUS_KM;
}
