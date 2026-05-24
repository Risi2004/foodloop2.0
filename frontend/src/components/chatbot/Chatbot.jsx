import { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import chatbotIcon from '../../assets/chatbot/chatbot.svg';
import chatbotIcon2 from '../../assets/chatbot/chatbot2.svg';
import sendIcon from "../../assets/chatbot/send.svg";
import { sendMessage } from '../../services/chatApi';
import { getUser, isAuthenticated } from '../../utils/auth';
import { getChatbotText, SUPPORTED_LANGS, DEFAULT_LANG } from './chatbotTranslations';

const CHAT_LANG_KEY = 'foodloop_chat_lang';
const LOADING_PLACEHOLDER = '__loading__';
const MAX_HISTORY_MESSAGES = 10;

function getStoredLang() {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(CHAT_LANG_KEY) : null;
  return SUPPORTED_LANGS.includes(stored) ? stored : DEFAULT_LANG;
}

function getDisplayName(user) {
  if (!user) return '';
  if (user.role === 'Donor') {
    return user.donorType === 'Business' ? (user.businessName || user.email || '') : (user.username || user.email || '');
  }
  if (user.role === 'Receiver') return user.receiverName || user.email || '';
  if (user.role === 'Driver') return user.driverName || user.email || '';
  return user.email || '';
}

function getWelcomeMessage(lang) {
  const l = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
  if (!isAuthenticated()) return getChatbotText(l, 'welcomeGuest');
  const user = getUser();
  const name = getDisplayName(user);
  if (!name || !name.trim()) return getChatbotText(l, 'welcomeGuest');
  return getChatbotText(l, 'welcomeAuthenticated', { name: name.trim() });
}

/** Remove markdown asterisks so **bold** and *italic* show as plain text */
function stripMarkdown(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\*\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '');
}

function buildHistory(messages) {
  const withoutPlaceholder = messages.filter((m) => m.text !== LOADING_PLACEHOLDER);
  const last = withoutPlaceholder.slice(-MAX_HISTORY_MESSAGES);
  return last.map((m) => ({
    role: m.fromBot ? 'model' : 'user',
    text: m.text,
  }));
}

function Chatbot() {
  const [language, setLanguage] = useState(getStoredLang);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState(() => [{ text: getWelcomeMessage(getStoredLang()), fromBot: true }]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [isOpen, messages]);

  const handleLangChange = (lang) => {
    if (!SUPPORTED_LANGS.includes(lang)) return;
    setLanguage(lang);
    try {
      localStorage.setItem(CHAT_LANG_KEY, lang);
    } catch {
      /* localStorage may be unavailable */
    }
    setMessages((prev) => {
      const greeting = { text: getWelcomeMessage(lang), fromBot: true };
      if (prev.length === 0) return [greeting];
      return [greeting, ...prev.slice(1)];
    });
  };

  const handleClose = () => setIsOpen(false);
  const handleToggle = () => setIsOpen((prev) => !prev);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    setInputValue('');
    const userMessage = { text: trimmed, fromBot: false };
    setMessages((prev) => [...prev, userMessage, { text: LOADING_PLACEHOLDER, fromBot: true }]);
    setIsLoading(true);
    const history = buildHistory(messages);
    try {
      const reply = await sendMessage(trimmed, history, language);
      setMessages((prev) =>
        prev.map((m) =>
          m.text === LOADING_PLACEHOLDER ? { text: reply, fromBot: true } : m
        )
      );
    } catch (err) {
      const errorText = err.message || getChatbotText(language, 'errorGeneric');
      setMessages((prev) =>
        prev.map((m) =>
          m.text === LOADING_PLACEHOLDER ? { text: errorText, fromBot: true } : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating chatbot icon - always visible */}
      <button
        type="button"
        className="chatbot__trigger"
        onClick={handleToggle}
        aria-label={getChatbotText(language, 'ariaOpen')}
      >
        <img src={chatbotIcon} alt="Chat bot" />
      </button>

      {/* Pop-out chat window */}
      {isOpen && (
        <div className="chatbot__popout">
          <header className="chatbot__header">
            <img src={chatbotIcon2} alt="Chatbot-Icon" className="chatbot__header__icon" />
            <span className="chatbot__header__title">FoodLoop AI Chat Bot</span>
            <div className="chatbot__lang">
              {SUPPORTED_LANGS.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={`chatbot__lang__btn ${language === lang ? 'chatbot__lang__btn--active' : ''}`}
                  onClick={() => handleLangChange(lang)}
                  aria-label={getChatbotText(language, lang === 'en' ? 'langEnglish' : lang === 'ta' ? 'langTamil' : 'langSinhala')}
                  title={getChatbotText(language, lang === 'en' ? 'langEnglish' : lang === 'ta' ? 'langTamil' : 'langSinhala')}
                >
                  {lang === 'en' ? 'EN' : lang === 'ta' ? 'தமிழ்' : 'සිංහල'}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="chatbot__header__close"
              onClick={handleClose}
              aria-label={getChatbotText(language, 'ariaClose')}
            >
              ✕
            </button>
          </header>

          <div className="chatbot__body">
            <div className="chatbot__messages">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`chatbot__message ${msg.fromBot ? 'chatbot__message--bot' : 'chatbot__message--user'}`}
                >
                  {msg.text === LOADING_PLACEHOLDER ? '...' : (msg.fromBot ? stripMarkdown(msg.text) : msg.text)}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="chatbot__input__wrap" onSubmit={handleSubmit}>
              <input
                type="text"
                className="chatbot__input"
                placeholder={getChatbotText(language, 'inputPlaceholder')}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                aria-label={getChatbotText(language, 'ariaInput')}
                disabled={isLoading}
              />
              <button
                type="submit"
                className="chatbot__send"
                aria-label={getChatbotText(language, 'ariaSend')}
                disabled={isLoading}
              >
                <span className="chatbot__send__arrow"><img src={sendIcon} alt="Send-Icon" /></span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default Chatbot;
