import { Client } from "@stomp/stompjs";

import { refreshAccessToken } from "../api/axiosClient";

import { tokenStorage, AUTH_CLEARED_EVENT } from "../utils/tokenStorage";

const WS_URL = import.meta.env.VITE_WS_URL;

const NOTIFICATION_DESTINATION = "/user/queue/notifications";

const RECONNECT_DELAY = 5000;

const TOKEN_REFRESH_BUFFER_SECONDS = 30;

// ==================================================
// JWT EXPIRATION
// ==================================================

const getTokenExpiration = (token) => {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );

    return payload.exp || null;
  } catch {
    return null;
  }
};

const isTokenExpiringSoon = (token) => {
  const expiration = getTokenExpiration(token);

  if (!expiration) {
    /*
     * If the token cannot be decoded,
     * let the backend perform validation.
     */
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000);

  return expiration - currentTime <= TOKEN_REFRESH_BUFFER_SECONDS;
};

// ==================================================
// GET VALID ACCESS TOKEN
// ==================================================

const getValidAccessToken = async () => {
  let accessToken = tokenStorage.getAccessToken();

  if (!accessToken) {
    return null;
  }

  if (isTokenExpiringSoon(accessToken)) {
    try {
      accessToken = await refreshAccessToken();
    } catch (error) {
      console.error("Unable to refresh access token for WebSocket:", error);

      return null;
    }
  }

  return accessToken;
};

// ==================================================
// CREATE NOTIFICATION WEBSOCKET
// ==================================================

export const createNotificationWebSocket = ({
  onNotification,
  onConnect,
  onDisconnect,
  onError,
}) => {
  let manuallyDisconnected = false;

  let subscription = null;

  const client = new Client({
    brokerURL: WS_URL,

    /*
     * Get the latest access token before every
     * connection/reconnection.
     */
    beforeConnect: async () => {
      const accessToken = await getValidAccessToken();

      if (!accessToken) {
        throw new Error("No valid access token available for WebSocket");
      }

      client.connectHeaders = {
        Authorization: `Bearer ${accessToken}`,
      };
    },

    reconnectDelay: RECONNECT_DELAY,

    heartbeatIncoming: 10000,

    heartbeatOutgoing: 10000,

    debug: () => {
      /*
       * STOMP debug logging disabled normally.
       */
    },

    // ==================================================
    // CONNECT
    // ==================================================

    onConnect: () => {
      if (manuallyDisconnected) {
        return;
      }

      /*
       * Prevent duplicate subscriptions if STOMP
       * reconnects using the same client.
       */
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error(
            "Failed to remove old notification subscription:",
            error,
          );
        }

        subscription = null;
      }

      subscription = client.subscribe(NOTIFICATION_DESTINATION, (message) => {
        try {
          const notification = JSON.parse(message.body);

          if (!notification) {
            console.warn("Notification WS: empty notification");

            return;
          }

          onNotification?.(notification);
        } catch (error) {
          console.error("Failed to parse WebSocket notification:", error);

          onError?.(error);
        }
      });

      onConnect?.();
    },

    // ==================================================
    // STOMP ERROR
    // ==================================================

    onStompError: async (frame) => {
      const errorMessage = frame.headers?.message || "Unknown broker error";

      console.error("STOMP broker error:", errorMessage);

      const message = errorMessage.toLowerCase();

      /*
       * Authentication failure.
       *
       * Refresh the token and allow the STOMP
       * client to reconnect using beforeConnect().
       */
      if (
        message.includes("invalid access token") ||
        message.includes("authentication") ||
        message.includes("unauthorized") ||
        message.includes("websocket authentication")
      ) {
        try {
          await refreshAccessToken();

          if (!manuallyDisconnected && !client.active) {
            client.activate();
          }
        } catch (refreshError) {
          console.error(
            "WebSocket authentication refresh failed:",
            refreshError,
          );

          manuallyDisconnected = true;

          try {
            await client.deactivate();
          } catch (deactivateError) {
            console.error("Failed to deactivate WebSocket:", deactivateError);
          }

          onError?.(refreshError);
        }

        return;
      }

      onError?.(new Error(errorMessage));
    },

    // ==================================================
    // WEBSOCKET ERROR
    // ==================================================

    onWebSocketError: (error) => {
      console.error("WebSocket error:", error);

      onError?.(error);
    },

    // ==================================================
    // WEBSOCKET CLOSE
    // ==================================================

    onWebSocketClose: () => {
      subscription = null;

      onDisconnect?.();
    },

    // ==================================================
    // STOMP DISCONNECT
    // ==================================================

    onDisconnect: () => {
      subscription = null;

      onDisconnect?.();
    },
  });

  // ==================================================
  // AUTH CLEARED
  // ==================================================

  const handleAuthCleared = () => {
    manuallyDisconnected = true;

    subscription = null;

    if (client.active) {
      client.deactivate().catch((error) => {
        console.error("Failed to disconnect WebSocket after logout:", error);
      });
    }
  };

  window.addEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);

  // ==================================================
  // PUBLIC API
  // ==================================================

  return {
    connect: () => {
      manuallyDisconnected = false;

      if (!client.active) {
        client.activate();
      }
    },

    disconnect: async () => {
      manuallyDisconnected = true;

      subscription = null;

      window.removeEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);

      if (client.active) {
        await client.deactivate();
      }
    },

    isActive: () => {
      return client.active;
    },

    getClient: () => {
      return client;
    },
  };
};
