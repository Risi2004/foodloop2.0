const { processDueRenewals: processAiRenewals } = require('./supplierAiSubscriptionService');
const { processDueRenewals: processEsgRenewals } = require('./supplierEsgSubscriptionService');
const { processDueRenewals: processBundleRenewals } = require('./supplierBundleSubscriptionService');

function startRenewalScheduler() {
  const intervalMs =
    Number(process.env.SUPPLIER_SUBSCRIPTION_RENEWAL_INTERVAL_MS) ||
    Number(process.env.SUPPLIER_AI_RENEWAL_INTERVAL_MS) ||
    6 * 60 * 60 * 1000;

  const run = () => {
    processAiRenewals().catch((err) => {
      console.error('[supplierAiRenewal] scheduler error:', err.message);
    });
    processEsgRenewals().catch((err) => {
      console.error('[supplierEsgRenewal] scheduler error:', err.message);
    });
    processBundleRenewals().catch((err) => {
      console.error('[supplierBundleRenewal] scheduler error:', err.message);
    });
  };

  run();
  setInterval(run, intervalMs);
  console.log(`Supplier subscription auto-renewal scheduler every ${intervalMs / 1000}s`);
}

module.exports = { startRenewalScheduler };
