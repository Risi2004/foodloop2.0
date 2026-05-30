const SupplierBundleSubscription = require('../models/SupplierBundleSubscription');
const SupplierAiSubscription = require('../models/SupplierAiSubscription');
const SupplierEsgSubscription = require('../models/SupplierEsgSubscription');

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

function normalizeSupplierId(supplierId) {
  if (!supplierId) return null;
  if (typeof supplierId === 'object' && supplierId._id) {
    return String(supplierId._id);
  }
  return String(supplierId);
}

async function getPremiumSupplierIdSet(supplierIds = []) {
  const unique = [
    ...new Set(
      supplierIds.map(normalizeSupplierId).filter(Boolean)
    ),
  ];

  if (unique.length === 0) return new Set();

  const now = new Date();
  const activeFilter = {
    supplierId: { $in: unique },
    status: 'active',
    $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }],
  };

  const [bundles, aiSubs, esgSubs] = await Promise.all([
    SupplierBundleSubscription.find(activeFilter).select('supplierId').lean(),
    SupplierAiSubscription.find(activeFilter).select('supplierId').lean(),
    SupplierEsgSubscription.find(activeFilter).select('supplierId').lean(),
  ]);

  const premiumIds = new Set();
  for (const row of [...bundles, ...aiSubs, ...esgSubs]) {
    premiumIds.add(String(row.supplierId));
  }
  return premiumIds;
}

async function isSupplierPremium(supplierId) {
  const id = normalizeSupplierId(supplierId);
  if (!id) return false;
  const premiumIds = await getPremiumSupplierIdSet([id]);
  return premiumIds.has(id);
}

module.exports = {
  findActiveBundleSubscription,
  getPremiumSupplierIdSet,
  isSupplierPremium,
};
