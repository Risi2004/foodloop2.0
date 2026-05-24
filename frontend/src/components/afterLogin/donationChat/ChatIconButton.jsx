import { useState, useEffect, useRef } from 'react';
import DonationChatPanel from './DonationChatPanel';
import { joinDonation, leaveDonation, onDonationChatMessage } from '../../../services/socket';
import './ChatIconButton.css';

function ChatIconButton({ donationId, currentUser, title = 'Chat about this delivery' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isOpenRef = useRef(false);

  const currentUserId = currentUser?.id?.toString?.() || currentUser?._id?.toString?.();

  // Join donation room so we receive chat messages even when panel is closed (e.g. on driver pages)
  useEffect(() => {
    if (!donationId) return;
    joinDonation(donationId);
    return () => leaveDonation(donationId);
  }, [donationId]);

  // Subscribe to new messages: count as unread when panel is closed and message is from someone else
  useEffect(() => {
    if (!donationId || currentUserId == null) return;
    const unsub = onDonationChatMessage((payload) => {
      if (!payload?.id) return;
      const fromOther = payload.senderId?.toString?.() !== currentUserId;
      if (fromOther && !isOpenRef.current) {
        setUnreadCount((c) => c + 1);
      }
    });
    return unsub;
  }, [donationId, currentUserId]);

  // Keep ref in sync and clear unread when panel opens
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  if (!donationId || !currentUser) return null;

  const badgeLabel = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <>
      <div className="donation-chat-icon-button-wrap">
        <button
          type="button"
          className="donation-chat-icon-button"
          onClick={() => setIsOpen((prev) => !prev)}
          title={title}
          aria-label={title}
        >
          <svg
            className="donation-chat-icon-button__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {unreadCount > 0 && (
            <span className="donation-chat-icon-button__badge" aria-label={`${unreadCount} unread messages`}>
              {badgeLabel}
            </span>
          )}
        </button>
      </div>
      <DonationChatPanel
        donationId={donationId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentUser={currentUser}
      />
    </>
  );
}

export default ChatIconButton;
