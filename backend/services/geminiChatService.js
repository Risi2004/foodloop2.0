const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash'];

class ChatError extends Error {
  constructor(code, message, statusCode = 503) {
    super(message);
    this.name = 'ChatError';
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

function assertGeminiConfigured() {
  if (!process.env.GEMINI_API_KEY) {
    throw new ChatError(
      'GEMINI_NOT_CONFIGURED',
      'FoodLoop AI chat is not configured. Set GEMINI_API_KEY on the server.'
    );
  }
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
    return new ChatError(
      'GEMINI_RATE_LIMIT',
      'Too many chat requests. Please wait a moment and try again.'
    );
  }
  return new ChatError(
    'GEMINI_UNAVAILABLE',
    `Chat failed (${modelTried}). Please try again later.`
  );
}

function toGeminiHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m?.text && String(m.text).trim())
    .slice(-10)
    .map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.text).trim() }],
    }));
}

async function generateChatReply({ systemInstruction, message, history = [] }) {
  assertGeminiConfigured();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const candidates = getModelCandidates();
  const geminiHistory = toGeminiHistory(history);

  let lastErr;
  for (let i = 0; i < candidates.length; i += 1) {
    const modelName = candidates[i];
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
      });

      const chat = model.startChat({ history: geminiHistory });
      const result = await chat.sendMessage(String(message).trim());
      const text = result?.response?.text?.();
      if (!text?.trim()) {
        throw new ChatError('GEMINI_EMPTY', 'Chat returned no response.');
      }
      return text.trim();
    } catch (err) {
      lastErr = err;
      if (err instanceof ChatError) throw err;
      const msg = String(err?.message || '');
      const status = err?.status || err?.statusCode;
      const is404 = status === 404 || msg.includes('not found');
      const is503 = status === 503 || msg.includes('high demand') || msg.includes('Unavailable');
      const canTryNext =
        i < candidates.length - 1 && (isQuotaExhaustedError(err) || is404 || is503);
      if (canTryNext) {
        console.warn(`[geminiChat] Model ${modelName} unavailable, trying next.`);
        continue;
      }
      throw mapGeminiError(err, modelName);
    }
  }

  throw mapGeminiError(lastErr, candidates[candidates.length - 1]);
}

module.exports = {
  generateChatReply,
  ChatError,
};
