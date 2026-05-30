const { getPublicPlatformStats } = require('../services/publicStatsService');

async function getPublicStats(req, res) {
  try {
    const stats = await getPublicPlatformStats();
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('[stats] getPublicStats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load platform stats.' });
  }
}

module.exports = {
  getPublicStats,
};
