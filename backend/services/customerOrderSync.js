const Donation = require('../models/Donation');
const CustomerOrder = require('../models/CustomerOrder');

async function findCustomerOrderForDonation(donation, { includeDelivered = false } = {}) {
  if (!donation?.receiverId) return null;

  const receiverId =
    donation.receiverId._id?.toString?.() || donation.receiverId.toString?.() || donation.receiverId;

  const matchIds = [donation._id.toString()];
  const parentId =
    donation.parentListingId?._id?.toString?.() ||
    donation.parentListingId?.toString?.() ||
    null;
  if (parentId) matchIds.push(parentId);

  const statusFilter = includeDelivered
    ? {}
    : { status: { $in: ['finding_driver', 'driver_assigned', 'picked_up', 'in_transit'] } };

  return CustomerOrder.findOne({
    customerId: receiverId,
    ...statusFilter,
    'orderSummary.items.id': { $in: matchIds },
  }).sort({ createdAt: -1 });
}

async function getDonationsForCustomerOrder(order) {
  const itemIds = (order.orderSummary?.items || []).map((item) => item.id).filter(Boolean);
  if (!itemIds.length) return [];

  return Donation.find({
    receiverId: order.customerId,
    $or: [{ parentListingId: { $in: itemIds } }, { _id: { $in: itemIds } }],
  });
}

module.exports = {
  findCustomerOrderForDonation,
  getDonationsForCustomerOrder,
};
