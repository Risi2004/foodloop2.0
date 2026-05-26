function getDonorDisplayName(donor) {
  if (!donor) return 'Donor';
  const role = (donor.role || '').toLowerCase();
  if (['restaurant', 'supermarket', 'business', 'individual'].includes(role)) {
    return donor.businessName?.trim() || donor.username?.trim() || 'Business';
  }
  if (role === 'donor') {
    return donor.username?.trim() || donor.businessName?.trim() || 'Donor';
  }
  return donor.businessName?.trim() || donor.username?.trim() || 'Donor';
}

function isReceiverRole(role) {
  return (role || '').toLowerCase() === 'receiver';
}

function getReceiverDisplayName(receiver) {
  if (!receiver) return 'Receiver';
  return receiver.receiverName?.trim() || receiver.username?.trim() || receiver.email || 'Receiver';
}

const {
  calculateDistanceKm,
  formatDistanceKm,
  DRIVER_EARNINGS_LKR,
} = require('./distance');

function isDriverRole(role) {
  return (role || '').toLowerCase() === 'driver';
}

function getDriverDisplayName(driver) {
  if (!driver) return 'Driver';
  return driver.driverName?.trim() || driver.username?.trim() || driver.email || 'Driver';
}

function formatExpiryText(userProvidedExpiryDate) {
  if (!userProvidedExpiryDate) return 'Expiry unknown';
  const parsed = new Date(userProvidedExpiryDate);
  if (Number.isNaN(parsed.getTime())) return 'Expiry unknown';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Expired';
  if (diffDays === 0) return 'Expires today';
  if (diffDays === 1) return 'Expires in 1 day';
  return `Expires in ${diffDays} days`;
}

function buildRouteDistances(donation, driverLat, driverLng) {
  const donorLat = donation.donorLatitude;
  const donorLng = donation.donorLongitude;
  const receiverLat = donation.receiverLatitude;
  const receiverLng = donation.receiverLongitude;

  const driverToDonorKm =
    driverLat != null && driverLng != null
      ? calculateDistanceKm(driverLat, driverLng, donorLat, donorLng)
      : null;
  const donorToReceiverKm = calculateDistanceKm(
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
    driverToDonorKm,
    donorToReceiverKm,
    totalRouteKm,
    driverToDonorDistanceFormatted: formatDistanceKm(driverToDonorKm),
    donorToReceiverDistanceFormatted: formatDistanceKm(donorToReceiverKm),
    totalRouteDistanceFormatted: formatDistanceKm(totalRouteKm),
  };
}

function mapStatusForDriverUi(status) {
  if (status === 'driver_assigned') return 'assigned';
  return status;
}

function toDriverPickupJSON(donation, driverLat, driverLng) {
  const base = donation.toPublicJSON();
  const donor = donation.donorId && typeof donation.donorId === 'object' ? donation.donorId : null;
  const receiver =
    donation.receiverId && typeof donation.receiverId === 'object' ? donation.receiverId : null;
  const priceLabel = formatListingPriceLabel(donation);
  const distances = buildRouteDistances(donation, driverLat, driverLng);

  return {
    ...base,
    donorName: getDonorDisplayName(donor),
    receiverName: getReceiverDisplayName(receiver),
    priceLabel,
    isPaidListing: !!priceLabel,
    earnings: DRIVER_EARNINGS_LKR,
    expiryText: formatExpiryText(donation.userProvidedExpiryDate),
    ...distances,
  };
}

function userCanViewTracking(donation, userId) {
  if (!donation || !userId) return false;
  const uid = userId.toString();
  const donorId =
    donation.donorId?._id?.toString?.() || donation.donorId?.toString?.() || donation.donorId;
  const receiverId =
    donation.receiverId?._id?.toString?.() || donation.receiverId?.toString?.() || donation.receiverId;
  const driverId =
    donation.driverId?._id?.toString?.() || donation.driverId?.toString?.() || donation.driverId;
  return donorId === uid || receiverId === uid || driverId === uid;
}

function toTrackingJSON(donation) {
  const base = donation.toPublicJSON();
  const donor = donation.donorId && typeof donation.donorId === 'object' ? donation.donorId : null;
  const receiver =
    donation.receiverId && typeof donation.receiverId === 'object' ? donation.receiverId : null;
  const driver =
    donation.driverId && typeof donation.driverId === 'object' ? donation.driverId : null;

  const driverLocation =
    driver?.driverLatitude != null && driver?.driverLongitude != null
      ? { latitude: driver.driverLatitude, longitude: driver.driverLongitude }
      : null;

  return {
    donation: {
      ...base,
      status: mapStatusForDriverUi(donation.status),
    },
    donor: {
      name: getDonorDisplayName(donor),
      contactNo: donor?.contactNo || null,
      email: donor?.email || null,
      address: donation.pickupAddress || null,
      location: {
        latitude: donation.donorLatitude,
        longitude: donation.donorLongitude,
      },
    },
    receiver: donation.receiverLatitude != null
      ? {
          name: getReceiverDisplayName(receiver),
          contactNo: receiver?.contactNo || null,
          email: receiver?.email || null,
          address: donation.receiverAddress || null,
          location: {
            latitude: donation.receiverLatitude,
            longitude: donation.receiverLongitude,
          },
        }
      : null,
    driver: driver
      ? {
          name: getDriverDisplayName(driver),
          vehicleType: driver.vehicleType || null,
          vehicleNumber: driver.vehicleNumber || null,
          contactNo: driver.contactNo || null,
          email: driver.email || null,
          location: driverLocation,
        }
      : null,
    actualPickupDate: donation.pickedUpAt || null,
    deliveryDate: donation.deliveredAt || null,
  };
}

function toDriverActiveDeliveryJSON(donation, driverLat, driverLng) {
  const pickup = toDriverPickupJSON(donation, driverLat, driverLng);
  return {
    ...pickup,
    status: mapStatusForDriverUi(donation.status),
    assignedDriverId: donation.driverId?.toString?.() || donation.driverId || null,
    driverName: getDriverDisplayName(
      donation.driverId && typeof donation.driverId === 'object' ? donation.driverId : null
    ),
  };
}

function isWithinSriLanka(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  return la >= 5 && la <= 10 && ln >= 79 && ln <= 82;
}

function formatListingPriceLabel(donation) {
  if ((donation.listingType || '').toLowerCase() !== 'sell') return null;
  const amount = Number(donation.priceAmount);
  if (Number.isNaN(amount) || amount <= 0) return null;
  const currency = donation.priceCurrency || 'LKR';
  return `${currency} ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function toClaimJSON(donation) {
  const base = donation.toPublicJSON();
  const donor = donation.donorId && typeof donation.donorId === 'object' ? donation.donorId : null;
  const receiver =
    donation.receiverId && typeof donation.receiverId === 'object' ? donation.receiverId : null;
  const priceLabel = formatListingPriceLabel(donation);

  return {
    ...base,
    donorName: getDonorDisplayName(donor),
    receiverName: getReceiverDisplayName(receiver),
    priceLabel,
    isPaidListing: !!priceLabel,
  };
}

function toAvailableDonationJSON(donation, distanceKm) {
  const base = donation.toPublicJSON();
  const lat = donation.donorLatitude;
  const lng = donation.donorLongitude;
  const donor = donation.donorId && typeof donation.donorId === 'object' ? donation.donorId : null;

  const priceLabel = formatListingPriceLabel(donation);

  return {
    ...base,
    position: [lat, lng],
    distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
    donorName: getDonorDisplayName(donor),
    donorType: donor?.role || null,
    priceLabel,
    isPaidListing: !!priceLabel,
  };
}

module.exports = {
  getDonorDisplayName,
  getReceiverDisplayName,
  getDriverDisplayName,
  isReceiverRole,
  isDriverRole,
  isWithinSriLanka,
  formatListingPriceLabel,
  buildRouteDistances,
  mapStatusForDriverUi,
  toAvailableDonationJSON,
  toClaimJSON,
  toDriverPickupJSON,
  toDriverActiveDeliveryJSON,
  toTrackingJSON,
  userCanViewTracking,
};
