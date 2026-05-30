const AuditLog = require('../models/AuditLog');
const AuditConfig = require('../models/AuditConfig');
const User = require('../models/User');

async function logActivity(userId, action, details = {}, req = null) {
  try {
    const config = await AuditConfig.getGlobal();
    if (config.isPaused && action !== 'AUDIT_LOGS_TOGGLE') {
      return; // Skip logging when paused (except for the pause/resume toggle itself)
    }

    let userName = 'System';
    let userRole = 'system';
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        userName = user.name || user.email;
        userRole = user.role || 'user';
      }
    }

    let ipAddress = 'N/A';
    let userAgent = 'N/A';
    if (req) {
      ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'N/A';
      userAgent = req.headers['user-agent'] || 'N/A';
    }

    // Mask sensitive properties in details
    const sanitizedDetails = { ...details };
    const sensitiveKeys = ['password', 'otp', 'token', 'cardNumber', 'cvv'];
    sensitiveKeys.forEach(key => {
      if (key in sanitizedDetails) sanitizedDetails[key] = '********';
    });

    await AuditLog.create({
      userId,
      userName,
      userRole,
      action,
      details: sanitizedDetails,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error('[AuditLogger] Failed to write log:', err);
  }
}

module.exports = { logActivity };
