const Donation = require('../models/Donation');
const {
  findActiveSubscription,
  isAutoRenewEnabled,
} = require('./supplierAiSubscriptionService');
const SupplierAiUsage = require('../models/SupplierAiUsage');
const {
  getCurrentWeatherByCoords,
  getForecastWeatherByCoords,
} = require('./weatherService');
const { generateTomorrowInsights } = require('./supplierTomorrowInsightsEngine');
const {
  getColomboDateKey,
  getColomboYearMonth,
  getCurrentMonthEnd,
} = require('../utils/colomboTime');
const { isWithinSriLanka } = require('../utils/donationHelpers');

const FREE_DAILY_LIMIT = Number(process.env.SUPPLIER_AI_FREE_DAILY_LIMIT) || 2;

class SupplierAiError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = 'SupplierAiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function getSubscriptionAmount() {
  return Number(process.env.SUPPLIER_AI_SUBSCRIPTION_LKR) || 5000;
}

async function getActiveSubscription(supplierId) {
  const sub = await findActiveSubscription(supplierId);
  return sub ? sub.toObject?.() ?? sub : null;
}

async function getTodayUsageCount(supplierId) {
  const dateKey = getColomboDateKey();
  const row = await SupplierAiUsage.findOne({ supplierId, dateKey }).lean();
  return row?.count ?? 0;
}

async function getAccessStatus(supplierId) {
  const dateKey = getColomboDateKey();
  const yearMonth = getColomboYearMonth();
  const sub = await getActiveSubscription(supplierId);
  const usedToday = await getTodayUsageCount(supplierId);

  if (sub) {
    return {
      tier: 'unlimited',
      unlimited: true,
      remainingToday: null,
      freeDailyLimit: FREE_DAILY_LIMIT,
      usedToday,
      paidThroughMonth: sub.paidThroughMonth,
      expiresAt: sub.expiresAt,
      subscriptionAmountLkr: getSubscriptionAmount(),
      autoRenew: isAutoRenewEnabled(sub),
      autoRenewCancelledAt: sub.autoRenewCancelledAt || null,
    };
  }

  const remainingToday = Math.max(0, FREE_DAILY_LIMIT - usedToday);
  return {
    tier: 'free',
    unlimited: false,
    remainingToday,
    freeDailyLimit: FREE_DAILY_LIMIT,
    usedToday,
    paidThroughMonth: null,
    expiresAt: getCurrentMonthEnd(),
    subscriptionAmountLkr: getSubscriptionAmount(),
  };
}

async function assertCanRun(supplierId) {
  const status = await getAccessStatus(supplierId);
  if (status.unlimited) return status;
  if (status.remainingToday <= 0) {
    throw new SupplierAiError(
      'AI_QUOTA_EXCEEDED',
      `You have used your ${FREE_DAILY_LIMIT} free AI forecasts for today. Subscribe for unlimited access this month.`,
      402
    );
  }
  return status;
}

async function recordRun(supplierId) {
  const sub = await getActiveSubscription(supplierId);
  if (sub) return;

  const dateKey = getColomboDateKey();
  await SupplierAiUsage.findOneAndUpdate(
    { supplierId, dateKey },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );
}

function filterTomorrowForecast(forecast) {
  if (!forecast?.entries?.length) {
    return { location: forecast?.location || null, entries: [] };
  }

  const colomboNow = new Date();
  const tomorrowKey = getColomboDateKey(new Date(colomboNow.getTime() + 24 * 60 * 60 * 1000));

  const entries = forecast.entries.filter((entry) => {
    if (!entry.timestamp) return false;
    const entryKey = getColomboDateKey(new Date(entry.timestamp));
    return entryKey === tomorrowKey;
  });

  return {
    location: forecast.location,
    entries: entries.length > 0 ? entries : forecast.entries.slice(0, 4),
    targetDateKey: tomorrowKey,
  };
}

async function loadRecentListings(supplierId) {
  const donations = await Donation.find({ donorId: supplierId })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('itemName foodCategory listingType quantity status createdAt')
    .lean();

  return donations.map((d) => ({
    itemName: d.itemName,
    foodCategory: d.foodCategory,
    listingType: d.listingType,
    quantity: d.quantity,
    status: d.status,
  }));
}

function buildSupplierProfile(user) {
  return {
    role: user.role,
    businessName: user.businessName || user.username || '',
    donorType: user.donorType || null,
  };
}

async function resolveCoords(user, lat, lng) {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLng) && isWithinSriLanka(parsedLat, parsedLng)) {
    return { lat: parsedLat, lng: parsedLng, source: 'request' };
  }

  const candidates = [
    [user.latitude, user.longitude],
    [user.donorLatitude, user.donorLongitude],
  ];
  for (const [la, ln] of candidates) {
    const a = Number(la);
    const b = Number(ln);
    if (!Number.isNaN(a) && !Number.isNaN(b) && isWithinSriLanka(a, b)) {
      return { lat: a, lng: b, source: 'profile' };
    }
  }

  return { lat: 6.9271, lng: 79.8612, source: 'fallback_colombo' };
}

async function buildTomorrowInsights(user, options = {}) {
  const coords = await resolveCoords(user, options.lat, options.lng);

  let currentWeather = null;
  let forecastWeather = null;
  let weatherError = null;

  try {
    const currentRes = await getCurrentWeatherByCoords(coords.lat, coords.lng, 'metric');
    currentWeather = currentRes?.weather || null;
    const forecastRes = await getForecastWeatherByCoords(coords.lat, coords.lng, 'metric');
    forecastWeather = filterTomorrowForecast(forecastRes?.forecast || null);
  } catch (err) {
    weatherError = err.message || 'Weather unavailable';
    console.warn('[supplierAiInsights] weather:', weatherError);
  }

  const recentListings = await loadRecentListings(user._id);
  const draftListing =
    options.foodCategory || options.itemName
      ? {
          foodCategory: options.foodCategory || null,
          itemName: options.itemName || null,
        }
      : null;

  const insights = await generateTomorrowInsights({
    tomorrowWeather: forecastWeather,
    currentWeather: currentWeather?.current || null,
    supplierProfile: buildSupplierProfile(user),
    recentListings,
    draftListing,
    coords,
  });

  return {
    insights,
    weather: {
      location: forecastWeather?.location || currentWeather?.location || null,
      tomorrow: forecastWeather,
      current: currentWeather?.current || null,
      coords,
      weatherError,
    },
  };
}

module.exports = {
  SupplierAiError,
  getSubscriptionAmount,
  getAccessStatus,
  assertCanRun,
  recordRun,
  buildTomorrowInsights,
  getActiveSubscription,
  FREE_DAILY_LIMIT,
};
