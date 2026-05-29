const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-001';
const FALLBACK_EMBEDDING_MODELS = ['gemini-embedding-001', 'text-embedding-004', 'embedding-001'];

class EmbeddingError extends Error {
  constructor(code, message, statusCode = 503) {
    super(message);
    this.name = 'EmbeddingError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function getEmbeddingModelCandidates() {
  const preferred = (process.env.CHAT_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL).trim();
  const seen = new Set();
  const list = [];
  for (const name of [preferred, ...FALLBACK_EMBEDDING_MODELS, DEFAULT_EMBEDDING_MODEL]) {
    if (name && !seen.has(name)) {
      seen.add(name);
      list.push(name);
    }
  }
  return list;
}

function getOutputDimensionality() {
  const n = Number(process.env.CHAT_EMBEDDING_DIMENSIONS);
  return Number.isFinite(n) && n > 0 ? n : 768;
}

function assertGeminiConfigured() {
  if (!process.env.GEMINI_API_KEY) {
    throw new EmbeddingError(
      'GEMINI_NOT_CONFIGURED',
      'Gemini API is not configured. Set GEMINI_API_KEY on the server.'
    );
  }
}

async function embedViaRest(modelName, text, taskType) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  const body = {
    content: { parts: [{ text }] },
  };

  if (modelName.startsWith('gemini-embedding')) {
    body.taskType = taskType;
    body.outputDimensionality = getOutputDimensionality();
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  const values = data?.embedding?.values;
  if (!values?.length) {
    throw new Error('Embedding API returned no vector');
  }
  return values;
}

async function embedViaSdk(modelName, text, taskType) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: modelName });
  const request = { content: { role: 'user', parts: [{ text }] } };
  if (modelName.startsWith('gemini-embedding')) {
    request.taskType = taskType;
    request.outputDimensionality = getOutputDimensionality();
  }
  const result = await model.embedContent(request);
  const values = result?.embedding?.values;
  if (!values?.length) {
    throw new Error('Embedding SDK returned no vector');
  }
  return values;
}

async function embedQuery(text) {
  return embedText(text, 'RETRIEVAL_QUERY');
}

async function embedText(text, taskType = 'RETRIEVAL_DOCUMENT') {
  assertGeminiConfigured();
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    throw new EmbeddingError('EMBEDDING_EMPTY', 'Cannot embed empty text.', 400);
  }

  const candidates = getEmbeddingModelCandidates();
  let lastErr;

  for (let i = 0; i < candidates.length; i += 1) {
    const modelName = candidates[i];
    try {
      if (modelName.startsWith('gemini-embedding')) {
        return await embedViaRest(modelName, trimmed, taskType);
      }
      return await embedViaSdk(modelName, trimmed, taskType);
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || '');
      const is404 = err?.status === 404 || msg.includes('not found');
      if (is404 && i < candidates.length - 1) {
        console.warn(`[geminiEmbeddings] Model ${modelName} unavailable, trying next.`);
        continue;
      }
      break;
    }
  }

  const status = lastErr?.status || lastErr?.statusCode;
  if (status === 429) {
    throw new EmbeddingError(
      'GEMINI_RATE_LIMIT',
      'Too many requests to the AI service. Please try again shortly.'
    );
  }

  throw new EmbeddingError(
    'GEMINI_UNAVAILABLE',
    `Embedding failed: ${lastErr?.message || 'unknown error'}`
  );
}

function getEmbeddingModelName() {
  return getEmbeddingModelCandidates()[0];
}

module.exports = {
  embedText,
  embedQuery,
  EmbeddingError,
  getEmbeddingModelName,
  getOutputDimensionality,
};
