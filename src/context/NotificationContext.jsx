import { createContext, useContext, useEffect, useRef, useState } from "react";

import { useAuth } from "../auth/AuthContext";

import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../api/notificationApi";

import { createNotificationWebSocket } from "../services/webSocketService";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const webSocketRef = useRef(null);

  /*
   * Keep track of notification IDs already processed
   * by this client.
   */
  const notificationIdsRef = useRef(new Set());

  // ==================================================
  // RESET WHEN LOGGED OUT
  // ==================================================

  useEffect(() => {
    if (user) {
      return;
    }

    setNotifications([]);
    setUnreadCount(0);
    setError("");
    setLoading(false);

    notificationIdsRef.current.clear();
  }, [user]);

  // ==================================================
  // LOAD INITIAL UNREAD COUNT
  // ==================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    const loadInitialUnreadCount = async () => {
      try {
        setError("");

        const count = await getUnreadNotificationCount();

        if (!cancelled) {
          setUnreadCount(Number(count) || 0);
        }
      } catch (error) {
        console.error("Failed to load notification count:", error);

        if (!cancelled) {
          setUnreadCount(0);
        }
      }
    };

    loadInitialUnreadCount();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // ==================================================
  // WEBSOCKET
  // ==================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    const handleNotification = (notification) => {
      if (cancelled || !notification?.id) {
        return;
      }

      const notificationId = String(notification.id);

      /*
       * Ignore duplicate WebSocket deliveries.
       */
      if (notificationIdsRef.current.has(notificationId)) {
        return;
      }

      /*
       * Mark the notification as processed BEFORE
       * updating React state.
       */
      notificationIdsRef.current.add(notificationId);

      setNotifications((currentNotifications) => {
        /*
         * Extra protection against duplicates already
         * present in the current state.
         */
        const alreadyExists = currentNotifications.some(
          (item) => String(item.id) === notificationId,
        );

        if (alreadyExists) {
          return currentNotifications;
        }

        return [notification, ...currentNotifications];
      });

      /*
       * The notification is known to be new at this
       * point, so updating the unread count is safe.
       */
      if (!notification.read) {
        setUnreadCount((currentCount) => currentCount + 1);
      }
    };

    const handleConnect = () => {
      if (cancelled) {
        return;
      }
    };

    const handleDisconnect = () => {
      if (cancelled) {
        return;
      }
    };

    const handleError = (error) => {
      if (cancelled) {
        return;
      }

      console.error("Notification WebSocket error:", error);
    };

    const webSocket = createNotificationWebSocket({
      onNotification: handleNotification,
      onConnect: handleConnect,
      onDisconnect: handleDisconnect,
      onError: handleError,
    });

    if (!webSocket) {
      return;
    }

    webSocketRef.current = webSocket;

    webSocket.connect();

    return () => {
      cancelled = true;

      const currentWebSocket = webSocketRef.current;

      webSocketRef.current = null;

      if (currentWebSocket) {
        currentWebSocket.disconnect().catch((error) => {
          console.error("Failed to disconnect notification WebSocket:", error);
        });
      }
    };
  }, [user?.id]);

  // ==================================================
  // LOAD NOTIFICATIONS
  // ==================================================

  const loadNotifications = async (page = 0, size = 10) => {
    try {
      setLoading(true);
      setError("");

      const data = await getNotifications(page, size);

      const loadedNotifications = data?.content || [];

      /*
       * Keep the local ID set synchronized with
       * notifications loaded from the backend.
       */
      notificationIdsRef.current = new Set(
        loadedNotifications
          .filter((notification) => notification?.id)
          .map((notification) => String(notification.id)),
      );

      setNotifications(loadedNotifications);

      return data;
    } catch (error) {
      console.error("Failed to load notifications:", error);

      setError(error.response?.data?.message || "Unable to load notifications");

      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // REFRESH UNREAD COUNT
  // ==================================================

  const refreshUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationCount();

      setUnreadCount(Number(count) || 0);

      return Number(count) || 0;
    } catch (error) {
      console.error("Failed to refresh notification count:", error);

      throw error;
    }
  };

  // ==================================================
  // MARK ONE AS READ
  // ==================================================

  const markAsRead = async (notificationId) => {
    if (!notificationId) {
      return;
    }

    const notification = notifications.find(
      (item) => item.id === notificationId,
    );

    if (notification?.read) {
      return;
    }

    try {
      await markNotificationAsRead(notificationId);

      setNotifications((currentNotifications) =>
        currentNotifications.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                read: true,
              }
            : item,
        ),
      );

      setUnreadCount((currentCount) => Math.max(0, currentCount - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);

      throw error;
    }
  };

  // ==================================================
  // MARK ALL AS READ
  // ==================================================

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          read: true,
        })),
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);

      throw error;
    }
  };

  // ==================================================
  // CONTEXT VALUE
  // ==================================================

  const value = {
    notifications,
    unreadCount,

    loading,
    error,

    loadNotifications,
    refreshUnreadCount,

    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// ==================================================
// HOOK
// ==================================================

export const useNotifications = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider",
    );
  }

  return context;
};
