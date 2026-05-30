const AuditLog = require('../models/AuditLog');
const AuditConfig = require('../models/AuditConfig');
const { logActivity } = require('../utils/auditLogger');

exports.getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      query.$or = [
        { userName: regex },
        { userRole: regex },
        { action: regex }
      ];
    }
    if (req.query.action && req.query.action !== 'All') {
      query.action = req.query.action;
    }
    if (req.query.role && req.query.role !== 'All') {
      query.userRole = req.query.role;
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAuditSettings = async (req, res) => {
  try {
    const config = await AuditConfig.getGlobal();
    res.json({ success: true, isPaused: config.isPaused });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleAudit = async (req, res) => {
  try {
    const { isPaused } = req.body;
    const config = await AuditConfig.getGlobal();
    config.isPaused = isPaused;
    config.updatedBy = req.user._id;
    await config.save();

    await logActivity(
      req.user._id,
      'AUDIT_LOGS_TOGGLE',
      { isPaused },
      req
    );

    res.json({ success: true, isPaused: config.isPaused });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
