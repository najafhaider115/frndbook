import { Client } from "@stomp/stompjs";

import { refreshAccessToken } from "../api/axiosClient";

import { tokenStorage, AUTH_CLEARED_EVENT } from "../utils/tokenStorage";

const WS_URL = import.meta.env.VITE_WS_URL;

const RECONNECT_DELAY = 5000;

const TOKEN_REFRESH_BUFFER_SECONDS = 30;

const CONVERSATION_UPDATE_DESTINATION = "/user/queue/conversation-updates";

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
      console.error(
        "Unable to refresh access token for conversation update WebSocket:",
        error,
      );

      return null;
    }
  }

  return accessToken;
};

// ==================================================
// CREATE CONVERSATION UPDATE WEBSOCKET
// ==================================================

export const createConversationUpdateWebSocket = ({
  onUpdate,
  onConnect,
  onDisconnect,
  onError,
}) => {
  let manuallyDisconnected = false;

  let subscription = null;

  const client = new Client({
    brokerURL: WS_URL,

    // ----------------------------------------------
    // AUTHENTICATION
    // ----------------------------------------------

    beforeConnect: async () => {
      const accessToken = await getValidAccessToken();

      if (!accessToken) {
        throw new Error(
          "No valid access token available for conversation update WebSocket",
        );
      }

      client.connectHeaders = {
        Authorization: `Bearer ${accessToken}`,
      };
    },

    reconnectDelay: RECONNECT_DELAY,

    heartbeatIncoming: 10000,

    heartbeatOutgoing: 10000,

    debug: () => {
      // STOMP debug logging disabled.
    },

    // ----------------------------------------------
    // CONNECT
    // ----------------------------------------------

    onConnect: () => {
      if (manuallyDisconnected) {
        return;
      }

      /*
       * Prevent duplicate subscriptions
       * after reconnect.
       */
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error(
            "Failed to remove previous conversation update subscription:",
            error,
          );
        }

        subscription = null;
      }

      subscription = client.subscribe(
        CONVERSATION_UPDATE_DESTINATION,
        (message) => {
          try {
            const update = JSON.parse(message.body);

            if (!update) {
              return;
            }

            onUpdate?.(update);
          } catch (error) {
            console.error(
              "Failed to parse conversation update WebSocket message:",
              error,
            );

            onError?.(error);
          }
        },
      );

      onConnect?.();
    },

    // ----------------------------------------------
    // STOMP ERROR
    // ----------------------------------------------

    onStompError: async (frame) => {
      const errorMessage =
        frame.headers?.message || "Unknown conversation update broker error";

      console.error("Conversation update STOMP broker error:", errorMessage);

      const message = errorMessage.toLowerCase();

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
            "Conversation update WebSocket authentication refresh failed:",
            refreshError,
          );

          manuallyDisconnected = true;

          try {
            await client.deactivate();
          } catch (deactivateError) {
            console.error(
              "Failed to deactivate conversation update WebSocket:",
              deactivateError,
            );
          }

          onError?.(refreshError);
        }

        return;
      }

      onError?.(new Error(errorMessage));
    },

    // ----------------------------------------------
    // WEBSOCKET ERROR
    // ----------------------------------------------

    onWebSocketError: (error) => {
      console.error("Conversation update WebSocket error:", error);

      onError?.(error);
    },

    // ----------------------------------------------
    // WEBSOCKET CLOSE
    // ----------------------------------------------

    onWebSocketClose: () => {
      subscription = null;

      onDisconnect?.();
    },

    // ----------------------------------------------
    // STOMP DISCONNECT
    // ----------------------------------------------

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
        console.error(
          "Failed to disconnect conversation update WebSocket after logout:",
          error,
        );
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

    isConnected: () => {
      return client.connected;
    },
  };
};
