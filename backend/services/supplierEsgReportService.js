const Donation = require('../models/Donation');
const { generateChatReply } = require('./geminiChatService');
const { formatColomboParts } = require('../utils/colomboTime');

const FOOD_KG_PER_MEAL = 0.6;
const CO2_KG_PER_FOOD_KG = 2.5;

class SupplierEsgError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = 'SupplierEsgError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function getPeriodRange(period) {
  const now = new Date();
  const { year, month } = formatColomboParts(now);
  const y = Number(year);
  const m = Number(month);

  switch (period) {
    case 'last_30': {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end: now, key: 'last_30', label: 'Last 30 days' };
    }
    case 'this_quarter': {
      const qStartMonth = Math.floor((m - 1) / 3) * 3;
      const start = new Date(y, qStartMonth, 1);
      return { start, end: now, key: 'this_quarter', label: 'This quarter' };
    }
    case 'all_time':
      return { start: null, end: now, key: 'all_time', label: 'All time' };
    case 'this_month':
    default:
      return {
        start: new Date(y, m - 1, 1),
        end: now,
        key: 'this_month',
        label: 'This month',
      };
  }
}

function buildDateQuery(range) {
  if (!range.start) return {};
  return {
    $or: [
      { deliveredAt: { $gte: range.start, $lte: range.end } },
      {
        status: 'delivered',
        deliveredAt: null,
        updatedAt: { $gte: range.start, $lte: range.end },
      },
    ],
  };
}

function buildCreatedQuery(range) {
  if (!range.start) return {};
  return { createdAt: { $gte: range.start, $lte: range.end } };
}

async function loadDeliveredDonations(supplierId, range) {
  const base = { donorId: supplierId, status: 'delivered' };
  const dateFilter = buildDateQuery(range);
  return Donation.find({ ...base, ...dateFilter })
    .select(
      'quantity listingType foodCategory itemName receiverId deliveredAt createdAt'
    )
    .lean();
}

async function loadAllListingsInPeriod(supplierId, range) {
  const base = {
    donorId: supplierId,
    status: { $ne: 'draft' },
    ...buildCreatedQuery(range),
  };
  return Donation.find(base)
    .select('status quantity listingType foodCategory deliveredAt')
    .lean();
}

function aggregateEnvironmental(delivered) {
  const mealsShared = delivered.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
  const foodSavedKg = Math.round(mealsShared * FOOD_KG_PER_MEAL * 10) / 10;
  const co2OffsetKg = Math.round(foodSavedKg * CO2_KG_PER_FOOD_KG);
  return {
    mealsShared,
    foodSavedKg,
    co2OffsetKg,
    wasteDivertedKg: foodSavedKg,
  };
}

function aggregateSocial(delivered, allListings) {
  const peopleFed = delivered.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
  const receiverIds = new Set(
    delivered.map((d) => d.receiverId?.toString()).filter(Boolean)
  );

  let donateQty = 0;
  let sellQty = 0;
  const categoryMap = {};

  for (const d of allListings) {
    const qty = Number(d.quantity) || 0;
    if ((d.listingType || '').toLowerCase() === 'sell') sellQty += qty;
    else donateQty += qty;
    const cat = d.foodCategory || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + qty;
  }

  const topCategories = Object.entries(categoryMap)
    .map(([category, quantity]) => ({ category, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    peopleFed,
    uniqueReceivers: receiverIds.size,
    donateQuantity: donateQty,
    sellQuantity: sellQty,
    topCategories,
    listingsPublished: allListings.length,
  };
}

function aggregateGovernance(delivered, allListings) {
  const deliveredCount = delivered.length;
  const cancelled = allListings.filter((d) => d.status === 'cancelled').length;
  const completed = allListings.filter((d) => d.status === 'delivered').length;
  const totalListed = allListings.length;
  const fulfillmentRate =
    totalListed > 0 ? Math.round((completed / totalListed) * 100) : null;

  return {
    listingsPublished: totalListed,
    deliveriesCompleted: deliveredCount,
    fulfillmentRate,
    foodLoopCompliance: totalListed > 0 ? 'Active FoodLoop supplier' : 'No listings in period',
    cancelledListings: cancelled,
  };
}

function buildFallbackSummary(report) {
  const e = report.environmental;
  const s = report.social;
  return {
    executiveSummary: `During ${report.periodLabel}, ${report.company} shared ${e.mealsShared} meals through FoodLoop, diverting approximately ${e.foodSavedKg} kg of food from waste and offsetting an estimated ${e.co2OffsetKg} kg CO₂.`,
    recommendations: [
      'Publish surplus listings early in the day to maximize receiver visibility.',
      'Balance donate and sell listings based on your top categories this period.',
      'Share your FoodLoop impact report with stakeholders and CSR committees.',
    ],
  };
}

async function generateEsgNarrative(report) {
  try {
    const text = await generateChatReply({
      systemInstruction: `You advise Sri Lankan food businesses on CSR and ESG reporting.
Return ONLY valid JSON: { "executiveSummary": "string", "recommendations": ["string","string","string"] }
Use the provided metrics only. Be professional and suitable for a printed CSR report.`,
      message: `Write a short CSR executive summary and 3 recommendations:\n${JSON.stringify(report, null, 2)}`,
      history: [],
    });
    const raw = String(text || '').trim();
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const parsed = JSON.parse(fenced ? fenced[1].trim() : raw);
    return {
      executiveSummary: String(parsed.executiveSummary || '').trim(),
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map((r) => String(r).trim()).filter(Boolean).slice(0, 5)
        : [],
    };
  } catch {
    return buildFallbackSummary(report);
  }
}

async function buildEsgReport(supplierId, user, { period = 'this_month' } = {}) {
  const range = getPeriodRange(period);
  const [delivered, allListings] = await Promise.all([
    loadDeliveredDonations(supplierId, range),
    loadAllListingsInPeriod(supplierId, range),
  ]);

  const company =
    user.businessName || user.username || user.email || 'Your organization';

  const environmental = aggregateEnvironmental(delivered);
  const social = aggregateSocial(delivered, allListings);
  const governance = aggregateGovernance(delivered, allListings);

  const reportCore = {
    period: range.key,
    periodLabel: range.label,
    generatedAt: new Date().toISOString(),
    company,
    supplierRole: user.role,
    environmental,
    social,
    governance,
    methodology: {
      foodKgPerMeal: FOOD_KG_PER_MEAL,
      co2KgPerFoodKg: CO2_KG_PER_FOOD_KG,
      note: 'Impact estimates use FoodLoop standard conversion factors for surplus meals diverted. CO₂ figures are indicative for CSR reporting, not third-party verified carbon credits.',
    },
  };

  const summary = await generateEsgNarrative(reportCore);

  return {
    ...reportCore,
    summary,
  };
}

module.exports = {
  SupplierEsgError,
  buildEsgReport,
  getPeriodRange,
};
