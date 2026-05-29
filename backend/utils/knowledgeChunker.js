const CHUNK_SIZE = 700;
const CHUNK_OVERLAP = 100;

function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitIntoChunks(text, source) {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let buffer = '';

  const flush = () => {
    const piece = buffer.trim();
    if (piece.length >= 40) {
      chunks.push({ source, text: piece });
    }
    buffer = '';
  };

  for (const para of paragraphs) {
    if (!buffer) {
      buffer = para;
      continue;
    }
    if (`${buffer}\n\n${para}`.length <= CHUNK_SIZE) {
      buffer = `${buffer}\n\n${para}`;
      continue;
    }
    flush();
    buffer = para;
  }
  flush();

  const withOverlap = [];
  for (let i = 0; i < chunks.length; i += 1) {
    let text = chunks[i].text;
    if (i > 0 && CHUNK_OVERLAP > 0) {
      const prev = chunks[i - 1].text;
      const tail = prev.slice(Math.max(0, prev.length - CHUNK_OVERLAP));
      text = `${tail}\n\n${text}`;
    }
    withOverlap.push({ source: chunks[i].source, text: text.slice(0, CHUNK_SIZE + CHUNK_OVERLAP) });
  }

  if (withOverlap.length === 0 && normalized.length >= 20) {
    for (let start = 0; start < normalized.length; start += CHUNK_SIZE - CHUNK_OVERLAP) {
      withOverlap.push({
        source,
        text: normalized.slice(start, start + CHUNK_SIZE),
      });
    }
  }

  return withOverlap;
}

module.exports = {
  normalizeText,
  splitIntoChunks,
  CHUNK_SIZE,
  CHUNK_OVERLAP,
};
