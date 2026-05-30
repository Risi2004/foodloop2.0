const {
  getEarningsSummary,
  getRecentTransactions,
  getUserPayoutRequests,
  createPayoutRequest,
  updatePayoutProfile,
  listAdminPayoutRequests,
  getAdminPayoutRequestDetail,
  approvePayoutRequest,
  rejectPayoutRequest,
  markPayoutPaid,
} = require('../services/earningsService');
const { logActivity } = require('../utils/auditLogger');
const {
  isSupplierRole,
  isDriverRoleForEarnings,
  earningsRoleType,
} = require('../utils/earningsHelpers');

function requireEarningsUser(req, res) {
  const role = req.user?.role;
  if (!isSupplierRole(role) && !isDriverRoleForEarnings(role)) {
    res.status(403).json({
      success: false,
      message: 'Only suppliers and drivers can access earnings.',
    });
    return false;
  }
  return true;
}

exports.getSummary = async (req, res) => {
  try {
    if (!requireEarningsUser(req, res)) return;
    const isDriver = isDriverRoleForEarnings(req.user?.role);
    const summary = await getEarningsSummary(req.user._id, { isDriver });
    return res.json({ success: true, summary });
  } catch (err) {
    console.error('getSummary error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load earnings summary',
    });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    if (!requireEarningsUser(req, res)) return;
    const limit = req.query.limit;
    const page = req.query.page;
    const isDriver = isDriverRoleForEarnings(req.user?.role);
    const result = await getRecentTransactions(req.user._id, { limit, page, isDriver });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('getTransactions error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load transactions',
    });
  }
};

exports.getPayoutRequests = async (req, res) => {
  try {
    if (!requireEarningsUser(req, res)) return;
    const payoutRequests = await getUserPayoutRequests(req.user._id);
    return res.json({ success: true, payoutRequests });
  } catch (err) {
    console.error('getPayoutRequests error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load payout requests',
    });
  }
};

exports.createPayoutRequest = async (req, res) => {
  try {
    if (!requireEarningsUser(req, res)) return;
    const roleType = earningsRoleType(req.user.role);
    const payoutRequest = await createPayoutRequest(req.user, {
      ...req.body,
      roleType,
    });
    return res.status(201).json({ success: true, payoutRequest });
  } catch (err) {
    console.error('createPayoutRequest error:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to create payout request',
    });
  }
};

exports.updatePayoutProfile = async (req, res) => {
  try {
    if (!requireEarningsUser(req, res)) return;
    const profile = await updatePayoutProfile(req.user, req.body || {});
    return res.json({ success: true, profile });
  } catch (err) {
    console.error('updatePayoutProfile error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to update payout profile',
    });
  }
};

exports.listAdminPayoutRequests = async (req, res) => {
  try {
    const status = req.query.status;
    const payoutRequests = await listAdminPayoutRequests({ status });
    return res.json({ success: true, payoutRequests });
  } catch (err) {
    console.error('listAdminPayoutRequests error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load payout requests',
    });
  }
};

exports.getAdminPayoutRequestDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const payoutRequest = await getAdminPayoutRequestDetail(id);
    return res.json({ success: true, payoutRequest });
  } catch (err) {
    console.error('getAdminPayoutRequestDetail error:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to load payout request detail',
    });
  }
};

exports.approvePayoutRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body || {};
    const payoutRequest = await approvePayoutRequest(id, req.user, adminNote);
    await logActivity(req.user._id, 'PAYOUT_APPROVED', { id, amount: payoutRequest?.amount }, req);
    return res.json({ success: true, payoutRequest });
  } catch (err) {
    console.error('approvePayoutRequest error:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to approve payout request',
    });
  }
};

exports.rejectPayoutRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body || {};
    const payoutRequest = await rejectPayoutRequest(id, req.user, adminNote);
    await logActivity(req.user._id, 'PAYOUT_REJECTED', { id, amount: payoutRequest?.amount }, req);
    return res.json({ success: true, payoutRequest });
  } catch (err) {
    console.error('rejectPayoutRequest error:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to reject payout request',
    });
  }
};

exports.markPayoutPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const payoutRequest = await markPayoutPaid(id, req.user);
    await logActivity(req.user._id, 'PAYOUT_MARK_PAID', { id, amount: payoutRequest?.amount }, req);
    return res.json({ success: true, payoutRequest });
  } catch (err) {
    console.error('markPayoutPaid error:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to mark payout as paid',
    });
  }
};
