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
const { resolveDonationDriverEarnings } = require('./deliveryPricing');

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
  const locations = resolveDonationLocationFields(donation);

  const distances = buildRouteDistances(
    {
      donorLatitude: locations.donorLatitude ?? donation.donorLatitude,
      donorLongitude: locations.donorLongitude ?? donation.donorLongitude,
      receiverLatitude: locations.receiverLatitude ?? donation.receiverLatitude,
      receiverLongitude: locations.receiverLongitude ?? donation.receiverLongitude,
    },
    driverLat,
    driverLng
  );
  const donorName = getDonorDisplayName(donor);
  const receiverName = getReceiverDisplayName(receiver);
  const hasReceiverLocation =
    locations.receiverLatitude != null && locations.receiverLongitude != null;

  return {
    ...base,
    pickupAddress: locations.pickupAddress ?? base.pickupAddress,
    donorAddress: locations.donorAddress ?? base.donorAddress,
    donorLatitude: locations.donorLatitude ?? base.donorLatitude,
    donorLongitude: locations.donorLongitude ?? base.donorLongitude,
    receiverAddress: locations.receiverAddress ?? base.receiverAddress,
    receiverLatitude: locations.receiverLatitude ?? base.receiverLatitude,
    receiverLongitude: locations.receiverLongitude ?? base.receiverLongitude,
    donorName,
    receiverName,
    priceLabel,
    isPaidListing: !!priceLabel,
    earnings: resolveDonationDriverEarnings(donation, DRIVER_EARNINGS_LKR),
    deliveryFee: resolveDonationDriverEarnings(donation, DRIVER_EARNINGS_LKR),
    expiryText: formatExpiryText(donation.userProvidedExpiryDate),
    donor: {
      name: donorName,
      contactNo: donor?.contactNo || null,
      email: donor?.email || null,
      address: locations.pickupAddress,
      location:
        locations.donorLatitude != null && locations.donorLongitude != null
          ? { latitude: locations.donorLatitude, longitude: locations.donorLongitude }
          : null,
    },
    receiver: hasReceiverLocation
      ? {
          name: receiverName,
          contactNo: receiver?.contactNo || null,
          email: receiver?.email || null,
          address: locations.receiverAddress,
          location: {
            latitude: locations.receiverLatitude,
            longitude: locations.receiverLongitude,
          },
        }
      : null,
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

function resolveParentListingJson(donation) {
  const parent = donation?.parentListingId;
  if (parent && typeof parent === 'object' && typeof parent.toPublicJSON === 'function') {
    return parent.toPublicJSON();
  }
  return null;
}

/** Supplier/receiver coords + address with parent-listing fallback for partial claim children. */
function resolveDonationLocationFields(donation) {
  const parentJson = resolveParentListingJson(donation);

  const pickupAddress =
    (donation.pickupAddress && String(donation.pickupAddress).trim()) ||
    (parentJson?.pickupAddress && String(parentJson.pickupAddress).trim()) ||
    (parentJson?.donorAddress && String(parentJson.donorAddress).trim()) ||
    null;

  const donorLatitude =
    donation.donorLatitude != null ? donation.donorLatitude : parentJson?.donorLatitude ?? null;
  const donorLongitude =
    donation.donorLongitude != null ? donation.donorLongitude : parentJson?.donorLongitude ?? null;

  const receiverAddress =
    donation.receiverAddress && String(donation.receiverAddress).trim()
      ? String(donation.receiverAddress).trim()
      : null;
  const receiverLatitude = donation.receiverLatitude ?? null;
  const receiverLongitude = donation.receiverLongitude ?? null;

  return {
    pickupAddress,
    donorAddress: pickupAddress,
    donorLatitude,
    donorLongitude,
    receiverAddress,
    receiverLatitude,
    receiverLongitude,
  };
}

function toTrackingJSON(donation) {
  const base = donation.toPublicJSON();
  const donor = donation.donorId && typeof donation.donorId === 'object' ? donation.donorId : null;
  const receiver =
    donation.receiverId && typeof donation.receiverId === 'object' ? donation.receiverId : null;
  const driver =
    donation.driverId && typeof donation.driverId === 'object' ? donation.driverId : null;

  const locations = resolveDonationLocationFields(donation);

  const driverLocation =
    driver?.driverLatitude != null && driver?.driverLongitude != null
      ? { latitude: driver.driverLatitude, longitude: driver.driverLongitude }
      : null;

  const hasReceiverLocation =
    locations.receiverLatitude != null && locations.receiverLongitude != null;

  return {
    donation: {
      ...base,
      status: mapStatusForDriverUi(donation.status),
      pickupAddress: locations.pickupAddress ?? base.pickupAddress,
      donorAddress: locations.donorAddress ?? base.donorAddress,
      donorLatitude: locations.donorLatitude ?? base.donorLatitude,
      donorLongitude: locations.donorLongitude ?? base.donorLongitude,
      receiverAddress: locations.receiverAddress ?? base.receiverAddress,
      receiverLatitude: locations.receiverLatitude ?? base.receiverLatitude,
      receiverLongitude: locations.receiverLongitude ?? base.receiverLongitude,
    },
    donor: {
      name: getDonorDisplayName(donor),
      contactNo: donor?.contactNo || null,
      email: donor?.email || null,
      address: locations.pickupAddress,
      location:
        locations.donorLatitude != null && locations.donorLongitude != null
          ? {
              latitude: locations.donorLatitude,
              longitude: locations.donorLongitude,
            }
          : null,
    },
    receiver: hasReceiverLocation
      ? {
          name: getReceiverDisplayName(receiver),
          contactNo: receiver?.contactNo || null,
          email: receiver?.email || null,
          address: locations.receiverAddress,
          location: {
            latitude: locations.receiverLatitude,
            longitude: locations.receiverLongitude,
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

const CLAIM_PARENT_FALLBACK_FIELDS = [
  'foodCategory',
  'itemName',
  'storageRecommendation',
  'imageUrl',
  'userProvidedExpiryDate',
  'pickupAddress',
  'donorLatitude',
  'donorLongitude',
  'productType',
  'expiryDateFromPackage',
  'listingType',
  'priceAmount',
  'priceCurrency',
  'aiConfidence',
  'aiQualityScore',
  'aiFreshness',
  'aiDetectedItems',
];

function enrichClaimFromParent(donation) {
  const claim = toClaimJSON(donation);
  const parent = donation.parentListingId;
  if (!parent || typeof parent !== 'object' || typeof parent.toPublicJSON !== 'function') {
    return claim;
  }

  const parentJson = parent.toPublicJSON();
  for (const field of CLAIM_PARENT_FALLBACK_FIELDS) {
    const claimValue = claim[field];
    const parentValue = parentJson[field];
    if (
      (claimValue == null || claimValue === '' || (Array.isArray(claimValue) && claimValue.length === 0)) &&
      parentValue != null &&
      parentValue !== ''
    ) {
      claim[field] = parentValue;
    }
  }

  if (!claim.expiryDate && parentJson.expiryDate) {
    claim.expiryDate = parentJson.expiryDate;
  }
  if (!claim.donorAddress && parentJson.donorAddress) {
    claim.donorAddress = parentJson.donorAddress;
  }

  return claim;
}

function toAvailableDonationJSON(donation, distanceKm, options = {}) {
  const base = donation.toPublicJSON();
  const lat = donation.donorLatitude;
  const lng = donation.donorLongitude;
  const donor = donation.donorId && typeof donation.donorId === 'object' ? donation.donorId : null;
  const donorId =
    donor?._id?.toString?.() ||
    donation.donorId?.toString?.() ||
    null;

  const priceLabel = formatListingPriceLabel(donation);
  let donorIsPremium = false;
  if (typeof options.donorIsPremium === 'boolean') {
    donorIsPremium = options.donorIsPremium;
  } else if (options.premiumSupplierIds && donorId) {
    donorIsPremium = options.premiumSupplierIds.has(donorId);
  }

  return {
    ...base,
    position: [lat, lng],
    distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
    donorName: getDonorDisplayName(donor),
    donorType: donor?.role || null,
    donorIsPremium,
    priceLabel,
    isPaidListing: !!priceLabel,
  };
}

function indexChildClaimsByParent(donations) {
  const map = new Map();
  for (const donation of donations) {
    if (!donation.parentListingId) continue;
    const parentId =
      donation.parentListingId._id?.toString?.() ||
      donation.parentListingId?.toString?.() ||
      String(donation.parentListingId);
    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId).push(donation);
  }
  return map;
}

function enrichParentListingForDonor(donation, childrenByParent) {
  const base = donation.toPublicJSON();
  const parentId = base.id || donation._id?.toString?.();
  const children = childrenByParent.get(String(parentId)) || [];
  const activeChildren = children.filter((c) => !['cancelled', 'delivered'].includes(c.status));
  const claimedServings = activeChildren.reduce((sum, c) => sum + (c.quantity || 0), 0);
  const remainingQuantity = base.quantity || 0;
  const initialQuantity = base.initialQuantity ?? remainingQuantity + claimedServings;

  let listingAvailability = 'open';
  if (base.status === 'claimed') {
    listingAvailability = 'fully_claimed';
  } else if (claimedServings > 0 && remainingQuantity > 0) {
    listingAvailability = 'partially_claimed';
  } else if (claimedServings > 0 && remainingQuantity <= 0) {
    listingAvailability = 'fully_claimed';
  }

  return {
    ...base,
    initialQuantity,
    remainingQuantity,
    claimedServings,
    activeClaimCount: activeChildren.length,
    listingAvailability,
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
  enrichClaimFromParent,
  indexChildClaimsByParent,
  enrichParentListingForDonor,
  toDriverPickupJSON,
  toDriverActiveDeliveryJSON,
  toTrackingJSON,
  userCanViewTracking,
};
