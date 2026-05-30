const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const CustomerOrder = require('../models/CustomerOrder');
const User = require('../models/User');
const {
  MAX_DRIVER_RADIUS_KM,
  calculateDistanceKm,
  isDonationExpired,
  DRIVER_EARNINGS_LKR,
} = require('../utils/distance');
const {
  isDriverRole,
  isWithinSriLanka,
  toDriverPickupJSON,
  toDriverActiveDeliveryJSON,
  toTrackingJSON,
  userCanViewTracking,
} = require('../utils/donationHelpers');
const {
  sendDonationDriverAssignedEmails,
  sendDonationPickupConfirmedEmails,
  sendDonationDeliveredEmails,
} = require('../utils/sendNotificationEmail');
const { isOrderCompatible, normalizeVehicleType } = require('../utils/driverCapacityRules');
const { creditDeliveryEarnings } = require('../services/earningsService');
const { computeFinalDeliveryFee } = require('../utils/deliveryPricing');
const {
  emitToDrivers,
  emitToDonor,
  emitToReceivers,
  emitToDonationRoom,
} = require('../socket');

const TRACKING_POPULATE = [
  { path: 'donorId', select: 'username businessName role email contactNo' },
  { path: 'receiverId', select: 'username receiverName email contactNo' },
  {
    path: 'driverId',
    select: 'username driverName email contactNo vehicleType vehicleNumber driverLatitude driverLongitude',
  },
  { path: 'parentListingId' },
];

const ACTIVE_DRIVER_STATUSES = ['driver_assigned', 'picked_up'];
const ACTIVE_CUSTOMER_ORDER_STATUSES = ['driver_assigned', 'picked_up', 'in_transit'];

/** @type {Map<string, { intervalId: NodeJS.Timeout, timeoutId: NodeJS.Timeout | null }>} */
const demoSessions = new Map();

async function syncCustomerOrderToDonationClaims(customerOrder, nextStatus, driverUser) {
  try {
    const itemIds = (customerOrder.orderSummary?.items || []).map((item) => item.id).filter(Boolean);
    if (!itemIds.length) return;

    // Find all matching child/claimed donations
    const donations = await Donation.find({
      receiverId: customerOrder.customerId,
      status: { $in: ['claimed', 'driver_assigned', 'picked_up', 'in_transit'] },
      $or: [
        { parentListingId: { $in: itemIds } },
        { _id: { $in: itemIds } }
      ]
    });

    const driverId = driverUser._id;
    const now = new Date();

    for (const donation of donations) {
      donation.status = nextStatus;
      donation.driverId = driverId;

      if (nextStatus === 'driver_assigned') {
        donation.assignedAt = now;
      } else if (nextStatus === 'picked_up') {
        donation.pickedUpAt = now;
      } else if (nextStatus === 'delivered') {
        donation.deliveredAt = now;
      }

      await donation.save();

      // Emit sockets to donor and receivers so supplier dashboard updates in real-time
      const donationIdStr = donation._id.toString();
      const donorId = donation.donorId._id?.toString?.() || donation.donorId.toString();

      await donation.populate(TRACKING_POPULATE);
      const tracking = toTrackingJSON(donation);
      const activeDeliveryPayload = toDriverActiveDeliveryJSON(donation, driverUser.driverLatitude, driverUser.driverLongitude);

      if (nextStatus === 'driver_assigned') {
        emitToDonor(donorId, 'donation:in_transit', {
          donationId: donationIdStr,
          donorId,
          donation: activeDeliveryPayload,
        });
        emitToReceivers('donation:in_transit', {
          donationId: donationIdStr,
          donation: activeDeliveryPayload,
        });
      } else if (nextStatus === 'picked_up') {
        emitToDonationRoom(donationIdStr, 'donation:picked_up', {
          donationId: donationIdStr,
          donation: tracking.donation,
        });
        emitToDonor(donorId, 'donation:picked_up', {
          donationId: donationIdStr,
          donation: tracking,
        });
        emitToReceivers('donation:picked_up', {
          donationId: donationIdStr,
          donation: tracking,
        });
      } else if (nextStatus === 'delivered') {
        emitToDonationRoom(donationIdStr, 'donation:delivered', {
          donationId: donationIdStr,
          donation: tracking.donation,
        });
        emitToDonor(donorId, 'donation:delivered', {
          donationId: donationIdStr,
          donation: tracking,
        });
        emitToReceivers('donation:delivered', {
          donationId: donationIdStr,
          donation: tracking,
        });
      }
    }
  } catch (err) {
    console.error('Error syncing customer order to donation claims:', err);
  }
}

function requireDriver(req, res) {
  if (!isDriverRole(req.user.role)) {
    res.status(403).json({ success: false, message: 'Only drivers can access this resource.' });
    return false;
  }
  return true;
}

function getDriverCoords(user, queryLat, queryLng) {
  const qLat = queryLat != null ? Number(queryLat) : null;
  const qLng = queryLng != null ? Number(queryLng) : null;
  if (!Number.isNaN(qLat) && !Number.isNaN(qLng)) {
    return { lat: qLat, lng: qLng };
  }
  if (user.driverLatitude != null && user.driverLongitude != null) {
    return { lat: user.driverLatitude, lng: user.driverLongitude };
  }
  return { lat: null, lng: null };
}

function toDriverCustomerOrderJSON(order) {
  const base = typeof order.toPublicJSON === 'function' ? order.toPublicJSON() : order;
  const customer = order.customerId && typeof order.customerId === 'object' ? order.customerId : null;
  const driver = order.driverId && typeof order.driverId === 'object' ? order.driverId : null;

  const mappedStatus = base.status === 'driver_assigned' ? 'assigned' : base.status;
  const items = Array.isArray(base.orderSummary?.items) ? base.orderSummary.items : [];
  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const firstItemName = items[0]?.name || 'Customer order';
  const title =
    items.length > 1 ? `${firstItemName} + ${items.length - 1} more item(s)` : firstItemName;

  return {
    id: base._id?.toString?.() || base.id,
    _id: base._id?.toString?.() || base.id,
    sourceType: 'customer_order',
    orderId: base.orderId,
    itemName: title,
    quantity: totalQty,
    donorName: 'FoodLoop Customer',
    receiverName: customer?.username || customer?.email || 'Customer',
    receiverAddress: base.customerAddress || base.orderSummary?.address || '',
    receiverLatitude: base.customerLatitude ?? null,
    receiverLongitude: base.customerLongitude ?? null,
    status: mappedStatus,
    paymentMethod: base.paymentMethod || 'card',
    codAmount: Number(base.codAmount || 0),
    currency: base.currency || 'LKR',
    totalAmount: Number(base.orderSummary?.total || 0),
    deliveryFee: Number(base.orderSummary?.deliveryFee || 0),
    earnings: Number(base.orderSummary?.deliveryFee) > 0
      ? Number(base.orderSummary.deliveryFee)
      : DRIVER_EARNINGS_LKR,
    expiryText: 'Customer order ready for delivery',
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    assignedAt: base.assignedAt || null,
    pickedUpAt: base.pickedUpAt || null,
    deliveredAt: base.deliveredAt || null,
    driver: driver
      ? {
          name: driver.driverName || driver.username || 'Driver',
          contactNo: driver.contactNo || null,
          email: driver.email || null,
          location:
            driver.driverLatitude != null && driver.driverLongitude != null
              ? { latitude: driver.driverLatitude, longitude: driver.driverLongitude }
              : null,
        }
      : null,
    donor: {
      name: 'FoodLoop Customer',
      address: 'Online customer order',
      location: null,
    },
    receiver: {
      name: customer?.username || 'Customer',
      contactNo: customer?.contactNo || null,
      email: customer?.email || null,
      address: base.customerAddress || base.orderSummary?.address || '',
      location:
        base.customerLatitude != null && base.customerLongitude != null
          ? { latitude: base.customerLatitude, longitude: base.customerLongitude }
          : null,
    },
    donation: {
      id: base._id?.toString?.() || base.id,
      trackingId: base.orderId,
      itemName: `Customer order (${(base.orderSummary?.items || []).length} items)`,
      quantity: totalQty,
      itemCount: items.length,
      items,
      status: mappedStatus,
      sourceType: 'customer_order',
      paymentMethod: base.paymentMethod || 'card',
      codAmount: Number(base.codAmount || 0),
      currency: base.currency || 'LKR',
      totalAmount: Number(base.orderSummary?.total || 0),
    },
  };
}

function stopDemoSession(driverId) {
  const key = driverId.toString();
  const session = demoSessions.get(key);
  if (!session) return;
  clearInterval(session.intervalId);
  if (session.timeoutId) clearTimeout(session.timeoutId);
  demoSessions.delete(key);
}

async function applyDriverLocation(driverId, lat, lng) {
  if (!isWithinSriLanka(lat, lng)) {
    throw new Error('Location must be within Sri Lanka.');
  }

  const user = await User.findById(driverId);
  if (!user) {
    throw new Error('Driver not found.');
  }

  user.driverLatitude = lat;
  user.driverLongitude = lng;
  user.driverLocationUpdatedAt = new Date();
  await user.save();

  const activeDonation = await Donation.findOne({
    driverId,
    status: { $in: ACTIVE_DRIVER_STATUSES },
  });
  if (activeDonation) {
    const donationIdStr = activeDonation._id.toString();
    emitToDonationRoom(donationIdStr, 'driver:location', {
      donationId: donationIdStr,
      driverLocation: { latitude: lat, longitude: lng },
    });
  }

  return { latitude: lat, longitude: lng };
}

exports.updateLocation = async (req, res) => {
  try {
    if (!requireDriver(req, res)) return;

    const { latitude, longitude } = req.body || {};
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required.',
      });
    }

    const location = await applyDriverLocation(req.user._id, lat, lng);

    return res.json({
      success: true,
      location,
    });
  } catch (err) {
    console.error('updateLocation error:', err);
    const status = err.message?.includes('Sri Lanka') ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to update location',
    });
  }
};

exports.startDemo = async (req, res) => {
  try {
    if (!requireDriver(req, res)) return;

    const { waypoints, intervalMs = 2500 } = req.body || {};
    if (!Array.isArray(waypoints) || waypoints.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least two waypoints are required.',
      });
    }

    const parsed = waypoints.map((wp) => ({
      latitude: Number(wp.latitude),
      longitude: Number(wp.longitude),
    }));

    if (parsed.some((wp) => Number.isNaN(wp.latitude) || Number.isNaN(wp.longitude))) {
      return res.status(400).json({
        success: false,
        message: 'Each waypoint must include latitude and longitude.',
      });
    }

    const driverId = req.user._id;
    stopDemoSession(driverId);

    let index = 0;

    const tick = async () => {
      if (index >= parsed.length) {
        stopDemoSession(driverId);
        return;
      }
      const wp = parsed[index];
      index += 1;
      try {
        await applyDriverLocation(driverId, wp.latitude, wp.longitude);
      } catch (err) {
        console.error('demo tick error:', err);
        stopDemoSession(driverId);
      }
    };

    await tick();

    const intervalId = setInterval(tick, Math.max(500, Number(intervalMs) || 2500));
    demoSessions.set(driverId.toString(), { intervalId, timeoutId: null });

    return res.json({
      success: true,
      message: 'Demo started.',
      totalWaypoints: parsed.length,
    });
  } catch (err) {
    console.error('startDemo error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to start demo',
    });
  }
};

exports.stopDemo = async (req, res) => {
  try {
    if (!requireDriver(req, res)) return;
    stopDemoSession(req.user._id);
    return res.json({ success: true, message: 'Demo stopped.' });
  } catch (err) {
    console.error('stopDemo error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to stop demo',
    });
  }
};

exports.getAvailablePickups = async (req, res) => {
  try {
    if (!requireDriver(req, res)) return;

    const { lat, lng } = getDriverCoords(req.user, req.query.lat, req.query.lng);

    const driverVehicleType = normalizeVehicleType(req.user.vehicleType);
    if (lat == null || lng == null) {
      const customerOrdersNoLoc = await CustomerOrder.find({
        status: 'finding_driver',
        driverId: null,
      })
        .populate('customerId', 'username email contactNo')
        .sort({ createdAt: -1 });
      const compatibleCustomerOrders = [];
      let filteredByCapacityCount = 0;
      for (const order of customerOrdersNoLoc) {
        const capacity = isOrderCompatible(driverVehicleType, 'customer_order', order);
        if (!capacity.compatible) {
          filteredByCapacityCount += 1;
          continue;
        }
        const mapped = toDriverCustomerOrderJSON(order);
        compatibleCustomerOrders.push({
          ...mapped,
          capacity: {
            loadScore: capacity.loadScore,
            vehicleLimit: capacity.vehicleLimit,
            reason: capacity.reason,
          },
        });
      }
      return res.json({
        success: true,
        pickups: compatibleCustomerOrders,
        driverLocation: null,
        capacityFilteredCount: filteredByCapacityCount,
        driverVehicleType,
        message: 'Set your location to see nearby donation pickups. Customer orders are shown below.',
      });
    }

    const donations = await Donation.find({
      status: 'claimed',
      driverId: null,
      receiverLatitude: { $ne: null },
      receiverLongitude: { $ne: null },
    })
      .populate('donorId', 'username businessName role')
      .populate('receiverId', 'username receiverName')
      .populate('parentListingId')
      .sort({ claimedAt: -1, createdAt: -1 });

    const pickups = [];

    let capacityFilteredCount = 0;
    for (const donation of donations) {
      if (isDonationExpired(donation.userProvidedExpiryDate)) continue;

      const donorDist = calculateDistanceKm(
        lat,
        lng,
        donation.donorLatitude,
        donation.donorLongitude
      );
      if (donorDist == null || donorDist > MAX_DRIVER_RADIUS_KM) continue;

      const capacity = isOrderCompatible(driverVehicleType, 'donation', donation);
      if (!capacity.compatible) {
        capacityFilteredCount += 1;
        continue;
      }

      pickups.push({
        ...toDriverPickupJSON(donation, lat, lng),
        capacity: {
          loadScore: capacity.loadScore,
          vehicleLimit: capacity.vehicleLimit,
          reason: capacity.reason,
        },
      });
    }

    const customerOrders = await CustomerOrder.find({
      status: 'finding_driver',
      driverId: null,
    })
      .populate('customerId', 'username email contactNo')
      .sort({ createdAt: -1 });

    const customerPickups = [];
    for (const order of customerOrders) {
      const capacity = isOrderCompatible(driverVehicleType, 'customer_order', order);
      if (!capacity.compatible) {
        capacityFilteredCount += 1;
        continue;
      }
      customerPickups.push({
        ...toDriverCustomerOrderJSON(order),
        capacity: {
          loadScore: capacity.loadScore,
          vehicleLimit: capacity.vehicleLimit,
          reason: capacity.reason,
        },
      });
    }
    return res.json({
      success: true,
      pickups: [...pickups, ...customerPickups],
      driverLocation: { latitude: lat, longitude: lng },
      capacityFilteredCount,
      driverVehicleType,
    });
  } catch (err) {
    console.error('getAvailablePickups error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load pickups',
    });
  }
};

exports.getActiveDeliveries = async (req, res) => {
  try {
    if (!requireDriver(req, res)) return;

    const { lat, lng } = getDriverCoords(req.user, req.query.lat, req.query.lng);

    const donations = await Donation.find({
      driverId: req.user._id,
      status: { $in: ACTIVE_DRIVER_STATUSES },
    })
      .populate('donorId', 'username businessName role')
      .populate('receiverId', 'username receiverName')
      .populate('driverId', 'username driverName')
      .populate('parentListingId')
      .sort({ assignedAt: -1, updatedAt: -1 });

    const donationDeliveries = donations.map((d) =>
      toDriverActiveDeliveryJSON(d, lat, lng)
    );
    const customerOrders = await CustomerOrder.find({
      driverId: req.user._id,
      status: { $in: ACTIVE_CUSTOMER_ORDER_STATUSES },
    })
      .populate('customerId', 'username email contactNo')
      .populate('driverId', 'username driverName email contactNo vehicleType vehicleNumber driverLatitude driverLongitude')
      .sort({ updatedAt: -1 });
    const customerDeliveries = customerOrders.map((order) => toDriverCustomerOrderJSON(order));

    const driverLocation =
      lat != null && lng != null ? { latitude: lat, longitude: lng } : null;

    return res.json({
      success: true,
      deliveries: [...donationDeliveries, ...customerDeliveries],
      driverLocation,
    });
  } catch (err) {
    console.error('getActiveDeliveries error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load active deliveries',
    });
  }
};

exports.acceptPickup = async (req, res) => {
  try {
    if (!requireDriver(req, res)) return;

    const { donationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(donationId)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id.' });
    }

    const existingActive = await Donation.findOne({
      driverId: req.user._id,
      status: { $in: ACTIVE_DRIVER_STATUSES },
    });
    const existingCustomerOrder = await CustomerOrder.findOne({
      driverId: req.user._id,
      status: { $in: ACTIVE_CUSTOMER_ORDER_STATUSES },
    });
    if (existingActive || existingCustomerOrder) {
      return res.status(400).json({
        success: false,
        message: 'You can only have one active delivery at a time. Complete it first.',
      });
    }

    const driverVehicleType = normalizeVehicleType(req.user.vehicleType);
    const donation = await Donation.findById(donationId);
    if (!donation) {
      const customerOrder = await CustomerOrder.findById(donationId)
        .populate('customerId', 'username email contactNo')
        .populate('driverId', 'username driverName email contactNo vehicleType vehicleNumber driverLatitude driverLongitude');
      if (!customerOrder) {
        return res.status(404).json({ success: false, message: 'Pickup not found.' });
      }
      if (customerOrder.status !== 'finding_driver' || customerOrder.driverId) {
        return res.status(400).json({
          success: false,
          message: 'This customer order is no longer available.',
        });
      }
      const customerCapacity = isOrderCompatible(
        driverVehicleType,
        'customer_order',
        customerOrder
      );
      if (!customerCapacity.compatible) {
        return res.status(400).json({
          success: false,
          message: `This order is too large for your ${driverVehicleType.replace('_', ' ')}.`,
        });
      }

      customerOrder.driverId = req.user._id;
      customerOrder.status = 'driver_assigned';
      customerOrder.assignedAt = new Date();
      await customerOrder.save();
      await customerOrder.populate('customerId', 'username email contactNo');
      await customerOrder.populate(
        'driverId',
        'username driverName email contactNo vehicleType vehicleNumber driverLatitude driverLongitude'
      );

      // Sync status to child donations so supplier's dashboard updates in real-time
      await syncCustomerOrderToDonationClaims(customerOrder, 'driver_assigned', req.user);

      return res.json({
        success: true,
        donation: toDriverCustomerOrderJSON(customerOrder),
      });
    }
    if (donation.status !== 'claimed' || donation.driverId) {
      return res.status(400).json({
        success: false,
        message: 'This pickup is no longer available.',
      });
    }
    if (isDonationExpired(donation.userProvidedExpiryDate)) {
      return res.status(400).json({
        success: false,
        message: 'This donation has expired.',
      });
    }
    const donationCapacity = isOrderCompatible(driverVehicleType, 'donation', donation);
    if (!donationCapacity.compatible) {
      return res.status(400).json({
        success: false,
        message: `This order is too large for your ${driverVehicleType.replace('_', ' ')}.`,
      });
    }

    donation.driverId = req.user._id;
    donation.status = 'driver_assigned';
    donation.assignedAt = new Date();

    const finalDelivery = computeFinalDeliveryFee(donation, req.user.vehicleType);
    if (finalDelivery) {
      donation.deliveryDistanceKm = finalDelivery.deliveryDistanceKm;
      donation.deliveryFeeFinal = finalDelivery.deliveryFeeFinal;
      donation.deliveryFinalRatePerKm = finalDelivery.deliveryFinalRatePerKm;
      donation.deliveryVehicleTier = finalDelivery.deliveryVehicleTier;
      if (!donation.deliveryPayer) {
        donation.deliveryPayer = donation.listingType === 'sell' ? 'receiver' : 'platform';
      }
    }

    await donation.save();

    await donation.populate(TRACKING_POPULATE);

    const donationIdStr = donation._id.toString();
    const donorId = donation.donorId._id?.toString?.() || donation.donorId.toString();
    const driverLat = req.user.driverLatitude;
    const driverLng = req.user.driverLongitude;
    const payload = toDriverActiveDeliveryJSON(donation, driverLat, driverLng);

    emitToDrivers('donation:pickupTaken', { donationId: donationIdStr });
    emitToDonor(donorId, 'donation:in_transit', {
      donationId: donationIdStr,
      donorId,
      donation: payload,
    });
    emitToReceivers('donation:in_transit', {
      donationId: donationIdStr,
      donation: payload,
    });

    await sendDonationDriverAssignedEmails(
      donation,
      donation.donorId,
      donation.receiverId,
      donation.driverId
    );

    return res.json({
      success: true,
      donation: payload,
    });
  } catch (err) {
    console.error('acceptPickup error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to accept pickup',
    });
  }
};

async function loadDonationForTracking(donationId) {
  return Donation.findById(donationId).populate(TRACKING_POPULATE);
}

exports.getDonationTracking = async (req, res) => {
  try {
    const { donationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(donationId)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id.' });
    }

    const donation = await loadDonationForTracking(donationId);
    if (!donation) {
      const customerOrder = await CustomerOrder.findById(donationId)
        .populate('customerId', 'username email contactNo')
        .populate('driverId', 'username driverName email contactNo vehicleType vehicleNumber driverLatitude driverLongitude');
      if (!customerOrder) {
        return res.status(404).json({ success: false, message: 'Tracking item not found.' });
      }
      const customerId = customerOrder.customerId?._id?.toString?.() || customerOrder.customerId?.toString?.();
      const driverId = customerOrder.driverId?._id?.toString?.() || customerOrder.driverId?.toString?.();
      const userId = req.user._id.toString();
      if (![customerId, driverId].includes(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Not allowed to view tracking for this customer order.',
        });
      }
      return res.json({
        success: true,
        tracking: toDriverCustomerOrderJSON(customerOrder),
      });
    }
    if (!userCanViewTracking(donation, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not allowed to view tracking for this donation.',
      });
    }

    const allowedStatuses = [
      'driver_assigned',
      'picked_up',
      'in_transit',
      'delivered',
      'claimed',
    ];
    if (!allowedStatuses.includes(donation.status)) {
      return res.status(400).json({
        success: false,
        message: 'Tracking is not available for this donation status.',
      });
    }

    return res.json({
      success: true,
      tracking: toTrackingJSON(donation),
    });
  } catch (err) {
    console.error('getDonationTracking error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load tracking',
    });
  }
};

exports.confirmPickup = async (req, res) => {
  try {
    if (!requireDriver(req, res)) return;

    const { donationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(donationId)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id.' });
    }

    const donation = await Donation.findById(donationId);
    if (!donation) {
      const customerOrder = await CustomerOrder.findById(donationId)
        .populate('customerId', 'username email contactNo')
        .populate('driverId', 'username driverName email contactNo vehicleType vehicleNumber driverLatitude driverLongitude');
      if (!customerOrder) {
        return res.status(404).json({ success: false, message: 'Pickup not found.' });
      }
      if (customerOrder.driverId?._id?.toString?.() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not your assigned order.' });
      }
      if (customerOrder.status !== 'driver_assigned') {
        return res.status(400).json({
          success: false,
          message: 'Pickup can only be confirmed while heading to customer.',
        });
      }
      customerOrder.status = 'picked_up';
      customerOrder.pickedUpAt = new Date();
      await customerOrder.save();
      await customerOrder.populate('customerId', 'username email contactNo');
      await customerOrder.populate(
        'driverId',
        'username driverName email contactNo vehicleType vehicleNumber driverLatitude driverLongitude'
      );

      // Sync status to child donations so supplier's dashboard updates in real-time
      await syncCustomerOrderToDonationClaims(customerOrder, 'picked_up', req.user);

      return res.json({
        success: true,
        message: 'Pickup confirmed.',
        tracking: toDriverCustomerOrderJSON(customerOrder),
      });
    }
    if (donation.driverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your assigned delivery.' });
    }
    if (donation.status !== 'driver_assigned') {
      return res.status(400).json({
        success: false,
        message: 'Pickup can only be confirmed while en route to the donor.',
      });
    }

    donation.status = 'picked_up';
    donation.pickedUpAt = new Date();
    await donation.save();

    await donation.populate(TRACKING_POPULATE);

    const donationIdStr = donation._id.toString();
    const donorId = donation.donorId._id?.toString?.() || donation.donorId.toString();
    const tracking = toTrackingJSON(donation);

    emitToDonationRoom(donationIdStr, 'donation:picked_up', {
      donationId: donationIdStr,
      donation: tracking.donation,
    });
    emitToDonor(donorId, 'donation:picked_up', { donationId: donationIdStr, donation: tracking });
    emitToReceivers('donation:picked_up', { donationId: donationIdStr, donation: tracking });

    await sendDonationPickupConfirmedEmails(
      donation,
      donation.donorId,
      donation.receiverId,
      donation.driverId
    );

    return res.json({
      success: true,
      message: 'Pickup confirmed.',
      tracking,
    });
  } catch (err) {
    console.error('confirmPickup error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to confirm pickup',
    });
  }
};

exports.confirmDelivery = async (req, res) => {
  try {
    if (!requireDriver(req, res)) return;

    const { donationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(donationId)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id.' });
    }

    const donation = await Donation.findById(donationId);
    if (!donation) {
      const customerOrder = await CustomerOrder.findById(donationId)
        .populate('customerId', 'username email contactNo')
        .populate('driverId', 'username driverName email contactNo vehicleType vehicleNumber driverLatitude driverLongitude');
      if (!customerOrder) {
        return res.status(404).json({ success: false, message: 'Delivery item not found.' });
      }
      if (customerOrder.driverId?._id?.toString?.() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not your assigned order.' });
      }
      if (!['picked_up', 'in_transit'].includes(customerOrder.status)) {
        return res.status(400).json({
          success: false,
          message: 'Delivery can only be confirmed after pickup.',
        });
      }
      customerOrder.status = 'delivered';
      customerOrder.deliveredAt = new Date();
      await customerOrder.save();
      await customerOrder.populate('customerId', 'username email contactNo');
      await customerOrder.populate(
        'driverId',
        'username driverName email contactNo vehicleType vehicleNumber driverLatitude driverLongitude'
      );

      // Sync status to child donations so supplier's dashboard updates in real-time
      await syncCustomerOrderToDonationClaims(customerOrder, 'delivered', req.user);

      try {
        await creditDeliveryEarnings({
          customerOrder,
          driverId: req.user._id,
        });
      } catch (earningsErr) {
        console.error('creditDeliveryEarnings (customer order) error:', earningsErr);
      }

      return res.json({
        success: true,
        message: 'Delivery confirmed.',
        tracking: toDriverCustomerOrderJSON(customerOrder),
      });
    }
    if (donation.driverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your assigned delivery.' });
    }
    if (donation.status !== 'picked_up') {
      return res.status(400).json({
        success: false,
        message: 'Delivery can only be confirmed after pickup.',
      });
    }

    donation.status = 'delivered';
    donation.deliveredAt = new Date();
    await donation.save();

    await donation.populate(TRACKING_POPULATE);

    const donationIdStr = donation._id.toString();
    const donorId = donation.donorId._id?.toString?.() || donation.donorId.toString();
    const tracking = toTrackingJSON(donation);

    emitToDonationRoom(donationIdStr, 'donation:delivered', {
      donationId: donationIdStr,
      donation: tracking.donation,
    });
    emitToDonor(donorId, 'donation:delivered', { donationId: donationIdStr, donation: tracking });
    emitToReceivers('donation:delivered', { donationId: donationIdStr, donation: tracking });

    await sendDonationDeliveredEmails(
      donation,
      donation.donorId,
      donation.receiverId,
      donation.driverId
    );

    try {
      await creditDeliveryEarnings({
        donation,
        driverId: req.user._id,
      });
    } catch (earningsErr) {
      console.error('creditDeliveryEarnings (donation) error:', earningsErr);
    }

    return res.json({
      success: true,
      message: 'Delivery confirmed.',
      tracking,
    });
  } catch (err) {
    console.error('confirmDelivery error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to confirm delivery',
    });
  }
};
