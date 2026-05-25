const { verifyJwt } = require('./auth');

function requireAdmin(req, res, next) {
  verifyJwt(req, res, () => {
    const role = (req.user?.role || '').toLowerCase();
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
      });
    }
    next();
  });
}

module.exports = { requireAdmin };
