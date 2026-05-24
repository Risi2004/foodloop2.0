import { useState, useEffect } from "react";
import "./AdminMessages.css";
import { getContactMessages, replyToMessage } from "../../../../services/contactApi";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const AdminMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(null);
  const [replyError, setReplyError] = useState(null);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getContactMessages();
      setMessages(res.messages || []);
    } catch (err) {
      setError(err.message || "Failed to load messages");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const toggleMessageSelection = (messageId) => {
    setSelectedMessageId((prev) => (prev === messageId ? null : messageId));
    setReplySuccess(null);
    setReplyError(null);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedMessageId) return;
    setSendingReply(true);
    setReplySuccess(null);
    setReplyError(null);
    try {
      await replyToMessage(selectedMessageId, replyText);
      setReplyText("");
      setReplySuccess("Reply sent by email.");
      await fetchMessages();
    } catch (err) {
      setReplySuccess(null);
      setReplyError(err.message || "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const getSelectedDisplay = () => {
    if (!selectedMessageId) return "Select a message to reply";
    const msg = messages.find((m) => m.id === selectedMessageId);
    return msg ? `${msg.name || msg.email}` : "Select a message to reply";
  };

  const getFrameClass = (index) => {
    if (index === 0) return "frame-211";
    if (index === 1) return "frame-2122";
    return "frame-213";
  };

  if (loading) {
    return (
      <div className="frame-197">
        <div className="mange">
          <div className="user-management">Message Management</div>
          <div className="manage-verify-and">Centralized control for all incoming and outgoing messages</div>
        </div>
        <div className="body" style={{ justifyContent: "center", padding: "40px" }}>
          Loading messages...
        </div>
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="frame-197">
        <div className="mange">
          <div className="user-management">Message Management</div>
          <div className="manage-verify-and">Centralized control for all incoming and outgoing messages</div>
        </div>
        <div className="body" style={{ justifyContent: "center", padding: "40px", color: "#f87171" }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="frame-197">
      <div className="mange">
        <div className="user-management">Message Management</div>
        <div className="manage-verify-and">
          Centralized control for all incoming and outgoing messages
        </div>
      </div>
      <div className="body">
        <div className="today">Messages</div>
        {messages.length === 0 ? (
          <div style={{ padding: "20px", color: "#9ca3af" }}>No contact messages yet.</div>
        ) : (
          messages.map((msg, index) => {
            const isSelected = selectedMessageId === msg.id;
            return (
              <div key={msg.id} className={getFrameClass(index)}>
                <div className="msg">
                  <div className="time">
                    <div className="new-food-item-listed">{msg.name || msg.email}</div>
                    <div className="_2-mins-ago">{formatDate(msg.createdAt)}</div>
                  </div>
                  {msg.subject && (
                    <div className="fresh-produce-15-kg" style={{ fontWeight: 600, marginBottom: "4px" }}>
                      {msg.subject}
                    </div>
                  )}
                  <div className="fresh-produce-15-kg">{msg.message}</div>
                  {msg.email && (
                    <div style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>{msg.email}</div>
                  )}
                  {msg.adminReply && (
                    <div className="replies-container">
                      <div className="reply-item">
                        <div className="time">
                          <div className="new-food-item-listed">Admin</div>
                          <div className="_2-mins-ago">{formatDate(msg.repliedAt)}</div>
                        </div>
                        <div className="fresh-produce-15-kg">{msg.adminReply}</div>
                      </div>
                    </div>
                  )}
                </div>
                <div
                  className={isSelected ? "frame-2123" : "frame-212"}
                  onClick={() => toggleMessageSelection(msg.id)}
                  style={{ cursor: "pointer" }}
                >
                  {isSelected && (
                    <span className="tick-box" aria-hidden="true">✓</span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div className="today">Reply</div>
      </div>
      <div className="enter">
        <div className="frame-206">
          <div className="frame-107">
            <div className="recent-donations">REPLY</div>
          </div>
          <div className="search">
            <div className="john">{getSelectedDisplay()}</div>
          </div>
          <div className="search2">
            <textarea
              className="change-your-password-for-security-purpose"
              placeholder="Type your reply here..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
            />
          </div>
          {replySuccess && <div style={{ color: "#86efac", fontSize: "14px" }}>{replySuccess}</div>}
          {replyError && <div style={{ color: "#f87171", fontSize: "14px" }}>{replyError}</div>}
          <div className="frame-210">
            <div
              className="frame-208"
              onClick={handleSendReply}
              style={{ cursor: sendingReply || !selectedMessageId ? "not-allowed" : "pointer", opacity: sendingReply || !selectedMessageId ? 0.7 : 1 }}
            >
              <div className="send">{sendingReply ? "SENDING..." : "SEND"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMessages;
