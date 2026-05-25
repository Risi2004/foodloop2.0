const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_MODEL = 'gemini-3.5-flash';
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];

const FOOD_CATEGORIES = [
  'Cooked Meals',
  'Bakery',
  'Produce',
  'Dairy',
  'Packaged Goods',
  'Beverages',
  'Other',
];

class FoodVisionError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = 'FoodVisionError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function getModelCandidates() {
  const preferred = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
  const seen = new Set();
  const candidates = [];
  for (const name of [preferred, ...FALLBACK_MODELS, DEFAULT_MODEL]) {
    if (name && !seen.has(name)) {
      seen.add(name);
      candidates.push(name);
    }
  }
  return candidates;
}

function isQuotaExhaustedError(err) {
  const msg = String(err?.message || '');
  return (
    (err?.status === 429 || err?.statusCode === 429) &&
    (msg.includes('limit: 0') || msg.includes('Quota exceeded'))
  );
}

function mapGeminiError(err, modelTried) {
  const status = err?.status || err?.statusCode;

  if (status === 429) {
    if (isQuotaExhaustedError(err)) {
      return new FoodVisionError(
        'GEMINI_QUOTA_EXCEEDED',
        'Gemini API free-tier quota is unavailable for this key (limit 0). Open Google AI Studio, ensure the API key project has billing enabled (required for free tier), or try again after the daily quota resets. You can set GEMINI_MODEL=gemini-3.5-flash in backend/.env.',
        503
      );
    }
    return new FoodVisionError(
      'GEMINI_RATE_LIMIT',
      'Too many image analysis requests. Please wait about a minute and try again.',
      503
    );
  }

  return new FoodVisionError(
    'GEMINI_UNAVAILABLE',
    `Food image analysis failed (${modelTried}). Please try again later.`,
    503
  );
}

async function generateVisionResult(genAI, modelName, base64, mime) {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  return model.generateContent([
    { text: ANALYSIS_PROMPT },
    {
      inlineData: {
        mimeType: mime,
        data: base64,
      },
    },
  ]);
}

function assertGeminiConfigured() {
  if (!process.env.GEMINI_API_KEY) {
    throw new FoodVisionError(
      'GEMINI_NOT_CONFIGURED',
      'Food image analysis is not configured. Set GEMINI_API_KEY on the server.',
      503
    );
  }
}

function parseJsonFromText(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  return JSON.parse(candidate);
}

function normalizeStorage(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'hot' || v === 'warm') return 'Hot';
  if (v === 'cold' || v === 'chilled' || v === 'refrigerated') return 'Cold';
  if (v === 'dry' || v === 'room' || v === 'ambient') return 'Dry';
  return 'Hot';
}

function normalizeProductType(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'packed' || v === 'packaged') return 'packed';
  if (v === 'cooked' || v === 'fresh') return 'cooked';
  return 'other';
}

function clamp01(n, fallback = 0.85) {
  const x = Number(n);
  if (Number.isNaN(x)) return fallback;
  return Math.min(1, Math.max(0, x));
}

function buildPredictions(parsed) {
  const category = FOOD_CATEGORIES.includes(parsed.foodCategory)
    ? parsed.foodCategory
    : 'Other';

  let expiryDateFromPackage = null;
  if (parsed.expiryDateFromPackage) {
    try {
      const d = new Date(parsed.expiryDateFromPackage);
      if (!Number.isNaN(d.getTime())) {
        expiryDateFromPackage = d.toISOString().split('T')[0];
      }
    } catch {
      expiryDateFromPackage = null;
    }
  }

  const quantity = Math.max(1, Math.round(Number(parsed.quantity) || 1));

  let suggestedPrice = null;
  if (parsed.suggestedPrice != null && parsed.suggestedPrice !== '') {
    const price = Number(parsed.suggestedPrice);
    if (!Number.isNaN(price) && price >= 0) {
      suggestedPrice = Math.round(price);
    }
  }

  return {
    foodCategory: category,
    itemName: String(parsed.itemName || 'Item').trim().slice(0, 200),
    quantity,
    storageRecommendation: normalizeStorage(parsed.storageRecommendation),
    confidence: clamp01(parsed.confidence, 0.9),
    qualityScore: clamp01(parsed.qualityScore, 0.85),
    freshness: String(parsed.freshness || 'good').trim(),
    productType: normalizeProductType(parsed.productType),
    expiryDateFromPackage,
    detectedItems: Array.isArray(parsed.detectedItems)
      ? parsed.detectedItems.map((s) => String(s).trim()).filter(Boolean).slice(0, 20)
      : [],
    isFood: parsed.isFood !== false,
    isSpoiled: parsed.isSpoiled === true,
    suggestedPrice,
  };
}

function validateVisionResult(parsed) {
  if (parsed.isAiGenerated === true) {
    throw new FoodVisionError(
      'AI_GENERATED_IMAGE',
      'AI-generated images are not allowed. Please upload a real photo.'
    );
  }
}

const ANALYSIS_PROMPT = `You analyze a SINGLE real photograph for a surplus food and goods sharing app (donations or cash sales).

Return ONLY valid JSON (no markdown) with this exact shape:
{
  "isAiGenerated": boolean,
  "isFood": boolean,
  "isSpoiled": boolean,
  "foodCategory": string,
  "itemName": string,
  "quantity": number,
  "storageRecommendation": "Hot" | "Cold" | "Dry",
  "confidence": number,
  "qualityScore": number,
  "freshness": string,
  "productType": "cooked" | "packed" | "other",
  "expiryDateFromPackage": string | null,
  "detectedItems": string[],
  "suggestedPrice": number | null
}

Rules:
1. isAiGenerated: true only for synthetic/CGI/AI/illustration/stock renders — not a real camera photo.
2. isFood: true if edible food is a main subject; false for non-food goods (equipment, packaging only, etc.) — do not treat this as a rejection, just label accurately.
3. isSpoiled: true only when visible spoilage or clearly unsafe food is present (mold, rot, etc.); false otherwise. This is advisory only.
4. foodCategory: one of ${FOOD_CATEGORIES.join(', ')}; use "Other" for non-food items.
5. itemName: short description of what is visible.
6. quantity: positive integer count of items/servings/units (minimum 1).
7. storageRecommendation: Hot, Cold, or Dry (best guess for the item).
8. suggestedPrice: fair resale price in Sri Lankan Rupees (LKR) as a whole number if the item could be sold; null if not applicable or uncertain.
9. confidence and qualityScore: 0 to 1.
10. expiryDateFromPackage: YYYY-MM-DD if readable on packaging, else null.`;

async function analyzeFoodImage(buffer, mimetype) {
  assertGeminiConfigured();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const base64 = buffer.toString('base64');
  const mime = mimetype || 'image/jpeg';
  const candidates = getModelCandidates();

  let result;
  let lastErr;

  for (let i = 0; i < candidates.length; i += 1) {
    const modelName = candidates[i];
    try {
      result = await generateVisionResult(genAI, modelName, base64, mime);
      if (i > 0) {
        console.warn(`[geminiFoodVision] Succeeded with fallback model: ${modelName}`);
      }
      break;
    } catch (err) {
      lastErr = err;
      console.error(`Gemini API error (model=${modelName}):`, err?.message || err);

      const canTryNext =
        i < candidates.length - 1 && isQuotaExhaustedError(err);
      if (canTryNext) {
        console.warn(`[geminiFoodVision] Retrying with next model after quota error on ${modelName}`);
        continue;
      }

      throw mapGeminiError(err, modelName);
    }
  }

  if (!result) {
    throw mapGeminiError(lastErr, candidates[candidates.length - 1]);
  }

  const text = result?.response?.text?.();
  if (!text) {
    throw new FoodVisionError(
      'GEMINI_UNAVAILABLE',
      'Food image analysis returned no result. Please try again.',
      503
    );
  }

  let parsed;
  try {
    parsed = parseJsonFromText(text);
  } catch (err) {
    console.error('Gemini JSON parse error:', err, text);
    throw new FoodVisionError(
      'GEMINI_PARSE_ERROR',
      'Could not interpret the image analysis. Please try another photo.',
      500
    );
  }

  validateVisionResult(parsed);
  return buildPredictions(parsed);
}

module.exports = {
  analyzeFoodImage,
  FoodVisionError,
  FOOD_CATEGORIES,
};
