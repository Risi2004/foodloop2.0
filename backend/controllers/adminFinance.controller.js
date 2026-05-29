const { getFinanceSummary, getFinanceLedger } = require('../services/adminFinanceService');

exports.getFinanceSummary = async (req, res) => {
  try {
    const { from, to } = req.query || {};
    const result = await getFinanceSummary({ from, to });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('getFinanceSummary error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load finance summary',
    });
  }
};

exports.getFinanceLedger = async (req, res) => {
  try {
    const { type, from, to, page, limit } = req.query || {};
    const result = await getFinanceLedger({ type, from, to, page, limit });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('getFinanceLedger error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load finance ledger',
    });
  }
};
