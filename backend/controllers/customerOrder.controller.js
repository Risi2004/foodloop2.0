const mongoose = require('mongoose');
const CustomerOrder = require('../models/CustomerOrder');
const Donation = require('../models/Donation');
const { isDriverRole } = require('../utils/donationHelpers');

function requireCustomer(req, res) {
  const role = (req.user?.role || '').toLowerCase();
  if (role !== 'customer') {
    res.status(403).json({ success: false, message: 'Only customers can access customer orders.' });
    return false;
  }
  return true;
}

function toCustomerOrderJSON(order) {
  const base = typeof order.toPublicJSON === 'function' ? order.toPublicJSON() : order;
  const driverObj = order.driverId && typeof order.driverId === 'object' ? order.driverId : null;
  return {
    ...base,
    driver: driverObj
      ? {
          id: driverObj._id?.toString?.() || driverObj._id,
          name: driverObj.driverName || driverObj.username || 'Driver',
          contactNo: driverObj.contactNo || null,
          vehicleType: driverObj.vehicleType || null,
          vehicleNumber: driverObj.vehicleNumber || null,
        }
      : null,
  };
}

async function repairCustomerOrderFromLinkedDonation(order) {
  if (!order || order.status !== 'finding_driver' || order.driverId) {
    return order;
  }

  const itemIds = (order.orderSummary?.items || []).map((item) => item.id).filter(Boolean);
  if (!itemIds.length) return order;

  const linkedDonation = await Donation.findOne({
    receiverId: order.customerId,
    driverId: { $ne: null },
    status: { $in: ['driver_assigned', 'picked_up', 'in_transit'] },
    $or: [{ parentListingId: { $in: itemIds } }, { _id: { $in: itemIds } }],
  }).sort({ updatedAt: -1 });

  if (!linkedDonation?.driverId) return order;

  order.driverId = linkedDonation.driverId;
  order.status =
    linkedDonation.status === 'in_transit' ? 'in_transit' : linkedDonation.status;
  order.assignedAt = order.assignedAt || linkedDonation.assignedAt || new Date();
  if (linkedDonation.pickedUpAt) {
    order.pickedUpAt = linkedDonation.pickedUpAt;
  }
  await order.save();
  return order;
}

exports.getMyCustomerOrders = async (req, res) => {
  try {
    if (!requireCustomer(req, res)) return;
    const orders = await CustomerOrder.find({ customerId: req.user._id })
      .populate('driverId', 'username driverName contactNo vehicleType vehicleNumber')
      .sort({ createdAt: -1 });

    for (const order of orders) {
      await repairCustomerOrderFromLinkedDonation(order);
    }

    const refreshed = await CustomerOrder.find({ customerId: req.user._id })
      .populate('driverId', 'username driverName contactNo vehicleType vehicleNumber')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      orders: refreshed.map((order) => toCustomerOrderJSON(order)),
    });
  } catch (err) {
    console.error('getMyCustomerOrders error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load customer orders',
    });
  }
};

exports.getCustomerOrderTracking = async (req, res) => {
  try {
    if (!requireCustomer(req, res)) return;
    const { orderId } = req.params;
    const query = mongoose.Types.ObjectId.isValid(orderId)
      ? { $or: [{ _id: orderId }, { orderId }] }
      : { orderId };

    const order = await CustomerOrder.findOne({
      ...query,
      customerId: req.user._id,
    }).populate('driverId', 'username driverName contactNo vehicleType vehicleNumber');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Customer order not found.' });
    }

    return res.json({
      success: true,
      tracking: toCustomerOrderJSON(order),
    });
  } catch (err) {
    console.error('getCustomerOrderTracking error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load customer order tracking',
    });
  }
};

exports.getDriverCustomerOrderTracking = async (req, res) => {
  try {
    if (!isDriverRole(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Only drivers can access this resource.' });
    }
    const { orderId } = req.params;
    const query = mongoose.Types.ObjectId.isValid(orderId)
      ? { $or: [{ _id: orderId }, { orderId }] }
      : { orderId };

    const order = await CustomerOrder.findOne(query)
      .populate('customerId', 'username email contactNo')
      .populate('driverId', 'username driverName email contactNo vehicleType vehicleNumber');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Customer order not found.' });
    }
    if (
      order.driverId &&
      order.driverId._id?.toString?.() &&
      order.driverId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Not your assigned order.' });
    }

    const base = toCustomerOrderJSON(order);
    return res.json({
      success: true,
      tracking: {
        order: base,
        customer: order.customerId
          ? {
              id: order.customerId._id?.toString?.() || order.customerId._id,
              name: order.customerId.username || 'Customer',
              email: order.customerId.email || null,
              contactNo: order.customerId.contactNo || null,
              address: order.customerAddress || order.orderSummary?.address || null,
            }
          : null,
        driver: base.driver,
      },
    });
  } catch (err) {
    console.error('getDriverCustomerOrderTracking error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load customer order tracking for driver',
    });
  }
};
