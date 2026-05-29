const { generateChatReply } = require('./geminiChatService');

function parseJsonFromText(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  return JSON.parse(candidate);
}

function normalizeInsights(parsed) {
  const recommendedProducts = Array.isArray(parsed?.recommendedProducts)
    ? parsed.recommendedProducts
        .map((p) => ({
          name: String(p?.name || '').trim(),
          category: String(p?.category || '').trim(),
          reason: String(p?.reason || '').trim(),
          suggestedQuantity: String(p?.suggestedQuantity || '').trim(),
        }))
        .filter((p) => p.name)
        .slice(0, 8)
    : [];

  const confidence = ['high', 'medium', 'low'].includes(parsed?.confidence)
    ? parsed.confidence
    : 'medium';

  return {
    tomorrowWeatherSummary: String(parsed?.tomorrowWeatherSummary || '').trim(),
    weatherTips: String(parsed?.weatherTips || '').trim(),
    recommendedProducts,
    bulkSellAdvice: String(parsed?.bulkSellAdvice || '').trim(),
    confidence,
  };
}

function fallbackInsights(input) {
  const weather = input.tomorrowWeather || {};
  const entries = weather.entries || [];
  const temps = entries.map((e) => e.temperature).filter((t) => t != null);
  const avgTemp =
    temps.length > 0 ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : null;
  const rainy = entries.some((e) => (e.pop ?? 0) > 0.4 || /rain|storm|drizzle/i.test(e.description || ''));

  const summary =
    avgTemp != null
      ? `Tomorrow expects around ${avgTemp}°C${rainy ? ' with rain likely' : ''} near your location.`
      : 'Tomorrow weather data is limited; plan for typical local conditions.';

  const products =
    input.recentListings?.length > 0
      ? input.recentListings.slice(0, 3).map((l) => ({
          name: l.itemName,
          category: l.foodCategory,
          reason: 'Based on your recent listings on FoodLoop.',
          suggestedQuantity: String(Math.max(5, Number(l.quantity) || 10)),
        }))
      : [
          {
            name: 'Rice and curry portions',
            category: 'Cooked Meals',
            reason: 'Popular surplus item in Sri Lanka.',
            suggestedQuantity: '15–25',
          },
        ];

  return {
    tomorrowWeatherSummary: summary,
    weatherTips: rainy
      ? 'Use cold storage and prioritize quick pickup for perishables.'
      : 'Good day for both cooked meals and bakery items if kept covered.',
    recommendedProducts: products,
    bulkSellAdvice:
      'List high-demand items early tomorrow morning with clear pickup windows to maximize claims.',
    confidence: 'low',
    source: 'fallback',
  };
}

async function generateTomorrowInsights(input) {
  const systemInstruction = `You are a FoodLoop supplier advisor for Sri Lankan food businesses.
Return ONLY valid JSON with this shape:
{
  "tomorrowWeatherSummary": "string",
  "weatherTips": "string",
  "recommendedProducts": [
    { "name": "string", "category": "string", "reason": "string", "suggestedQuantity": "string" }
  ],
  "bulkSellAdvice": "string",
  "confidence": "high|medium|low"
}
Rules:
- Focus on TOMORROW only (not today).
- Combine weather forecast with supplier history and draft listing hints.
- Suggest realistic Sri Lankan surplus foods (cooked meals, bakery, produce, etc.).
- suggestedQuantity is a human-readable range or number (e.g. "20-30 plates").
- If rain/heat/humidity is significant, mention storage and spoilage risk.
- Do not invent FoodLoop policies or prices.`;

  const userMessage = `Analyze this supplier data and recommend what to prepare or list in bulk tomorrow:

${JSON.stringify(input, null, 2)}`;

  try {
    const text = await generateChatReply({
      systemInstruction,
      message: userMessage,
      history: [],
    });
    const parsed = parseJsonFromText(text);
    return { ...normalizeInsights(parsed), source: 'gemini' };
  } catch (err) {
    console.warn('[supplierTomorrowInsights] Gemini fallback:', err?.message || err);
    return fallbackInsights(input);
  }
}

module.exports = {
  generateTomorrowInsights,
  normalizeInsights,
  fallbackInsights,
};
