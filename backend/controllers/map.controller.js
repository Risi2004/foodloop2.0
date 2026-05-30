const Donation = require('../models/Donation');
const {
  getDonorDisplayName,
  getReceiverDisplayName,
  isWithinSriLanka,
} = require('../utils/donationHelpers');

function isValidCoord(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (Number.isNaN(la) || Number.isNaN(ln)) return false;
  return isWithinSriLanka(la, ln);
}

function mapSupplierRow(row) {
  const donor = row.donor;
  if (!donor || donor.accountStatus !== 'active') return null;
  if (!isValidCoord(row.lat, row.lng)) return null;
  return {
    id: row._id?.toString?.() || String(row._id),
    lat: Number(row.lat),
    lng: Number(row.lng),
    displayName: getDonorDisplayName(donor),
    address: row.pickupAddress || donor.address || null,
  };
}

function mapReceiverRow(row) {
  const receiver = row.receiver;
  if (!receiver || receiver.accountStatus !== 'active') return null;
  if (!isValidCoord(row.lat, row.lng)) return null;
  const role = (receiver.role || '').toLowerCase();
  if (!['receiver', 'customer'].includes(role)) return null;
  return {
    id: row._id?.toString?.() || String(row._id),
    lat: Number(row.lat),
    lng: Number(row.lng),
    displayName: getReceiverDisplayName(receiver),
    address: row.receiverAddress || receiver.address || null,
  };
}

exports.getPublicMapLocations = async (_req, res) => {
  try {
    const [supplierRows, receiverRows] = await Promise.all([
      Donation.aggregate([
        {
          $match: {
            status: { $nin: ['draft', 'cancelled'] },
            donorLatitude: { $ne: null },
            donorLongitude: { $ne: null },
          },
        },
        { $sort: { updatedAt: -1 } },
        {
          $group: {
            _id: '$donorId',
            lat: { $first: '$donorLatitude' },
            lng: { $first: '$donorLongitude' },
            pickupAddress: { $first: '$pickupAddress' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'donor',
          },
        },
        { $unwind: { path: '$donor', preserveNullAndEmptyArrays: false } },
        { $match: { 'donor.accountStatus': 'active' } },
      ]),
      Donation.aggregate([
        {
          $match: {
            receiverId: { $ne: null },
            receiverLatitude: { $ne: null },
            receiverLongitude: { $ne: null },
            status: { $nin: ['draft', 'cancelled'] },
          },
        },
        { $sort: { updatedAt: -1 } },
        {
          $group: {
            _id: '$receiverId',
            lat: { $first: '$receiverLatitude' },
            lng: { $first: '$receiverLongitude' },
            receiverAddress: { $first: '$receiverAddress' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'receiver',
          },
        },
        { $unwind: { path: '$receiver', preserveNullAndEmptyArrays: false } },
        { $match: { 'receiver.accountStatus': 'active' } },
      ]),
    ]);

    const donors = supplierRows.map(mapSupplierRow).filter(Boolean);
    const receivers = receiverRows.map(mapReceiverRow).filter(Boolean);

    return res.json({
      success: true,
      donors,
      receivers,
    });
  } catch (err) {
    console.error('getPublicMapLocations error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load map locations.',
      donors: [],
      receivers: [],
    });
  }
};
