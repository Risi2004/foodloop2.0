const User = require('../models/User');
const {
  listAllOrders,
  getOrderDetail,
  getUserMonitoringList,
} = require('../services/adminOrdersService');
const {
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
  sendAccountDeactivatedEmail,
  sendAccountReactivatedEmail,
} = require('../utils/sendNotificationEmail');
function fileUrl(req, relativePath) {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath;
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}${relativePath.startsWith('/') ? '' : '/'}${relativePath.replace(/\\/g, '/')}`;
}

function normalizeRoleForAdmin(role) {
  const r = (role || '').toLowerCase();
  if (r === 'receiver') return 'Receiver';
  if (r === 'driver') return 'Driver';
  if (r === 'admin') return 'Admin';
  if (r === 'donor') return 'Donor';
  return role;
}

function mapAccountStatusForFrontend(accountStatus) {
  if (accountStatus === 'active') return 'completed';
  if (accountStatus === 'deactivated') return 'inactive';
  if (accountStatus === 'rejected') return 'rejected';
  if (accountStatus === 'pending_approval') return 'pending';
  if (accountStatus === 'pending_verification') return 'unverified';
  return accountStatus;
}

function formatAdminUser(req, user) {
  const safe = user.toSafeJSON();
  safe.role = normalizeRoleForAdmin(safe.role);
  safe.accountStatus = safe.accountStatus || 'pending_verification';
  safe.status = mapAccountStatusForFrontend(safe.accountStatus);

  if (safe.profileImage) safe.profileImageUrl = fileUrl(req, safe.profileImage);
  if (safe.businessRegFile) safe.businessRegFileUrl = fileUrl(req, safe.businessRegFile);
  if (safe.addressProofFile) safe.addressProofFileUrl = fileUrl(req, safe.addressProofFile);
  if (safe.nicFile) safe.nicFileUrl = fileUrl(req, safe.nicFile);
  if (safe.licenseFile) safe.licenseFileUrl = fileUrl(req, safe.licenseFile);
  if (safe.gramaNiladhariLetter) {
    safe.gramaNiladhariLetterUrl = fileUrl(req, safe.gramaNiladhariLetter);
  }

  return safe;
}

function mapStatusToDb(frontendStatus) {
  const s = (frontendStatus || '').toLowerCase();
  if (s === 'completed' || s === 'active') return 'active';
  if (s === 'rejected') return 'rejected';
  if (s === 'inactive' || s === 'deactivated') return 'deactivated';
  return null;
}

exports.getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({
      accountStatus: 'pending_approval',
      isEmailVerified: true,
    })
      .sort({ createdAt: -1 })
      .lean(false);

    return res.json({
      success: true,
      users: users.map((u) => formatAdminUser(req, u)),
    });
  } catch (err) {
    console.error('getPendingUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load pending users' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const activeOrPending = { $in: ['active', 'pending_approval'] };

    const [donors, drivers, receivers] = await Promise.all([
      User.countDocuments({ role: 'Donor', accountStatus: activeOrPending }),
      User.countDocuments({ role: 'driver', accountStatus: activeOrPending }),
      User.countDocuments({ role: 'receiver', accountStatus: activeOrPending }),
    ]);

    return res.json({
      success: true,
      stats: { donors, drivers, receivers },
    });
  } catch (err) {
    console.error('getStats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load stats' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const query = { role: { $ne: 'Admin' } };

    if (role) {
      const r = String(role).trim();
      if (r === 'Receiver') query.role = 'receiver';
      else if (r === 'Driver') query.role = 'driver';
      else if (r === 'Donor') query.role = 'Donor';
      else query.role = r.toLowerCase();
    }

    const statusMap = {
      completed: 'active',
      inactive: 'deactivated',
      rejected: 'rejected',
      pending: 'pending_approval',
      unverified: 'pending_verification',
    };
    if (status && statusMap[status]) {
      query.accountStatus = statusMap[status];
    }

    if (search && String(search).trim()) {
      const term = String(search).trim();
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { email: regex },
        { username: regex },
        { businessName: regex },
        { receiverName: regex },
        { driverName: regex },
        { contactNo: regex },
        { address: regex },
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });
    return res.json({
      success: true,
      users: users.map((u) => formatAdminUser(req, u)),
    });
  } catch (err) {
    console.error('getAllUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load users' });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const dbStatus = mapStatusToDb(status);
    if (!dbStatus) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Use completed, rejected, or inactive.',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (dbStatus === 'active') {
      if (!['pending_approval', 'deactivated', 'rejected'].includes(user.accountStatus)) {
        return res.status(400).json({
          success: false,
          message: 'This account cannot be activated from its current status',
        });
      }
      const wasPending = user.accountStatus === 'pending_approval';
      const wasDeactivated = user.accountStatus === 'deactivated';
      user.accountStatus = 'active';
      await user.save();
      if (wasPending) {
        await sendAccountApprovedEmail(user);
      } else if (wasDeactivated) {
        await sendAccountReactivatedEmail(user);
      }
    } else if (dbStatus === 'rejected') {
      if (user.accountStatus !== 'pending_approval') {
        return res.status(400).json({
          success: false,
          message: 'Only pending approval accounts can be rejected',
        });
      }
      user.accountStatus = 'rejected';
      await user.save();
      await sendAccountRejectedEmail(user);
    } else if (dbStatus === 'deactivated') {
      const wasActive = user.accountStatus === 'active';
      user.accountStatus = 'deactivated';
      await user.save();
      if (wasActive) {
        await sendAccountDeactivatedEmail(user);
      }
    } else {
      await user.save();
    }

    return res.json({
      success: true,
      message: 'User status updated',
      user: formatAdminUser(req, user),
    });
  } catch (err) {
    console.error('updateUserStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const { type, status, search, page, limit, dateFrom, dateTo } = req.query;
    const result = await listAllOrders({ type, status, search, page, limit, dateFrom, dateTo });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('getAllOrders error:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to load orders',
    });
  }
};

exports.getOrderDetail = async (req, res) => {
  try {
    const { orderType, id } = req.params;
    const order = await getOrderDetail(orderType, id);
    return res.json({ success: true, order });
  } catch (err) {
    console.error('getOrderDetail error:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to load order detail',
    });
  }
};

exports.getUserMonitoring = async (req, res) => {
  try {
    const { search, role, status, page, limit } = req.query;
    const result = await getUserMonitoringList({ search, role, status, page, limit });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('getUserMonitoring error:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to load user monitoring data',
    });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, status, search, page, limit, dateFrom, dateTo } = req.query;
    const result = await listAllOrders({
      type,
      status,
      search,
      page,
      limit,
      dateFrom,
      dateTo,
      userId: id,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('getUserOrders error:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to load user orders',
    });
  }
};
