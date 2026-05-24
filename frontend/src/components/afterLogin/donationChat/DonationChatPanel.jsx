import { useState, useEffect, useRef } from 'react';
import { getDonationChat, sendDonationChatMessage } from '../../../services/donationChatApi';
import { joinDonation, leaveDonation, onDonationChatMessage } from '../../../services/socket';
import './DonationChatPanel.css';

function DonationChatPanel({ donationId, isOpen, onClose, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const listEndRef = useRef(null);
  const unsubscribeRef = useRef(null);

  const currentUserId = currentUser?.id?.toString?.() || currentUser?._id?.toString?.();

  useEffect(() => {
    if (!isOpen || !donationId) return;
    setError(null);
    setLoading(true);
    getDonationChat(donationId)
      .then((res) => {
        if (res?.messages) setMessages(res.messages);
        else setMessages([]);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load chat');
        setMessages([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, donationId]);

  useEffect(() => {
    if (!isOpen || !donationId) return;
    joinDonation(donationId);
    const unsub = onDonationChatMessage((payload) => {
      if (payload && payload.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
      }
    });
    unsubscribeRef.current = unsub;
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
      leaveDonation(donationId);
    };
  }, [isOpen, donationId]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault?.();
    const text = inputText.trim();
    if (!text || !donationId || sending) return;
    setSending(true);
    setInputText('');
    try {
      const res = await sendDonationChatMessage(donationId, text);
      if (res?.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.message.id)) return prev;
          return [...prev, res.message];
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to send');
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="donation-chat-panel" role="dialog" aria-label="Donation chat">
      <div className="donation-chat-panel__header">
        <h3 className="donation-chat-panel__title">Chat</h3>
        <button
          type="button"
          className="donation-chat-panel__close"
          onClick={onClose}
          aria-label="Close chat"
        >
          ×
        </button>
      </div>
      <div className="donation-chat-panel__body">
        {error && (
          <div className="donation-chat-panel__error" role="alert">
            {error}
          </div>
        )}
        {loading ? (
          <div className="donation-chat-panel__loading">Loading messages...</div>
        ) : (
          <div className="donation-chat-panel__list">
            {messages.length === 0 && !loading && (
              <div className="donation-chat-panel__empty">No messages yet. Say hello!</div>
            )}
            {messages.map((m) => {
              const isOwn = m.senderId === currentUserId;
              return (
                <div
                  key={m.id}
                  className={`donation-chat-panel__message ${isOwn ? 'donation-chat-panel__message--own' : ''}`}
                >
                  <span className="donation-chat-panel__message-sender">
                    {isOwn ? 'You' : (m.senderName || 'Unknown')}
                  </span>
                  <span className="donation-chat-panel__message-text">{m.text}</span>
                  <span className="donation-chat-panel__message-time">
                    {m.createdAt
                      ? new Date(m.createdAt).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </span>
                </div>
              );
            })}
            <div ref={listEndRef} />
          </div>
        )}
      </div>
      <form className="donation-chat-panel__footer" onSubmit={handleSend}>
        <input
          type="text"
          className="donation-chat-panel__input"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={sending}
          maxLength={2000}
          aria-label="Message"
        />
        <button
          type="submit"
          className="donation-chat-panel__send"
          disabled={!inputText.trim() || sending}
          aria-label="Send"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default DonationChatPanel;
