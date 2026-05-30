import React, { useState, useEffect } from "react";
import {
  getAdminNotifications,
  createNotification,
  deactivateNotification,
  deleteNotification,
} from "../../../../services/notificationApi";
import "./AdminNotification.css";

const ROLE_OPTIONS = [
  { value: "Donor", label: "Supplier" },
  { value: "Receiver", label: "Receiver" },
  { value: "Driver", label: "Driver" },
  { value: "All", label: "All" },
];

function formatDate(date) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRoles(roles) {
  if (!Array.isArray(roles) || !roles.length) return "—";
  return roles
    .map((r) => (r === "Donor" ? "Supplier" : r))
    .join(", ");
}

const AdminNotification = () => {
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [processing, setProcessing] = useState({});
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminNotifications();
      setNotifications(res.notifications || []);
    } catch (err) {
      setError(err.message || "Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const toggleRole = (role) => {
    setSelectedRoles((prev) => {
      if (role === "All") {
        return prev.includes("All") ? prev.filter((r) => r !== "All") : ["All"];
      }
      const next = prev.filter((r) => r !== "All");
      if (next.includes(role)) {
        return next.filter((r) => r !== role);
      }
      return [...next, role];
    });
  };

  const handleSendNotification = async () => {
    const message = notificationMessage.trim();
    if (!message || !selectedRoles.length) return;

    setSending(true);
    setError(null);
    try {
      await createNotification({
        message,
        title: notificationTitle.trim() || undefined,
        roles: selectedRoles,
      });
      await fetchNotifications();
      setNotificationMessage("");
      setNotificationTitle("");
      setSelectedRoles([]);
    } catch (err) {
      setError(err.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm("Deactivate this notification? Users will no longer see it.")) return;
    setError(null);
    setProcessing((prev) => ({ ...prev, [id]: "deactivating" }));
    try {
      await deactivateNotification(id);
      await fetchNotifications();
    } catch (err) {
      setError(err.message || "Failed to deactivate notification");
    } finally {
      setProcessing((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this notification permanently?")) return;
    setError(null);
    setProcessing((prev) => ({ ...prev, [id]: "deleting" }));
    try {
      await deleteNotification(id);
      await fetchNotifications();
    } catch (err) {
      setError(err.message || "Failed to delete notification");
    } finally {
      setProcessing((prev) => ({ ...prev, [id]: null }));
    }
  };

  return (
    <div className="admin-notification-page">
      <header className="admin-notification-header">
        <h1 className="admin-notification-title">Notification Management</h1>
        <p className="admin-notification-subtitle">
          Manage and monitor all notifications from one central dashboard.
        </p>
      </header>

      {error && <div className="admin-notification-error">{error}</div>}

      <section className="admin-notification-card">
        <h2 className="admin-notification-card__title">Sent notifications</h2>

        {loading ? (
          <p className="admin-notification-empty">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className="admin-notification-empty">No notifications sent yet.</p>
        ) : (
          <div className="admin-notification-table-wrap">
            <table className="admin-notification-table">
              <thead>
                <tr>
                  <th>Message</th>
                  <th>Date</th>
                  <th>Audience</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notification) => {
                  const isActive = notification.status === "active";
                  const busy = processing[notification.id];
                  return (
                    <tr key={notification.id}>
                      <td className="admin-notification-table__message">
                        <strong>{notification.title || "Update"}</strong>
                        <span>{notification.message}</span>
                        {notification.recipientCount != null && (
                          <small>{notification.recipientCount} recipient(s)</small>
                        )}
                      </td>
                      <td>{formatDate(notification.createdAt)}</td>
                      <td>{formatRoles(notification.targetRoles)}</td>
                      <td>
                        <span
                          className={`admin-notification-status ${
                            isActive
                              ? "admin-notification-status--active"
                              : "admin-notification-status--inactive"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-notification-actions">
                          {isActive && (
                            <button
                              type="button"
                              className="admin-notification-btn admin-notification-btn--warn"
                              onClick={() => handleDeactivate(notification.id)}
                              disabled={Boolean(busy)}
                            >
                              {busy === "deactivating" ? "..." : "Deactivate"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="admin-notification-btn admin-notification-btn--danger"
                            onClick={() => handleDelete(notification.id)}
                            disabled={Boolean(busy)}
                            aria-label="Delete notification"
                          >
                            {busy === "deleting" ? "..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-notification-card admin-notification-compose">
        <h2 className="admin-notification-card__title">Send notification</h2>

        <div className="admin-notification-roles">
          <span className="admin-notification-roles__label">Target roles</span>
          <div className="admin-notification-checkboxes">
            {ROLE_OPTIONS.map((role) => (
              <label key={role.value} className="admin-notification-role-label">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.value)}
                  onChange={() => toggleRole(role.value)}
                />
                {role.label}
              </label>
            ))}
          </div>
        </div>

        <div className="admin-notification-compose__fields">
          <input
            type="text"
            className="admin-notification-title-input"
            placeholder="Title (optional)"
            value={notificationTitle}
            onChange={(e) => setNotificationTitle(e.target.value)}
          />
          <textarea
            className="admin-notification-textarea"
            placeholder="Enter your notification message here..."
            value={notificationMessage}
            onChange={(e) => setNotificationMessage(e.target.value)}
            rows={5}
          />
        </div>

        <div className="admin-notification-compose__footer">
          <button
            type="button"
            className="admin-notification-send-btn"
            onClick={handleSendNotification}
            disabled={
              sending || !notificationMessage.trim() || selectedRoles.length === 0
            }
          >
            {sending ? "Sending..." : "Send notification"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default AdminNotification;
