/**
 * Build chatbot knowledge index from website markdown + PDF sources.
 * Usage: cd backend && npm run chat:ingest
 */
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { splitIntoChunks } = require('../utils/knowledgeChunker');
const { embedText, getEmbeddingModelName } = require('../services/geminiEmbeddings');

const WEBSITE_DIR = path.join(__dirname, '../knowledge/website');
const SOURCES_DIR = path.join(__dirname, '../knowledge/sources');
const BUILT_DIR = path.join(__dirname, '../knowledge/built');
const INDEX_PATH = path.join(BUILT_DIR, 'index.json');

function listFiles(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(ext))
    .map((f) => path.join(dir, f));
}

async function loadPdfText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text || '';
}

async function collectDocuments() {
  const docs = [];

  for (const filePath of listFiles(WEBSITE_DIR, '.md')) {
    const text = fs.readFileSync(filePath, 'utf8');
    docs.push({
      source: `website/${path.basename(filePath)}`,
      text,
    });
  }

  for (const filePath of listFiles(SOURCES_DIR, '.pdf')) {
    console.log(`Reading PDF: ${path.basename(filePath)}`);
    const text = await loadPdfText(filePath);
    docs.push({
      source: `sources/${path.basename(filePath)}`,
      text,
    });
  }

  return docs;
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is required. Set it in backend/.env');
    process.exit(1);
  }

  const docs = await collectDocuments();
  if (!docs.length) {
    console.error('No knowledge files found. Add .md files to knowledge/website/ and/or .pdf to knowledge/sources/');
    process.exit(1);
  }

  const rawChunks = [];
  for (const doc of docs) {
    const parts = splitIntoChunks(doc.text, doc.source);
    rawChunks.push(...parts);
    console.log(`  ${doc.source}: ${parts.length} chunk(s)`);
  }

  if (!rawChunks.length) {
    console.error('No text chunks produced from sources.');
    process.exit(1);
  }

  console.log(`Embedding ${rawChunks.length} chunks with ${getEmbeddingModelName()}...`);

  const chunks = [];
  for (let i = 0; i < rawChunks.length; i += 1) {
    const { source, text } = rawChunks[i];
    process.stdout.write(`\r  ${i + 1}/${rawChunks.length}`);
    const embedding = await embedText(text);
    chunks.push({
      id: `chunk_${i + 1}`,
      source,
      text,
      embedding,
    });
    await new Promise((r) => setTimeout(r, 120));
  }
  process.stdout.write('\n');

  if (!fs.existsSync(BUILT_DIR)) {
    fs.mkdirSync(BUILT_DIR, { recursive: true });
  }

  const index = {
    builtAt: new Date().toISOString(),
    embeddingModel: getEmbeddingModelName(),
    chunkCount: chunks.length,
    chunks,
  };

  fs.writeFileSync(INDEX_PATH, JSON.stringify(index));
  console.log(`Wrote ${INDEX_PATH} (${chunks.length} chunks)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
