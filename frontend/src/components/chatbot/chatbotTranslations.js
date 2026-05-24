/**
 * Chatbot UI translations for English (en), Tamil (ta), Sinhala (si).
 * Keys: welcomeGuest, welcomeAuthenticated (use {name}), headerTitle, inputPlaceholder,
 * errorGeneric, ariaOpen, ariaClose, ariaSend, langEnglish, langTamil, langSinhala.
 */

const translations = {
  en: {
    welcomeGuest: 'Welcome to our FoodLoop AI. How can I help you?',
    welcomeAuthenticated: 'Hi {name}! Welcome to FoodLoop AI. How can I help you?',
    headerTitle: 'FoodLoop AI Chat Bot',
    inputPlaceholder: 'Type here',
    errorGeneric: "Sorry, I couldn't get a response. Please try again.",
    ariaOpen: 'Open chatbot',
    ariaClose: 'Close chatbot',
    ariaSend: 'Send message',
    ariaInput: 'Type your message',
    langEnglish: 'English',
    langTamil: 'Tamil',
    langSinhala: 'Sinhala',
  },
  ta: {
    welcomeGuest: 'FoodLoop AI க்கு வரவேற்கிறோம். நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?',
    welcomeAuthenticated: 'வணக்கம் {name}! FoodLoop AI க்கு வரவேற்கிறோம். நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?',
    headerTitle: 'FoodLoop AI அரட்டை துணை',
    inputPlaceholder: 'இங்கே தட்டச்சு செய்யுங்கள்',
    errorGeneric: 'மன்னிக்கவும், பதிலைப் பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
    ariaOpen: 'அரட்டையைத் திற',
    ariaClose: 'அரட்டையை மூடு',
    ariaSend: 'அனுப்பு',
    ariaInput: 'உங்கள் செய்தியை தட்டச்சு செய்யுங்கள்',
    langEnglish: 'ஆங்கிலம்',
    langTamil: 'தமிழ்',
    langSinhala: 'සිංහල',
  },
  si: {
    welcomeGuest: 'FoodLoop AI වෙත සාදරයෙන් පිළිගනිමු. මම ඔබට කෙසේ උදව් කළ හැකිද?',
    welcomeAuthenticated: 'ආයුබෝවන් {name}! FoodLoop AI වෙත සාදරයෙන් පිළිගනිමු. මම ඔබට කෙසේ උදව් කළ හැකිද?',
    headerTitle: 'FoodLoop AI සංවාද බොට්',
    inputPlaceholder: 'මෙහි ටයිප් කරන්න',
    errorGeneric: 'සමාවන්න, පිළිතුර ලබා ගැනීමට නොහැකි විය. නැවත උත්සාහ කරන්න.',
    ariaOpen: 'සංවාද බොට් අරින්න',
    ariaClose: 'සංවාද බොට් වසන්න',
    ariaSend: 'යවන්න',
    ariaInput: 'ඔබේ පණිවිඩය ටයිප් කරන්න',
    langEnglish: 'English',
    langTamil: 'தமிழ்',
    langSinhala: 'සිංහල',
  },
};

const SUPPORTED_LANGS = ['en', 'ta', 'si'];
const DEFAULT_LANG = 'en';

/**
 * Get translated string for the chatbot.
 * @param {string} lang - Language code: 'en' | 'ta' | 'si'
 * @param {string} key - Translation key (e.g. 'welcomeGuest', 'headerTitle')
 * @param {Record<string, string>} [params] - Optional params for template (e.g. { name: 'John' })
 * @returns {string}
 */
export function getChatbotText(lang, key, params = {}) {
  const normalized = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
  const map = translations[normalized] || translations[DEFAULT_LANG];
  let str = map[key] != null ? map[key] : (translations[DEFAULT_LANG][key] ?? key);
  Object.keys(params).forEach((k) => {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
  });
  return str;
}

export { translations, SUPPORTED_LANGS, DEFAULT_LANG };
