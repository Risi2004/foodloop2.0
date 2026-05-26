const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const User = require('../models/User');
const {
  MAX_DRIVER_RADIUS_KM,
  calculateDistanceKm,
  isDonationExpired,
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
];

const ACTIVE_DRIVER_STATUSES = ['driver_assigned', 'picked_up'];

/** @type {Map<string, { intervalId: NodeJS.Timeout, timeoutId: NodeJS.Timeout | null }>} */
const demoSessions = new Map();

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

    if (lat == null || lng == null) {
      return res.json({
        success: true,
        pickups: [],
        driverLocation: null,
        message: 'Set your location to see available pickups.',
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
      .sort({ claimedAt: -1, createdAt: -1 });

    const pickups = [];

    for (const donation of donations) {
      if (isDonationExpired(donation.userProvidedExpiryDate)) continue;

      const donorDist = calculateDistanceKm(
        lat,
        lng,
        donation.donorLatitude,
        donation.donorLongitude
      );
      if (donorDist == null || donorDist > MAX_DRIVER_RADIUS_KM) continue;

      pickups.push(toDriverPickupJSON(donation, lat, lng));
    }

    return res.json({
      success: true,
      pickups,
      driverLocation: { latitude: lat, longitude: lng },
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
      .sort({ assignedAt: -1, updatedAt: -1 });

    const deliveries = donations.map((d) =>
      toDriverActiveDeliveryJSON(d, lat, lng)
    );

    const driverLocation =
      lat != null && lng != null ? { latitude: lat, longitude: lng } : null;

    return res.json({
      success: true,
      deliveries,
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
    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: 'You can only have one active delivery at a time. Complete it first.',
      });
    }

    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
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

    donation.driverId = req.user._id;
    donation.status = 'driver_assigned';
    donation.assignedAt = new Date();
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

    sendDonationDriverAssignedEmails(
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
      return res.status(404).json({ success: false, message: 'Donation not found.' });
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
      return res.status(404).json({ success: false, message: 'Donation not found.' });
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

    sendDonationPickupConfirmedEmails(
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
      return res.status(404).json({ success: false, message: 'Donation not found.' });
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

    sendDonationDeliveredEmails(
      donation,
      donation.donorId,
      donation.receiverId,
      donation.driverId
    );

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
