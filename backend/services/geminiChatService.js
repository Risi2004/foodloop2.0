const { GoogleGenerativeAI } = require('@google/generative-ai');

const CHAT_DEFAULT_MODEL = 'gemini-2.5-flash';
/** Models that exist on the current Gemini API (1.5-flash often 404). */
const CHAT_FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

const RETRY_DELAY_MS = 1500;
const MAX_ATTEMPTS_PER_MODEL = 2;

class ChatError extends Error {
  constructor(code, message, statusCode = 503) {
    super(message);
    this.name = 'ChatError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getModelCandidates() {
  const preferred = (process.env.CHAT_GEMINI_MODEL || CHAT_DEFAULT_MODEL).trim();
  const seen = new Set();
  const candidates = [];
  for (const name of [preferred, ...CHAT_FALLBACK_MODELS, CHAT_DEFAULT_MODEL]) {
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

function isRetryableError(err) {
  const msg = String(err?.message || '');
  const status = err?.status || err?.statusCode;
  return (
    status === 429 ||
    status === 503 ||
    msg.includes('high demand') ||
    msg.includes('Unavailable') ||
    msg.includes('ECONNRESET') ||
    msg.includes('fetch failed')
  );
}

function mapGeminiError(err, modelTried) {
  const status = err?.status || err?.statusCode;
  const detail = String(err?.message || '').slice(0, 200);
  console.error(`[geminiChat] Failed (${modelTried}):`, detail);

  if (status === 429 || isQuotaExhaustedError(err)) {
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

async function sendViaStartChat(model, systemInstruction, message, geminiHistory) {
  const chat = model.startChat({ history: geminiHistory });
  const result = await chat.sendMessage(String(message).trim());
  const text = result?.response?.text?.();
  if (!text?.trim()) {
    throw new ChatError('GEMINI_EMPTY', 'Chat returned no response.');
  }
  return text.trim();
}

async function sendViaGenerateContent(model, systemInstruction, message, geminiHistory) {
  const contents = [
    ...geminiHistory,
    { role: 'user', parts: [{ text: String(message).trim() }] },
  ];
  const result = await model.generateContent({ contents });
  const text = result?.response?.text?.();
  if (!text?.trim()) {
    throw new ChatError('GEMINI_EMPTY', 'Chat returned no response.');
  }
  return text.trim();
}

async function tryModel(genAI, modelName, systemInstruction, message, geminiHistory) {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
  });

  let lastErr;
  for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt += 1) {
    try {
      try {
        return await sendViaStartChat(model, systemInstruction, message, geminiHistory);
      } catch (startErr) {
        if (startErr instanceof ChatError) throw startErr;
        console.warn(`[geminiChat] startChat failed (${modelName}), trying generateContent`);
        return await sendViaGenerateContent(model, systemInstruction, message, geminiHistory);
      }
    } catch (err) {
      lastErr = err;
      if (err instanceof ChatError && err.code !== 'GEMINI_EMPTY') throw err;
      const retryable = isRetryableError(err);
      if (retryable && attempt < MAX_ATTEMPTS_PER_MODEL - 1) {
        console.warn(
          `[geminiChat] ${modelName} attempt ${attempt + 1} failed, retrying in ${RETRY_DELAY_MS}ms`
        );
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
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
      return await tryModel(genAI, modelName, systemInstruction, message, geminiHistory);
    } catch (err) {
      lastErr = err;
      if (err instanceof ChatError && err.code !== 'GEMINI_EMPTY') {
        const canTryNext = i < candidates.length - 1;
        if (canTryNext) {
          console.warn(`[geminiChat] Model ${modelName} failed, trying next.`);
          continue;
        }
        throw err;
      }
      const msg = String(err?.message || '');
      const status = err?.status || err?.statusCode;
      const is404 = status === 404 || msg.includes('not found');
      const canTryNext =
        i < candidates.length - 1 && (isRetryableError(err) || is404);
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
