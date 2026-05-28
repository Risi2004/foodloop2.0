const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_MODEL = 'gemini-3.5-flash';

function normalizePrice(value) {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n);
}

function calculateDaysToExpiry(expiryInput) {
  if (!expiryInput) return null;
  const date = new Date(expiryInput);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const ms = expiryDate.getTime() - startToday.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function fallbackSuggestion({ donation, daysToExpiry }) {
  const currentPrice = normalizePrice(donation.priceAmount);
  if (daysToExpiry != null && daysToExpiry <= 2) {
    return {
      suggestedPrice: 0,
      discountPercent: 100,
      isFreeRecommendation: true,
      reasoning:
        'Near expiry (2 days or less) detected. Recommending free distribution to reduce likely waste.',
    };
  }
  const suggestedPrice = Math.max(0, Math.round(currentPrice * 0.85));
  const discountPercent = currentPrice > 0 ? Math.round(((currentPrice - suggestedPrice) / currentPrice) * 100) : 0;
  return {
    suggestedPrice,
    discountPercent,
    isFreeRecommendation: suggestedPrice === 0,
    reasoning: 'Based on current context, a moderate discount is recommended to improve pickup chances.',
  };
}

function parseJsonFromText(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  return JSON.parse(candidate);
}

async function getGeminiSuggestion(input) {
  if (!process.env.GEMINI_API_KEY) return null;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `You are a pricing assistant for a Sri Lankan food redistribution marketplace.
Return ONLY JSON:
{
  "suggestedPrice": number,
  "reasoning": string
}

Rules:
- suggestedPrice must be >= 0
- suggestedPrice must not exceed currentPrice
- if daysToExpiry <= 2, strongly prefer 0
- reasoning should be 1-3 short sentences.

INPUT:
${JSON.stringify(input)}`;

  const result = await model.generateContent(prompt);
  const text = result?.response?.text?.();
  if (!text) return null;
  return parseJsonFromText(text);
}

async function generateDiscountSuggestion({ donation, currentWeather, forecastWeather }) {
  const currentPrice = normalizePrice(donation.priceAmount);
  const daysToExpiry = calculateDaysToExpiry(
    donation.userProvidedExpiryDate || donation.expiryDateFromPackage || null
  );

  const fallback = fallbackSuggestion({ donation, daysToExpiry });

  const geminiInput = {
    itemName: donation.itemName,
    foodCategory: donation.foodCategory,
    listingType: donation.listingType,
    currentPrice,
    daysToExpiry,
    currentWeather: currentWeather?.weather?.current || null,
    forecastEntries: forecastWeather?.forecast?.entries || [],
  };

  let aiRaw = null;
  try {
    aiRaw = await getGeminiSuggestion(geminiInput);
  } catch (err) {
    console.warn('generateDiscountSuggestion Gemini fallback:', err?.message || err);
  }

  if (!aiRaw || aiRaw.suggestedPrice == null) {
    return { ...fallback, daysToExpiry };
  }

  let suggestedPrice = normalizePrice(aiRaw.suggestedPrice);
  if (suggestedPrice > currentPrice) suggestedPrice = currentPrice;
  if (daysToExpiry != null && daysToExpiry <= 2) {
    suggestedPrice = 0;
  }

  const discountPercent =
    currentPrice > 0 ? Math.round(((currentPrice - suggestedPrice) / currentPrice) * 100) : 0;

  return {
    suggestedPrice,
    discountPercent,
    isFreeRecommendation: suggestedPrice === 0,
    reasoning: String(aiRaw.reasoning || fallback.reasoning).slice(0, 1000),
    daysToExpiry,
  };
}

module.exports = {
  calculateDaysToExpiry,
  generateDiscountSuggestion,
};
