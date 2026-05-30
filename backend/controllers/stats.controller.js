const Donation = require('../models/Donation');
const CustomerOrder = require('../models/CustomerOrder');
const { getPublicPlatformStats } = require('../services/publicStatsService');

const DONOR_ROLES = ['donor', 'restaurant', 'supermarket', 'business', 'individual'];

async function getPublicStats(req, res) {
  try {
    const stats = await getPublicPlatformStats();
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('[stats] getPublicStats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load platform stats.' });
  }
}

async function getUserAchievements(req, res) {
  try {
    const userId = req.user._id;
    const role = (req.user.role || '').toLowerCase();

    let completedCount = 0;
    let roleTitle = 'Donor';

    if (DONOR_ROLES.includes(role)) {
      completedCount = await Donation.countDocuments({
        donorId: userId,
        status: 'delivered',
      });
      roleTitle = 'Supplier';
    } else if (role === 'receiver') {
      completedCount = await Donation.countDocuments({
        receiverId: userId,
        status: 'delivered',
      });
      roleTitle = 'Receiver';
    } else if (role === 'driver') {
      const donationDeliveries = await Donation.countDocuments({
        driverId: userId,
        status: 'delivered',
      });
      const customerOrderDeliveries = await CustomerOrder.countDocuments({
        driverId: userId,
        status: 'delivered',
      });
      completedCount = donationDeliveries + customerOrderDeliveries;
      roleTitle = 'Driver';
    }

    const milestones = [
      { key: 'first_spark', name: 'First Spark', target: 1 },
      { key: 'silver', name: `Silver ${roleTitle}`, target: 25 },
      { key: 'gold', name: `Gold ${roleTitle}`, target: 50 },
      { key: 'centurion', name: `Centurion ${roleTitle}`, target: 100 },
    ];

    const timeline = milestones.map((m) => ({
      key: m.key,
      name: m.name,
      achieved: completedCount >= m.target,
      milestone: m.target,
    }));

    // Find current badge
    let currentBadgeKey = null;
    let currentBadge = `FoodLoop ${roleTitle}`;
    for (let i = milestones.length - 1; i >= 0; i--) {
      if (completedCount >= milestones[i].target) {
        currentBadgeKey = milestones[i].key;
        currentBadge = milestones[i].name;
        break;
      }
    }

    // Find next badge
    let nextBadge = null;
    let nextMilestone = null;
    let remaining = 0;
    for (let i = 0; i < milestones.length; i++) {
      if (completedCount < milestones[i].target) {
        nextBadge = milestones[i].name;
        nextMilestone = milestones[i].target;
        remaining = milestones[i].target - completedCount;
        break;
      }
    }

    return res.json({
      success: true,
      badgeProgress: {
        currentBadgeKey,
        currentBadge,
        timeline,
        remaining,
        nextBadge,
        nextMilestone,
      },
    });
  } catch (err) {
    console.error('[stats] getUserAchievements error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load achievements.' });
  }
}

module.exports = {
  getPublicStats,
  getUserAchievements,
};

