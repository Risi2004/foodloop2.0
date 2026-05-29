const fs = require('fs');
const path = require('path');

const INDEX_PATH = path.join(__dirname, '../knowledge/built/index.json');

let cachedIndex = null;
let cachedMtimeMs = 0;

function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function loadIndex(force = false) {
  if (!fs.existsSync(INDEX_PATH)) {
    cachedIndex = null;
    return null;
  }

  const stat = fs.statSync(INDEX_PATH);
  if (!force && cachedIndex && stat.mtimeMs === cachedMtimeMs) {
    return cachedIndex;
  }

  const raw = fs.readFileSync(INDEX_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed?.chunks || !Array.isArray(parsed.chunks)) {
    cachedIndex = null;
    return null;
  }

  cachedIndex = parsed;
  cachedMtimeMs = stat.mtimeMs;
  return cachedIndex;
}

function isIndexAvailable() {
  return Boolean(loadIndex());
}

function getIndexMeta() {
  const index = loadIndex();
  if (!index) return null;
  return {
    chunkCount: index.chunks.length,
    builtAt: index.builtAt || null,
    embeddingModel: index.embeddingModel || null,
  };
}

function searchRelevantChunks(queryEmbedding, options = {}) {
  const topK = options.topK ?? (Number(process.env.CHAT_TOP_K) || 5);
  const minScore = options.minScore ?? (Number(process.env.CHAT_MIN_SCORE) || 0.35);

  const index = loadIndex();
  if (!index || !queryEmbedding?.length) {
    return { chunks: [], topScore: 0 };
  }

  const scored = index.chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const topScore = scored[0]?.score ?? 0;
  return { chunks: scored, topScore };
}

module.exports = {
  INDEX_PATH,
  loadIndex,
  isIndexAvailable,
  getIndexMeta,
  searchRelevantChunks,
  cosineSimilarity,
};
