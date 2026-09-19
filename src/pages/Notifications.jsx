import { formatTimestamp, notificationLabel } from "../utils/displayText.js";
import { apiErrorMessage } from "../utils/apiError.js";
import notificationsStyles from "../styles/notifications.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import { useEffect, useState } from "react";

import Navbar from "../components/layout/Navbar";

import { useNotifications } from "../context/NotificationContext";

const css = bindStyles(notificationsStyles);

const PAGE_SIZE = 10;

const Notifications = () => {
  const {
    notifications,
    loading,
    error,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [page, setPage] = useState(0);

  const [totalPages, setTotalPages] = useState(0);

  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [markAllLoading, setMarkAllLoading] = useState(false);

  const [actionError, setActionError] = useState("");

  // ==================================================
  // LOAD PAGE
  // ==================================================

  const loadPage = async (nextPage) => {
    try {
      setActionError("");

      const data = await loadNotifications(nextPage, PAGE_SIZE);

      setPage(data?.number ?? nextPage);
      setTotalPages(data?.totalPages ?? 0);
    } catch (error) {
      console.error("Failed to load notification page:", error);
    }
  };

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    loadPage(0);
  }, []);

  // ==================================================
  // MARK ONE AS READ
  // ==================================================

  const handleMarkAsRead = async (notificationId) => {
    try {
      setActionError("");
      setActionLoadingId(notificationId);

      await markAsRead(notificationId);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);

      setActionError(
        apiErrorMessage(error, "Unable to mark notification as read"),
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // ==================================================
  // MARK ALL AS READ
  // ==================================================

  const handleMarkAllAsRead = async () => {
    try {
      setActionError("");
      setMarkAllLoading(true);

      await markAllAsRead();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);

      setActionError(
        apiErrorMessage(error, "Unable to mark all notifications as read"),
      );
    } finally {
      setMarkAllLoading(false);
    }
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading && notifications.length === 0) {
    return (
      <>
        <Navbar />

        <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Loading notifications...</div>
      </>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <>
      <Navbar />

      <PageContainer className={css("notifications-page")}>
        <Card className={css("notifications-card")}>
          <div className={css("notifications-header")}>
            <div>
              <h1>Notifications</h1>

              <p>Stay up to date with your FrndBook activity.</p>
            </div>

            {notifications.some((notification) => !notification.read) && (
              <button
                type="button"
                className={css("notifications-mark-all")}
                onClick={handleMarkAllAsRead}
                disabled={markAllLoading}
              >
                {markAllLoading ? "Marking..." : "Mark all as read"}
              </button>
            )}
          </div>

          {(error || actionError) && (
            <StatusMessage tone="error" className={css("error")}>{actionError || error}</StatusMessage>
          )}

          {notifications.length === 0 && !error && (
            <div className={css("notifications-empty")}>
              <h2>No notifications yet</h2>

              <p>You're all caught up. New activity will appear here.</p>
            </div>
          )}

          {notifications.length > 0 && (
            <div className={css("notification-list")}>
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={css(`notification-item ${
                    notification.read
                      ? "notification-read"
                      : "notification-unread"
                  }`)}
                >
                  <div className={css("notification-indicator")}>
                    {!notification.read && (
                      <span
                        className={css("notification-unread-dot")}
                        aria-label="Unread"
                      />
                    )}
                  </div>

                  <div className={css("notification-content")}>
                    <p className={css("notification-message")}>
                      {notification.message}
                    </p>

                    <div className={css("notification-meta")}>
                      <span>
                        {notification.createdAt
                          ? formatTimestamp(notification.createdAt)
                          : ""}
                      </span>

                      {notification.type && (
                        <span className={css("notification-type")}>
                          {notificationLabel(notification.type)}
                        </span>
                      )}
                    </div>
                  </div>

                  {!notification.read && (
                    <button
                      type="button"
                      className={css("notification-read-button")}
                      onClick={() => handleMarkAsRead(notification.id)}
                      disabled={actionLoadingId === notification.id}
                    >
                      {actionLoadingId === notification.id
                        ? "..."
                        : "Mark read"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className={css("notification-pagination")}>
              <button
                type="button"
                disabled={loading || page === 0}
                onClick={() => loadPage(page - 1)}
              >
                Previous
              </button>

              <span>
                Page {page + 1} of {totalPages}
              </span>

              <button
                type="button"
                disabled={loading || page >= totalPages - 1}
                onClick={() => loadPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </Card>
      </PageContainer>
    </>
  );
};

export default Notifications;
