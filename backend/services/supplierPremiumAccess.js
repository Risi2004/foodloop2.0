const SupplierBundleSubscription = require('../models/SupplierBundleSubscription');

async function findActiveBundleSubscription(supplierId) {
  const sub = await SupplierBundleSubscription.findOne({
    supplierId,
    status: 'active',
  });

  if (!sub) return null;
  if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) {
    sub.status = 'expired';
    sub.autoRenew = false;
    await sub.save();
    return null;
  }
  return sub;
}

module.exports = {
  findActiveBundleSubscription,
};
