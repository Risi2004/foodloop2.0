import React, { useState, useEffect } from "react";
import { getAdminNotifications, createNotification } from "../../../../services/notificationApi";
import "./AdminNotification.css";

const ROLE_OPTIONS = ['Donor', 'Receiver', 'Driver', 'All'];

const AdminNotification = () => {
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const formatDate = (date) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    return `${month} ${day}, ${year}`;
  };

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
    if (!message) return;
    const roles = selectedRoles.length ? selectedRoles : null;
    if (!roles || roles.length === 0) return;

    setSending(true);
    setError(null);
    try {
      await createNotification({
        message,
        title: notificationTitle.trim() || undefined,
        roles,
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

  const handleDeactivate = (id) => {
    // Optional: PATCH /api/admin/notifications/:id with status: 'inactive' when backend supports it
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "inactive" } : n))
    );
  };

  const handleDelete = (id) => {
    // Optional: DELETE when backend supports it; for now just remove from local state for UI consistency
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const displayStatus = (status) => (status === "active" ? "ACTIVE" : "INACTIVE");

  return (
    <div className="frame-197">
      <div className="mange">
        <div className="user-management">Notification Management</div>
        <div className="manage-verify-and">
          Manage and monitor all notifications from one central dashboard.
        </div>
      </div>
      <div className="frame-107">
        <div className="recent-donations">Active notifications</div>
      </div>
      {error && (
        <div className="admin-notification-error" style={{ color: "#c00", marginBottom: "8px" }}>
          {error}
        </div>
      )}
      <div className="frame-106">
        <div className="frame-108">
          <div className="recent-donations2">MESSAGE</div>
          <div className="recent-donations2">DATE</div>
          <div className="recent-donations2">STATUS</div>
          <div className="recent-donations2">ACTION</div>
        </div>
        {loading ? (
          <div className="recent-donations4">Loading...</div>
        ) : (
          notifications.map((notification, index) => {
            const rowClass = index % 3 === 0 ? "frame-109" : index % 3 === 1 ? "frame-110" : "frame-111";
            const dateStr = notification.createdAt
              ? formatDate(notification.createdAt)
              : "";
            return (
              <div key={notification.id} className={rowClass}>
                <div className="frame-203">
                  <div className="recent-donations3">{notification.title || "Update"}</div>
                  <div className="recent-donations3">{notification.message}</div>
                </div>
                <div className="recent-donations4">{dateStr}</div>
                <div className="frame-204">
                  <div className="verified">
                    <div className="dot"></div>
                    <div className="verified2">{displayStatus(notification.status)}</div>
                  </div>
                </div>
                <div className="frame-205">
                  <div className="frame-208">
                    <div
                      className="deactivate"
                      onClick={() => handleDeactivate(notification.id)}
                      style={{ cursor: "pointer" }}
                    >
                      Deactivate
                    </div>
                    <img
                      className="cancel"
                      src="/src/assets/Cancel.svg"
                      alt="Cancel"
                      onClick={() => handleDelete(notification.id)}
                      style={{ cursor: "pointer" }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="enter">
        <div className="frame-206">
          <div className="frame-1072">
            <div className="recent-donations5">SEND NOTIFICATION</div>
          </div>
          <div className="admin-notification-roles">
            <span className="recent-donations5">Role</span>
            <div className="admin-notification-checkboxes">
              {ROLE_OPTIONS.map((role) => (
                <label key={role} className="admin-notification-role-label">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                  />
                  {role}
                </label>
              ))}
            </div>
          </div>
          <div className="search">
            <input
              type="text"
              className="admin-notification-title-input"
              placeholder="Title (optional)"
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
            />
            <textarea
              className="change-your-password-for-security-purpose"
              placeholder="Enter your notification message here..."
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
            />
          </div>
          <div className="frame-210">
            <div
              className="frame-2082"
              onClick={
                notificationMessage.trim() && selectedRoles.length
                  ? handleSendNotification
                  : undefined
              }
              style={{
                cursor:
                  notificationMessage.trim() && selectedRoles.length
                    ? "pointer"
                    : "not-allowed",
                opacity:
                  notificationMessage.trim() && selectedRoles.length ? 1 : 0.6,
              }}
            >
              <div className="send">{sending ? "Sending..." : "SEND"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotification;
