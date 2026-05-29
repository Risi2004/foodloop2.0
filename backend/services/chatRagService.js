const { embedQuery } = require('./geminiEmbeddings');
const { generateChatReply } = require('./geminiChatService');
const { isIndexAvailable, searchRelevantChunks } = require('./chatKnowledgeIndex');

const SUPPORTED_LANGS = ['en', 'ta', 'si'];

const OFF_TOPIC_REPLIES = {
  en: 'I can only help with questions about FoodLoop — our website, features, roles, signup, donations, and how to use the platform. Please ask something related to FoodLoop.',
  ta: 'நான் FoodLoop பற்றிய கேள்விகளுக்கு மட்டுமே உதவ முடியும் — வலைத்தளம், அம்சங்கள், பதிவு, நன்கொடைகள் மற்றும் தளத்தை எவ்வாறு பயன்படுத்துவது. FoodLoop தொடர்பான கேள்வியைக் கேளுங்கள்.',
  si: 'මට උදව් කළ හැක්කේ FoodLoop සම්බන්ධ ප්‍රශ්න සඳහා පමණි — වෙබ් අඩවිය, විශේෂාංග, ලියාපදිංචිය, දානයන් සහ වේදිකාව භාවිතා කරන ආකාරය. FoodLoop සම්බන්ධ ප්‍රශ්නයක් අසන්න.',
};

const LOW_CONTEXT_REPLIES = {
  en: "I don't have enough FoodLoop documentation to answer that. Try rephrasing your question or visit the Contact page for support.",
  ta: 'அதற்கு பதிலளிக்க போதுமான FoodLoop தகவல் என்னிடம் இல்லை. உங்கள் கேள்வியை மாற்றி முயற்சிக்கவும் அல்லது Contact பக்கத்தில் ஆதரவைத் தொடர்பு கொள்ளவும்.',
  si: 'එයට පිළිතුර දීමට ප්‍රමාණවත් FoodLoop තොරතුරු මා වෙත නැත. ඔබේ ප්‍රශ්නය වෙනස් කර නැවත උත්සාහ කරන්න හෝ Contact පිටුවෙන් සහාය ලබා ගන්න.',
};

function normalizeLang(language) {
  const lang = String(language || 'en').toLowerCase();
  return SUPPORTED_LANGS.includes(lang) ? lang : 'en';
}

function buildContextBlock(chunks) {
  if (!chunks.length) return '(No matching documentation found.)';
  return chunks
    .map((c, i) => `[${i + 1}] (source: ${c.source}, relevance: ${c.score.toFixed(2)})\n${c.text}`)
    .join('\n\n---\n\n');
}

function buildSystemInstruction(context, lang) {
  const langName = lang === 'ta' ? 'Tamil' : lang === 'si' ? 'Sinhala' : 'English';

  return `You are FoodLoop Help, the official assistant for the FoodLoop food surplus redistribution website in Sri Lanka.

RULES (strict):
1. Answer ONLY questions about FoodLoop: the website, features, user roles (supplier/donor, receiver/NGO, driver, customer, admin), signup, login, donations, claims, deliveries, marketplace, earnings, maintenance mode, privacy, terms, and contact.
2. Use ONLY the CONTEXT below. Do not invent features, prices, policies, or URLs not supported by the context.
3. If the user asks about unrelated topics (general knowledge, other companies, coding, weather, homework, etc.), politely refuse and say you only help with FoodLoop.
4. If the context does not contain the answer, say you are not sure and suggest the Contact page or rephrasing — do not guess.
5. Respond entirely in ${langName} (${lang}).
6. Be concise, friendly, and accurate. No markdown bold/italic with asterisks.

CONTEXT:
${context}`;
}

async function answerChatMessage({ message, history = [], language = 'en' }) {
  const lang = normalizeLang(language);
  const trimmed = String(message || '').trim();
  if (!trimmed) {
    return { reply: LOW_CONTEXT_REPLIES[lang], refused: true };
  }

  if (!isIndexAvailable()) {
    const err = new Error('Knowledge index not built. Run npm run chat:ingest in the backend folder.');
    err.code = 'CHAT_KNOWLEDGE_NOT_INDEXED';
    err.statusCode = 503;
    throw err;
  }

  const queryEmbedding = await embedQuery(trimmed);
  const { chunks, topScore } = searchRelevantChunks(queryEmbedding);

  if (!chunks.length || topScore < (Number(process.env.CHAT_MIN_SCORE) || 0.35)) {
    return { reply: LOW_CONTEXT_REPLIES[lang], refused: true };
  }

  const context = buildContextBlock(chunks);
  const systemInstruction = buildSystemInstruction(context, lang);
  const reply = await generateChatReply({
    systemInstruction,
    message: trimmed,
    history,
  });

  const lower = reply.toLowerCase();
  const looksLikeRefusal =
    lower.includes('only help with') ||
    lower.includes('foodloop') && lower.includes('cannot') ||
    lower.includes('not related');

  return {
    reply,
    refused: looksLikeRefusal,
    meta: { topScore, chunkCount: chunks.length },
  };
}

function getOffTopicReply(language) {
  return OFF_TOPIC_REPLIES[normalizeLang(language)];
}

module.exports = {
  answerChatMessage,
  getOffTopicReply,
  OFF_TOPIC_REPLIES,
  LOW_CONTEXT_REPLIES,
};
