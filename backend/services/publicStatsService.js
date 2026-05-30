const User = require('../models/User');
const ImpactReceipt = require('../models/ImpactReceipt');
const { SUPPLIER_ROLES } = require('../utils/earningsHelpers');

/** Align with supplier ESG impact constants. */
const CO2_KG_PER_FOOD_KG = 2.5;

async function getPublicPlatformStats() {
  const [suppliers, receivers, drivers, impactAgg] = await Promise.all([
    User.countDocuments({ role: { $in: SUPPLIER_ROLES }, accountStatus: 'active' }),
    User.countDocuments({ role: { $in: ['receiver', 'customer'] }, accountStatus: 'active' }),
    User.countDocuments({ role: 'driver', accountStatus: 'active' }),
    ImpactReceipt.aggregate([
      {
        $group: {
          _id: null,
          mealsRescued: { $sum: '$peopleFed' },
          foodSavedKg: {
            $sum: {
              $multiply: ['$peopleFed', '$weightPerServing'],
            },
          },
          methaneSavedKg: { $sum: '$methaneSaved' },
        },
      },
    ]),
  ]);

  const impact = impactAgg[0] || {};
  const mealsRescued = Math.round(Number(impact.mealsRescued) || 0);
  const foodSavedKg = Math.round((Number(impact.foodSavedKg) || 0) * 10) / 10;
  const methaneSavedKg = Math.round((Number(impact.methaneSavedKg) || 0) * 100) / 100;
  const co2OffsetKg = Math.round(foodSavedKg * CO2_KG_PER_FOOD_KG * 10) / 10;

  return {
    suppliers,
    donors: suppliers,
    receivers,
    drivers,
    mealsRescued,
    peopleFed: mealsRescued,
    foodSavedKg,
    kgDiverted: foodSavedKg,
    co2OffsetKg,
    methaneSavedKg,
  };
}

module.exports = {
  getPublicPlatformStats,
  CO2_KG_PER_FOOD_KG,
};
