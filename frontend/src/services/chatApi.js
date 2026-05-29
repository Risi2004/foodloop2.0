import { buildUrl } from './api';

const ERROR_MESSAGES = {
  en: {
    GEMINI_NOT_CONFIGURED: 'FoodLoop AI is not configured on the server yet.',
    CHAT_KNOWLEDGE_NOT_INDEXED:
      'FoodLoop AI is still being set up. Please try again later or contact support.',
    CHAT_RATE_LIMIT: 'Too many messages. Please wait a few minutes and try again.',
    GEMINI_RATE_LIMIT: 'The AI service is busy. Please wait a moment and try again.',
    GEMINI_UNAVAILABLE: 'FoodLoop AI is temporarily unavailable. Please try again later.',
    CHAT_INVALID_MESSAGE: 'Please enter a message.',
    default: "Sorry, I couldn't get a response. Please try again.",
  },
  ta: {
    GEMINI_NOT_CONFIGURED: 'சேவையகத்தில் FoodLoop AI இன்னும் அமைக்கப்படவில்லை.',
    CHAT_KNOWLEDGE_NOT_INDEXED:
      'FoodLoop AI இன்னும் தயாராகிறது. பின்னர் முயற்சிக்கவும் அல்லது ஆதரவைத் தொடர்பு கொள்ளவும்.',
    CHAT_RATE_LIMIT: 'அதிக செய்திகள். சில நிமிடங்கள் காத்திருந்து மீண்டும் முயற்சிக்கவும்.',
    GEMINI_RATE_LIMIT: 'AI சேவை பிஸியாக உள்ளது. சிறிது நேரம் காத்திருந்து முயற்சிக்கவும்.',
    GEMINI_UNAVAILABLE: 'FoodLoop AI தற்காலிகமாக கிடைக்கவில்லை. பின்னர் முயற்சிக்கவும்.',
    CHAT_INVALID_MESSAGE: 'செய்தியை உள்ளிடவும்.',
    default: 'மன்னிக்கவும், பதிலைப் பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  },
  si: {
    GEMINI_NOT_CONFIGURED: 'සේවාදායකයේ FoodLoop AI තවම සකසා නැත.',
    CHAT_KNOWLEDGE_NOT_INDEXED:
      'FoodLoop AI තවම සකසමින් පවතී. පසුව නැවත උත්සාහ කරන්න හෝ සහාය අමතන්න.',
    CHAT_RATE_LIMIT: 'පණිවිඩ වැඩිය. මිනිත්තු කිහිපයක් රැඳී නැවත උත්සාහ කරන්න.',
    GEMINI_RATE_LIMIT: 'AI සේවාව කාර්යබහුලයි. මොහොතක් රැඳී නැවත උත්සාහ කරන්න.',
    GEMINI_UNAVAILABLE: 'FoodLoop AI තාවකාලිකව ලබා ගත නොහැක. පසුව නැවත උත්සාහ කරන්න.',
    CHAT_INVALID_MESSAGE: 'පණිවිඩයක් ඇතුළත් කරන්න.',
    default: 'සමාවන්න, පිළිතුර ලබා ගැනීමට නොහැකි විය. නැවත උත්සාහ කරන්න.',
  },
};

function mapErrorMessage(code, message, language) {
  const lang = ERROR_MESSAGES[language] ? language : 'en';
  const map = ERROR_MESSAGES[lang];
  if (code && map[code]) return map[code];
  if (message) return message;
  return map.default;
}

/**
 * Send a message to the FoodLoop RAG chatbot API.
 * @param {string} message
 * @param {Array<{ role: 'user'|'model', text: string }>} history
 * @param {string} language - en | ta | si
 * @returns {Promise<string>}
 */
export async function sendMessage(message, history = [], language = 'en') {
  const response = await fetch(buildUrl('/api/chat/message'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, language }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(
      mapErrorMessage(data.code, data.message, language)
    );
    err.code = data.code;
    throw err;
  }

  if (!data.success || !data.reply) {
    throw new Error(mapErrorMessage('default', null, language));
  }

  return data.reply;
}
