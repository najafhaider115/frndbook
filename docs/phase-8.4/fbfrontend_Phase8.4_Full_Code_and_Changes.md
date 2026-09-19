# fbfrontend - Phase 8.4: Full code and changes

Paths are relative to the frontend root. Every changed current file is provided in full. Phase 8.3 is the baseline. New files have an empty before-version.

## src/api/axiosClient.js

Updated. Reject stale refresh results and protect a newer login from an earlier refresh failure.

### Full current content

```javascript
import axios from "axios";

import { tokenStorage } from "../utils/tokenStorage";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,

  // ISSUE FIX:
  // Do not set Content-Type globally.
  // Profile image uploads use FormData and must be sent as
  // multipart/form-data with the boundary generated automatically.
});

// ==================================================
// REFRESH STATE
// ==================================================

let refreshPromise = null;

// ==================================================
// REFRESH ACCESS TOKEN
// ==================================================

export const refreshAccessToken = async () => {
  /*
   * If another refresh is already running,
   * everyone waits for that same request.
   */
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = tokenStorage.getRefreshToken();

  if (!refreshToken) {
    throw new Error("Refresh token is not available");
  }

  refreshPromise = axios
    .post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh`, {
      refreshToken,
    })
    .then((response) => {
      if (tokenStorage.getRefreshToken() !== refreshToken) {
        throw new Error("Authentication changed while refreshing");
      }
      const { accessToken, refreshToken: newRefreshToken } = response.data;

      tokenStorage.updateTokens(accessToken, newRefreshToken);

      return accessToken;
    })
    .catch((error) => {
      if (tokenStorage.getRefreshToken() === refreshToken) tokenStorage.clear();

      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

// ==================================================
// REQUEST INTERCEPTOR
// ==================================================

axiosClient.interceptors.request.use(
  (config) => {
    const accessToken = tokenStorage.getAccessToken();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  },
);

// ==================================================
// RESPONSE INTERCEPTOR
// ==================================================

axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },

  async (error) => {
    const originalRequest = error.config;

    // ------------------------------------------
    // Only handle 401
    // ------------------------------------------

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // ------------------------------------------
    // Prevent infinite retry
    // ------------------------------------------

    if (originalRequest?._retry) {
      return Promise.reject(error);
    }

    // ------------------------------------------
    // Never refresh these endpoints
    // ------------------------------------------

    const requestUrl = originalRequest?.url || "";

    /*
     * ISSUE FIX:
     * All public authentication endpoints must bypass
     * the access-token refresh flow.
     */
    if (
      requestUrl.includes("/api/auth/login") ||
      requestUrl.includes("/api/auth/signup") ||
      requestUrl.includes("/api/auth/verify-email") ||
      requestUrl.includes("/api/auth/resend-verification") ||
      requestUrl.includes("/api/auth/refresh") ||
      requestUrl.includes("/api/auth/forgot-password") ||
      requestUrl.includes("/api/auth/reset-password")
    ) {
      return Promise.reject(error);
    }

    // ------------------------------------------
    // Mark request
    // ------------------------------------------

    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return axiosClient(originalRequest);
    } catch (refreshError) {
      /*
       * Refresh failed completely.
       * The shared refresh function has already
       * cleared authentication.
       */

      window.location.href = "/login";

      return Promise.reject(refreshError);
    }
  },
);

export default axiosClient;
```

### Changes (+ added / - removed)

```diff
--- before/src/api/axiosClient.js
+++ after/src/api/axiosClient.js
@@ -41,6 +41,9 @@
       refreshToken,
     })
     .then((response) => {
+      if (tokenStorage.getRefreshToken() !== refreshToken) {
+        throw new Error("Authentication changed while refreshing");
+      }
       const { accessToken, refreshToken: newRefreshToken } = response.data;
 
       tokenStorage.updateTokens(accessToken, newRefreshToken);
@@ -48,7 +51,7 @@
       return accessToken;
     })
     .catch((error) => {
-      tokenStorage.clear();
+      if (tokenStorage.getRefreshToken() === refreshToken) tokenStorage.clear();
 
       throw error;
     })
```

## src/services/authenticatedWebSocket.js

Added. Bind the shared lifecycle to STOMP, existing token storage and shared Axios refresh.

### Full current content

```javascript
import { Client } from "@stomp/stompjs";
import { refreshAccessToken } from "../api/axiosClient";
import { tokenStorage, AUTH_CLEARED_EVENT } from "../utils/tokenStorage";
import { createStompConnection } from "./stompConnection.js";

export const createAuthenticatedWebSocket = options => createStompConnection({
  ...options,
  createClient: config => new Client(config),
  brokerURL: import.meta.env.VITE_WS_URL,
  getToken: () => tokenStorage.getAccessToken(),
  refreshToken: refreshAccessToken,
  authEvents: window,
  authClearedEvent: AUTH_CLEARED_EVENT,
});
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/services/authenticatedWebSocket.js
@@ -0,0 +1,14 @@
+import { Client } from "@stomp/stompjs";
+import { refreshAccessToken } from "../api/axiosClient";
+import { tokenStorage, AUTH_CLEARED_EVENT } from "../utils/tokenStorage";
+import { createStompConnection } from "./stompConnection.js";
+
+export const createAuthenticatedWebSocket = options => createStompConnection({
+  ...options,
+  createClient: config => new Client(config),
+  brokerURL: import.meta.env.VITE_WS_URL,
+  getToken: () => tokenStorage.getAccessToken(),
+  refreshToken: refreshAccessToken,
+  authEvents: window,
+  authClearedEvent: AUTH_CLEARED_EVENT,
+});
```

## src/services/chatWebSocketService.js

Updated. Small compatibility adapter retaining the feature destination and callback names.

### Full current content

```javascript
import { createAuthenticatedWebSocket } from "./authenticatedWebSocket";

export const createChatWebSocket = ({ conversationId, ...callbacks }) => {
  if (!conversationId) return null;
  return createAuthenticatedWebSocket({
    ...callbacks,
    destination: `/topic/conversations/${conversationId}`,
    publishDestination: `/app/chat/${conversationId}`,
  });
};
```

### Changes (+ added / - removed)

```diff
--- before/src/services/chatWebSocketService.js
+++ after/src/services/chatWebSocketService.js
@@ -1,306 +1,10 @@
-import { Client } from "@stomp/stompjs";
+import { createAuthenticatedWebSocket } from "./authenticatedWebSocket";
 
-import { refreshAccessToken } from "../api/axiosClient";
-
-import { tokenStorage, AUTH_CLEARED_EVENT } from "../utils/tokenStorage";
-
-const WS_URL = import.meta.env.VITE_WS_URL;
-
-const RECONNECT_DELAY = 5000;
-
-const TOKEN_REFRESH_BUFFER_SECONDS = 30;
-
-// ==================================================
-// JWT EXPIRATION
-// ==================================================
-
-const getTokenExpiration = (token) => {
-  try {
-    const parts = token.split(".");
-
-    if (parts.length !== 3) {
-      return null;
-    }
-
-    const payload = JSON.parse(
-      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
-    );
-
-    return payload.exp || null;
-  } catch {
-    return null;
-  }
+export const createChatWebSocket = ({ conversationId, ...callbacks }) => {
+  if (!conversationId) return null;
+  return createAuthenticatedWebSocket({
+    ...callbacks,
+    destination: `/topic/conversations/${conversationId}`,
+    publishDestination: `/app/chat/${conversationId}`,
+  });
 };
-
-const isTokenExpiringSoon = (token) => {
-  const expiration = getTokenExpiration(token);
-
-  if (!expiration) {
-    return false;
-  }
-
-  const currentTime = Math.floor(Date.now() / 1000);
-
-  return expiration - currentTime <= TOKEN_REFRESH_BUFFER_SECONDS;
-};
-
-// ==================================================
-// GET VALID ACCESS TOKEN
-// ==================================================
-
-const getValidAccessToken = async () => {
-  let accessToken = tokenStorage.getAccessToken();
-
-  if (!accessToken) {
-    return null;
-  }
-
-  if (isTokenExpiringSoon(accessToken)) {
-    try {
-      accessToken = await refreshAccessToken();
-    } catch (error) {
-      console.error(
-        "Unable to refresh access token for chat WebSocket:",
-        error,
-      );
-
-      return null;
-    }
-  }
-
-  return accessToken;
-};
-
-// ==================================================
-// CREATE CHAT WEBSOCKET
-// ==================================================
-
-export const createChatWebSocket = ({
-  conversationId,
-  onMessage,
-  onConnect,
-  onDisconnect,
-  onError,
-}) => {
-  if (!conversationId) {
-    return null;
-  }
-
-  let manuallyDisconnected = false;
-  let subscription = null;
-
-  const destination = `/topic/conversations/${conversationId}`;
-
-  const client = new Client({
-    brokerURL: WS_URL,
-
-    // ----------------------------------------------
-    // AUTHENTICATION
-    // ----------------------------------------------
-
-    beforeConnect: async () => {
-      const accessToken = await getValidAccessToken();
-
-      if (!accessToken) {
-        throw new Error("No valid access token available for chat WebSocket");
-      }
-
-      client.connectHeaders = {
-        Authorization: `Bearer ${accessToken}`,
-      };
-    },
-
-    reconnectDelay: RECONNECT_DELAY,
-
-    heartbeatIncoming: 10000,
-
-    heartbeatOutgoing: 10000,
-
-    debug: () => {
-      // STOMP debug logging disabled.
-    },
-
-    // ----------------------------------------------
-    // CONNECT
-    // ----------------------------------------------
-
-    onConnect: () => {
-      if (manuallyDisconnected) {
-        return;
-      }
-
-      if (subscription) {
-        try {
-          subscription.unsubscribe();
-        } catch (error) {
-          console.error("Failed to remove previous chat subscription:", error);
-        }
-
-        subscription = null;
-      }
-
-      subscription = client.subscribe(destination, (message) => {
-        try {
-          const parsedMessage = JSON.parse(message.body);
-
-          if (!parsedMessage) {
-            return;
-          }
-
-          onMessage?.(parsedMessage);
-        } catch (error) {
-          console.error("Failed to parse chat WebSocket message:", error);
-
-          onError?.(error);
-        }
-      });
-
-      onConnect?.();
-    },
-
-    // ----------------------------------------------
-    // STOMP ERROR
-    // ----------------------------------------------
-
-    onStompError: async (frame) => {
-      const errorMessage =
-        frame.headers?.message || "Unknown chat broker error";
-
-      console.error("Chat STOMP broker error:", errorMessage);
-
-      const message = errorMessage.toLowerCase();
-
-      if (
-        message.includes("invalid access token") ||
-        message.includes("authentication") ||
-        message.includes("unauthorized") ||
-        message.includes("websocket authentication")
-      ) {
-        try {
-          await refreshAccessToken();
-
-          if (!manuallyDisconnected && !client.active) {
-            client.activate();
-          }
-        } catch (refreshError) {
-          console.error(
-            "Chat WebSocket authentication refresh failed:",
-            refreshError,
-          );
-
-          manuallyDisconnected = true;
-
-          try {
-            await client.deactivate();
-          } catch (deactivateError) {
-            console.error(
-              "Failed to deactivate chat WebSocket:",
-              deactivateError,
-            );
-          }
-
-          onError?.(refreshError);
-        }
-
-        return;
-      }
-
-      onError?.(new Error(errorMessage));
-    },
-
-    // ----------------------------------------------
-    // WEBSOCKET ERROR
-    // ----------------------------------------------
-
-    onWebSocketError: (error) => {
-      console.error("Chat WebSocket error:", error);
-
-      onError?.(error);
-    },
-
-    // ----------------------------------------------
-    // WEBSOCKET CLOSE
-    // ----------------------------------------------
-
-    onWebSocketClose: () => {
-      subscription = null;
-
-      onDisconnect?.();
-    },
-
-    // ----------------------------------------------
-    // STOMP DISCONNECT
-    // ----------------------------------------------
-
-    onDisconnect: () => {
-      subscription = null;
-
-      onDisconnect?.();
-    },
-  });
-
-  // ==================================================
-  // AUTH CLEARED
-  // ==================================================
-
-  const handleAuthCleared = () => {
-    manuallyDisconnected = true;
-
-    subscription = null;
-
-    if (client.active) {
-      client.deactivate().catch((error) => {
-        console.error(
-          "Failed to disconnect chat WebSocket after logout:",
-          error,
-        );
-      });
-    }
-  };
-
-  window.addEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
-
-  // ==================================================
-  // PUBLIC API
-  // ==================================================
-
-  return {
-    connect: () => {
-      manuallyDisconnected = false;
-
-      if (!client.active) {
-        client.activate();
-      }
-    },
-
-    disconnect: async () => {
-      manuallyDisconnected = true;
-
-      subscription = null;
-
-      window.removeEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
-
-      if (client.active) {
-        await client.deactivate();
-      }
-    },
-
-    sendMessage: (content) => {
-      if (!client.connected) {
-        throw new Error("Chat WebSocket is not connected");
-      }
-
-      client.publish({
-        destination: `/app/chat/${conversationId}`,
-
-        body: JSON.stringify({
-          content,
-        }),
-      });
-    },
-
-    isConnected: () => {
-      return client.connected;
-    },
-  };
-};
```

## src/services/conversationUpdateWebSocketService.js

Updated. Small compatibility adapter retaining the feature destination and callback names.

### Full current content

```javascript
import { createAuthenticatedWebSocket } from "./authenticatedWebSocket";

export const createConversationUpdateWebSocket = ({ onUpdate, ...callbacks }) =>
  createAuthenticatedWebSocket({
    ...callbacks,
    onMessage: onUpdate,
    destination: "/user/queue/conversation-updates",
  });
```

### Changes (+ added / - removed)

```diff
--- before/src/services/conversationUpdateWebSocketService.js
+++ after/src/services/conversationUpdateWebSocketService.js
@@ -1,307 +1,8 @@
-import { Client } from "@stomp/stompjs";
+import { createAuthenticatedWebSocket } from "./authenticatedWebSocket";
 
-import { refreshAccessToken } from "../api/axiosClient";
-
-import { tokenStorage, AUTH_CLEARED_EVENT } from "../utils/tokenStorage";
-
-const WS_URL = import.meta.env.VITE_WS_URL;
-
-const RECONNECT_DELAY = 5000;
-
-const TOKEN_REFRESH_BUFFER_SECONDS = 30;
-
-const CONVERSATION_UPDATE_DESTINATION = "/user/queue/conversation-updates";
-
-// ==================================================
-// JWT EXPIRATION
-// ==================================================
-
-const getTokenExpiration = (token) => {
-  try {
-    const parts = token.split(".");
-
-    if (parts.length !== 3) {
-      return null;
-    }
-
-    const payload = JSON.parse(
-      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
-    );
-
-    return payload.exp || null;
-  } catch {
-    return null;
-  }
-};
-
-const isTokenExpiringSoon = (token) => {
-  const expiration = getTokenExpiration(token);
-
-  if (!expiration) {
-    return false;
-  }
-
-  const currentTime = Math.floor(Date.now() / 1000);
-
-  return expiration - currentTime <= TOKEN_REFRESH_BUFFER_SECONDS;
-};
-
-// ==================================================
-// GET VALID ACCESS TOKEN
-// ==================================================
-
-const getValidAccessToken = async () => {
-  let accessToken = tokenStorage.getAccessToken();
-
-  if (!accessToken) {
-    return null;
-  }
-
-  if (isTokenExpiringSoon(accessToken)) {
-    try {
-      accessToken = await refreshAccessToken();
-    } catch (error) {
-      console.error(
-        "Unable to refresh access token for conversation update WebSocket:",
-        error,
-      );
-
-      return null;
-    }
-  }
-
-  return accessToken;
-};
-
-// ==================================================
-// CREATE CONVERSATION UPDATE WEBSOCKET
-// ==================================================
-
-export const createConversationUpdateWebSocket = ({
-  onUpdate,
-  onConnect,
-  onDisconnect,
-  onError,
-}) => {
-  let manuallyDisconnected = false;
-
-  let subscription = null;
-
-  const client = new Client({
-    brokerURL: WS_URL,
-
-    // ----------------------------------------------
-    // AUTHENTICATION
-    // ----------------------------------------------
-
-    beforeConnect: async () => {
-      const accessToken = await getValidAccessToken();
-
-      if (!accessToken) {
-        throw new Error(
-          "No valid access token available for conversation update WebSocket",
-        );
-      }
-
-      client.connectHeaders = {
-        Authorization: `Bearer ${accessToken}`,
-      };
-    },
-
-    reconnectDelay: RECONNECT_DELAY,
-
-    heartbeatIncoming: 10000,
-
-    heartbeatOutgoing: 10000,
-
-    debug: () => {
-      // STOMP debug logging disabled.
-    },
-
-    // ----------------------------------------------
-    // CONNECT
-    // ----------------------------------------------
-
-    onConnect: () => {
-      if (manuallyDisconnected) {
-        return;
-      }
-
-      /*
-       * Prevent duplicate subscriptions
-       * after reconnect.
-       */
-      if (subscription) {
-        try {
-          subscription.unsubscribe();
-        } catch (error) {
-          console.error(
-            "Failed to remove previous conversation update subscription:",
-            error,
-          );
-        }
-
-        subscription = null;
-      }
-
-      subscription = client.subscribe(
-        CONVERSATION_UPDATE_DESTINATION,
-        (message) => {
-          try {
-            const update = JSON.parse(message.body);
-
-            if (!update) {
-              return;
-            }
-
-            onUpdate?.(update);
-          } catch (error) {
-            console.error(
-              "Failed to parse conversation update WebSocket message:",
-              error,
-            );
-
-            onError?.(error);
-          }
-        },
-      );
-
-      onConnect?.();
-    },
-
-    // ----------------------------------------------
-    // STOMP ERROR
-    // ----------------------------------------------
-
-    onStompError: async (frame) => {
-      const errorMessage =
-        frame.headers?.message || "Unknown conversation update broker error";
-
-      console.error("Conversation update STOMP broker error:", errorMessage);
-
-      const message = errorMessage.toLowerCase();
-
-      if (
-        message.includes("invalid access token") ||
-        message.includes("authentication") ||
-        message.includes("unauthorized") ||
-        message.includes("websocket authentication")
-      ) {
-        try {
-          await refreshAccessToken();
-
-          if (!manuallyDisconnected && !client.active) {
-            client.activate();
-          }
-        } catch (refreshError) {
-          console.error(
-            "Conversation update WebSocket authentication refresh failed:",
-            refreshError,
-          );
-
-          manuallyDisconnected = true;
-
-          try {
-            await client.deactivate();
-          } catch (deactivateError) {
-            console.error(
-              "Failed to deactivate conversation update WebSocket:",
-              deactivateError,
-            );
-          }
-
-          onError?.(refreshError);
-        }
-
-        return;
-      }
-
-      onError?.(new Error(errorMessage));
-    },
-
-    // ----------------------------------------------
-    // WEBSOCKET ERROR
-    // ----------------------------------------------
-
-    onWebSocketError: (error) => {
-      console.error("Conversation update WebSocket error:", error);
-
-      onError?.(error);
-    },
-
-    // ----------------------------------------------
-    // WEBSOCKET CLOSE
-    // ----------------------------------------------
-
-    onWebSocketClose: () => {
-      subscription = null;
-
-      onDisconnect?.();
-    },
-
-    // ----------------------------------------------
-    // STOMP DISCONNECT
-    // ----------------------------------------------
-
-    onDisconnect: () => {
-      subscription = null;
-
-      onDisconnect?.();
-    },
+export const createConversationUpdateWebSocket = ({ onUpdate, ...callbacks }) =>
+  createAuthenticatedWebSocket({
+    ...callbacks,
+    onMessage: onUpdate,
+    destination: "/user/queue/conversation-updates",
   });
-
-  // ==================================================
-  // AUTH CLEARED
-  // ==================================================
-
-  const handleAuthCleared = () => {
-    manuallyDisconnected = true;
-
-    subscription = null;
-
-    if (client.active) {
-      client.deactivate().catch((error) => {
-        console.error(
-          "Failed to disconnect conversation update WebSocket after logout:",
-          error,
-        );
-      });
-    }
-  };
-
-  window.addEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
-
-  // ==================================================
-  // PUBLIC API
-  // ==================================================
-
-  return {
-    connect: () => {
-      manuallyDisconnected = false;
-
-      if (!client.active) {
-        client.activate();
-      }
-    },
-
-    disconnect: async () => {
-      manuallyDisconnected = true;
-
-      subscription = null;
-
-      window.removeEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
-
-      if (client.active) {
-        await client.deactivate();
-      }
-    },
-
-    isActive: () => {
-      return client.active;
-    },
-
-    isConnected: () => {
-      return client.connected;
-    },
-  };
-};
```

## src/services/stompConnection.js

Added. Shared, injectable STOMP authentication, subscription, reconnect and disposal lifecycle.

### Full current content

```javascript
/** Shared lifecycle; each feature retains its own independently owned connection. */
export function createStompConnection({ createClient, getToken, refreshToken,
  authEvents, authClearedEvent, destination, onMessage, onConnect, onDisconnect,
  onError, publishDestination, brokerURL }) {
  let running = false;
  let disposed = false;
  let generation = 0;
  let subscription = null;
  let connected = false;
  let refreshRequired = false;
  let authenticationRetried = false;
  let listening = false;
  const report = (error) => { if (running) onError?.(error); };
  const notifyClosed = () => {
    subscription = null;
    if (connected) { connected = false; if (running) onDisconnect?.(); }
  };
  const stop = () => {
    running = false;
    generation++;
    connected = false;
    subscription = null;
    if (listening) authEvents.removeEventListener(authClearedEvent, stop);
    listening = false;
    return client.deactivate().catch(() => {});
  };
  const client = createClient({
    brokerURL, reconnectDelay: 5000, connectionTimeout: 10000,
    heartbeatIncoming: 10000, heartbeatOutgoing: 10000, debug: () => {},
    beforeConnect: async () => {
      const attempt = generation;
      try {
        let token = getToken();
        if (!running || !token) { await stop(); return; }
        if (refreshRequired || tokenExpiringSoon(token)) {
          refreshRequired = false;
          token = await refreshToken();
        }
        // Logout/disposal while refresh was pending must never reopen a socket.
        if (!running || attempt !== generation) return;
        if (!token || token !== getToken()) { await stop(); return; }
        client.connectHeaders = { Authorization: `Bearer ${token}` };
      } catch {
        // beforeConnect must settle normally: STOMP does not catch its rejection.
        report(new Error("Unable to authenticate live updates. Please sign in again."));
        await stop();
      }
    },
    onConnect: () => {
      if (!running) return;
      subscription?.unsubscribe();
      subscription = client.subscribe(destination, frame => {
        if (!running) return;
        try {
          const value = JSON.parse(frame.body);
          if (value && typeof value === "object" && !Array.isArray(value)) onMessage?.(value);
        } catch { report(new Error("Unable to read a live update.")); }
      });
      connected = true;
      authenticationRetried = false;
      onConnect?.();
    },
    onStompError: frame => {
      if (!running) return;
      const authError = /authentication|unauthorized|invalid access token/i.test(frame.headers?.message || "");
      if (authError && !authenticationRetried) {
        authenticationRetried = true;
        refreshRequired = true;
      } else {
        report(new Error(authError ? "Live authentication was rejected. Please sign in again." : "Live subscription was rejected."));
        void stop();
        onDisconnect?.();
        return;
      }
      // Reconnect runs beforeConnect and uses the latest token, even if ERROR stays open.
      notifyClosed();
      client.forceDisconnect();
    },
    onWebSocketError: () => report(new Error("Live connection is unavailable.")),
    onWebSocketClose: notifyClosed,
    onDisconnect: notifyClosed,
  });
  return {
    connect() {
      if (disposed || running) return;
      running = true;
      generation++;
      authEvents.addEventListener(authClearedEvent, stop);
      listening = true;
      client.activate();
    },
    disconnect() { disposed = true; return stop(); },
    isActive: () => running && client.active,
    isConnected: () => running && connected && client.connected,
    getClient: () => client,
    sendMessage(content) {
      if (!running || !connected || !client.connected || !publishDestination) throw new Error("Chat WebSocket is not connected");
      client.publish({ destination: publishDestination, body: JSON.stringify({ content }) });
    },
  };
}

export function tokenExpiringSoon(token, now = Date.now()) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp - Math.floor(now / 1000) <= 30;
  } catch { return false; } // Backend remains responsible for token validation.
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/services/stompConnection.js
@@ -0,0 +1,108 @@
+/** Shared lifecycle; each feature retains its own independently owned connection. */
+export function createStompConnection({ createClient, getToken, refreshToken,
+  authEvents, authClearedEvent, destination, onMessage, onConnect, onDisconnect,
+  onError, publishDestination, brokerURL }) {
+  let running = false;
+  let disposed = false;
+  let generation = 0;
+  let subscription = null;
+  let connected = false;
+  let refreshRequired = false;
+  let authenticationRetried = false;
+  let listening = false;
+  const report = (error) => { if (running) onError?.(error); };
+  const notifyClosed = () => {
+    subscription = null;
+    if (connected) { connected = false; if (running) onDisconnect?.(); }
+  };
+  const stop = () => {
+    running = false;
+    generation++;
+    connected = false;
+    subscription = null;
+    if (listening) authEvents.removeEventListener(authClearedEvent, stop);
+    listening = false;
+    return client.deactivate().catch(() => {});
+  };
+  const client = createClient({
+    brokerURL, reconnectDelay: 5000, connectionTimeout: 10000,
+    heartbeatIncoming: 10000, heartbeatOutgoing: 10000, debug: () => {},
+    beforeConnect: async () => {
+      const attempt = generation;
+      try {
+        let token = getToken();
+        if (!running || !token) { await stop(); return; }
+        if (refreshRequired || tokenExpiringSoon(token)) {
+          refreshRequired = false;
+          token = await refreshToken();
+        }
+        // Logout/disposal while refresh was pending must never reopen a socket.
+        if (!running || attempt !== generation) return;
+        if (!token || token !== getToken()) { await stop(); return; }
+        client.connectHeaders = { Authorization: `Bearer ${token}` };
+      } catch {
+        // beforeConnect must settle normally: STOMP does not catch its rejection.
+        report(new Error("Unable to authenticate live updates. Please sign in again."));
+        await stop();
+      }
+    },
+    onConnect: () => {
+      if (!running) return;
+      subscription?.unsubscribe();
+      subscription = client.subscribe(destination, frame => {
+        if (!running) return;
+        try {
+          const value = JSON.parse(frame.body);
+          if (value && typeof value === "object" && !Array.isArray(value)) onMessage?.(value);
+        } catch { report(new Error("Unable to read a live update.")); }
+      });
+      connected = true;
+      authenticationRetried = false;
+      onConnect?.();
+    },
+    onStompError: frame => {
+      if (!running) return;
+      const authError = /authentication|unauthorized|invalid access token/i.test(frame.headers?.message || "");
+      if (authError && !authenticationRetried) {
+        authenticationRetried = true;
+        refreshRequired = true;
+      } else {
+        report(new Error(authError ? "Live authentication was rejected. Please sign in again." : "Live subscription was rejected."));
+        void stop();
+        onDisconnect?.();
+        return;
+      }
+      // Reconnect runs beforeConnect and uses the latest token, even if ERROR stays open.
+      notifyClosed();
+      client.forceDisconnect();
+    },
+    onWebSocketError: () => report(new Error("Live connection is unavailable.")),
+    onWebSocketClose: notifyClosed,
+    onDisconnect: notifyClosed,
+  });
+  return {
+    connect() {
+      if (disposed || running) return;
+      running = true;
+      generation++;
+      authEvents.addEventListener(authClearedEvent, stop);
+      listening = true;
+      client.activate();
+    },
+    disconnect() { disposed = true; return stop(); },
+    isActive: () => running && client.active,
+    isConnected: () => running && connected && client.connected,
+    getClient: () => client,
+    sendMessage(content) {
+      if (!running || !connected || !client.connected || !publishDestination) throw new Error("Chat WebSocket is not connected");
+      client.publish({ destination: publishDestination, body: JSON.stringify({ content }) });
+    },
+  };
+}
+
+export function tokenExpiringSoon(token, now = Date.now()) {
+  try {
+    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
+    return typeof payload.exp === "number" && payload.exp - Math.floor(now / 1000) <= 30;
+  } catch { return false; } // Backend remains responsible for token validation.
+}
```

## src/services/webSocketService.js

Updated. Small compatibility adapter retaining the feature destination and callback names.

### Full current content

```javascript
import { createAuthenticatedWebSocket } from "./authenticatedWebSocket";

export const createNotificationWebSocket = ({ onNotification, ...callbacks }) =>
  createAuthenticatedWebSocket({
    ...callbacks,
    onMessage: onNotification,
    destination: "/user/queue/notifications",
  });
```

### Changes (+ added / - removed)

```diff
--- before/src/services/webSocketService.js
+++ after/src/services/webSocketService.js
@@ -1,303 +1,8 @@
-import { Client } from "@stomp/stompjs";
+import { createAuthenticatedWebSocket } from "./authenticatedWebSocket";
 
-import { refreshAccessToken } from "../api/axiosClient";
-
-import { tokenStorage, AUTH_CLEARED_EVENT } from "../utils/tokenStorage";
-
-const WS_URL = import.meta.env.VITE_WS_URL;
-
-const NOTIFICATION_DESTINATION = "/user/queue/notifications";
-
-const RECONNECT_DELAY = 5000;
-
-const TOKEN_REFRESH_BUFFER_SECONDS = 30;
-
-// ==================================================
-// JWT EXPIRATION
-// ==================================================
-
-const getTokenExpiration = (token) => {
-  try {
-    const parts = token.split(".");
-
-    if (parts.length !== 3) {
-      return null;
-    }
-
-    const payload = JSON.parse(
-      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
-    );
-
-    return payload.exp || null;
-  } catch {
-    return null;
-  }
-};
-
-const isTokenExpiringSoon = (token) => {
-  const expiration = getTokenExpiration(token);
-
-  if (!expiration) {
-    /*
-     * If the token cannot be decoded,
-     * let the backend perform validation.
-     */
-    return false;
-  }
-
-  const currentTime = Math.floor(Date.now() / 1000);
-
-  return expiration - currentTime <= TOKEN_REFRESH_BUFFER_SECONDS;
-};
-
-// ==================================================
-// GET VALID ACCESS TOKEN
-// ==================================================
-
-const getValidAccessToken = async () => {
-  let accessToken = tokenStorage.getAccessToken();
-
-  if (!accessToken) {
-    return null;
-  }
-
-  if (isTokenExpiringSoon(accessToken)) {
-    try {
-      accessToken = await refreshAccessToken();
-    } catch (error) {
-      console.error("Unable to refresh access token for WebSocket:", error);
-
-      return null;
-    }
-  }
-
-  return accessToken;
-};
-
-// ==================================================
-// CREATE NOTIFICATION WEBSOCKET
-// ==================================================
-
-export const createNotificationWebSocket = ({
-  onNotification,
-  onConnect,
-  onDisconnect,
-  onError,
-}) => {
-  let manuallyDisconnected = false;
-
-  let subscription = null;
-
-  const client = new Client({
-    brokerURL: WS_URL,
-
-    /*
-     * Get the latest access token before every
-     * connection/reconnection.
-     */
-    beforeConnect: async () => {
-      const accessToken = await getValidAccessToken();
-
-      if (!accessToken) {
-        throw new Error("No valid access token available for WebSocket");
-      }
-
-      client.connectHeaders = {
-        Authorization: `Bearer ${accessToken}`,
-      };
-    },
-
-    reconnectDelay: RECONNECT_DELAY,
-
-    heartbeatIncoming: 10000,
-
-    heartbeatOutgoing: 10000,
-
-    debug: () => {
-      /*
-       * STOMP debug logging disabled normally.
-       */
-    },
-
-    // ==================================================
-    // CONNECT
-    // ==================================================
-
-    onConnect: () => {
-      if (manuallyDisconnected) {
-        return;
-      }
-
-      /*
-       * Prevent duplicate subscriptions if STOMP
-       * reconnects using the same client.
-       */
-      if (subscription) {
-        try {
-          subscription.unsubscribe();
-        } catch (error) {
-          console.error(
-            "Failed to remove old notification subscription:",
-            error,
-          );
-        }
-
-        subscription = null;
-      }
-
-      subscription = client.subscribe(NOTIFICATION_DESTINATION, (message) => {
-        try {
-          const notification = JSON.parse(message.body);
-
-          if (!notification) {
-            console.warn("Notification WS: empty notification");
-
-            return;
-          }
-
-          onNotification?.(notification);
-        } catch (error) {
-          console.error("Failed to parse WebSocket notification:", error);
-
-          onError?.(error);
-        }
-      });
-
-      onConnect?.();
-    },
-
-    // ==================================================
-    // STOMP ERROR
-    // ==================================================
-
-    onStompError: async (frame) => {
-      const errorMessage = frame.headers?.message || "Unknown broker error";
-
-      console.error("STOMP broker error:", errorMessage);
-
-      const message = errorMessage.toLowerCase();
-
-      /*
-       * Authentication failure.
-       *
-       * Refresh the token and allow the STOMP
-       * client to reconnect using beforeConnect().
-       */
-      if (
-        message.includes("invalid access token") ||
-        message.includes("authentication") ||
-        message.includes("unauthorized") ||
-        message.includes("websocket authentication")
-      ) {
-        try {
-          await refreshAccessToken();
-
-          if (!manuallyDisconnected && !client.active) {
-            client.activate();
-          }
-        } catch (refreshError) {
-          console.error(
-            "WebSocket authentication refresh failed:",
-            refreshError,
-          );
-
-          manuallyDisconnected = true;
-
-          try {
-            await client.deactivate();
-          } catch (deactivateError) {
-            console.error("Failed to deactivate WebSocket:", deactivateError);
-          }
-
-          onError?.(refreshError);
-        }
-
-        return;
-      }
-
-      onError?.(new Error(errorMessage));
-    },
-
-    // ==================================================
-    // WEBSOCKET ERROR
-    // ==================================================
-
-    onWebSocketError: (error) => {
-      console.error("WebSocket error:", error);
-
-      onError?.(error);
-    },
-
-    // ==================================================
-    // WEBSOCKET CLOSE
-    // ==================================================
-
-    onWebSocketClose: () => {
-      subscription = null;
-
-      onDisconnect?.();
-    },
-
-    // ==================================================
-    // STOMP DISCONNECT
-    // ==================================================
-
-    onDisconnect: () => {
-      subscription = null;
-
-      onDisconnect?.();
-    },
+export const createNotificationWebSocket = ({ onNotification, ...callbacks }) =>
+  createAuthenticatedWebSocket({
+    ...callbacks,
+    onMessage: onNotification,
+    destination: "/user/queue/notifications",
   });
-
-  // ==================================================
-  // AUTH CLEARED
-  // ==================================================
-
-  const handleAuthCleared = () => {
-    manuallyDisconnected = true;
-
-    subscription = null;
-
-    if (client.active) {
-      client.deactivate().catch((error) => {
-        console.error("Failed to disconnect WebSocket after logout:", error);
-      });
-    }
-  };
-
-  window.addEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
-
-  // ==================================================
-  // PUBLIC API
-  // ==================================================
-
-  return {
-    connect: () => {
-      manuallyDisconnected = false;
-
-      if (!client.active) {
-        client.activate();
-      }
-    },
-
-    disconnect: async () => {
-      manuallyDisconnected = true;
-
-      subscription = null;
-
-      window.removeEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
-
-      if (client.active) {
-        await client.deactivate();
-      }
-    },
-
-    isActive: () => {
-      return client.active;
-    },
-
-    getClient: () => {
-      return client;
-    },
-  };
-};
```

## tests/liveAuth.browser.mjs

Added. Regression coverage for lifecycle races, adapters and authentication changes.

### Full current content

```javascript
import { createServer } from "../node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = "http://127.0.0.1:41816";
process.env.VITE_API_BASE_URL = origin;
process.env.VITE_WS_URL = origin.replace("http", "ws") + "/ws";
const server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)),
  server: { host: "127.0.0.1", port: 41816, strictPort: true } });
let browser;
try {
  await server.listen(); browser = await chromium.launch({channel:"msedge",headless:true});
  const page = await browser.newPage(), errors = [], destinations = [];
  page.on("pageerror", e => errors.push(e.message));
  let pendingRoute;
  await page.route("**/*", route => {
    const url=new URL(route.request().url());
    assert.equal(url.origin,origin,"External traffic is prohibited");
    if(url.pathname==="/fixture") return route.fulfill({contentType:"text/html",body:"<html><body>Local fixture</body></html>"});
    if(url.pathname==="/api/auth/refresh") { pendingRoute=route; return; }
    return route.continue();
  });
  await page.routeWebSocket("**/ws", socket => {
    socket.onMessage(frame => {
      const text=String(frame);
      if(/^(CONNECT|STOMP)/.test(text)) socket.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
      if(text.startsWith("SUBSCRIBE")) {
        const destination=text.match(/\ndestination:([^\n]+)/)[1],id=text.match(/\nid:([^\n]+)/)[1];
        destinations.push(destination);
        socket.send(`MESSAGE\nsubscription:${id}\nmessage-id:1\ndestination:${destination}\n\n{"id":1}\0`);
      }
      if(text.startsWith("DISCONNECT")) socket.close();
    });
  });
  await page.goto(origin+"/fixture");
  await page.evaluate(async () => {
    window.storage=(await import("/src/utils/tokenStorage.js")).tokenStorage;
    window.refresh=(await import("/src/api/axiosClient.js")).refreshAccessToken;
    window.storage.saveAuth("old-access","old-refresh",{id:1});
  });
  for(const scenario of ["logout","new-login-success","new-login-failure"]) {
    pendingRoute=null;
    await page.evaluate(() => { window.storage.saveAuth("old-access","old-refresh",{id:1}); window.result=window.refresh().then(()=>"success",()=>"rejected"); });
    for(let i=0;!pendingRoute&&i<200;i++) await new Promise(r=>setTimeout(r,10));
    assert.ok(pendingRoute);
    await page.evaluate(mode => mode==="logout" ? window.storage.clear() : window.storage.saveAuth("new-access","new-refresh",{id:2}),scenario);
    await pendingRoute.fulfill({status:scenario.endsWith("failure")?401:200,json:{accessToken:"stale-access",refreshToken:"stale-refresh"}});
    assert.equal(await page.evaluate(()=>window.result),"rejected");
    assert.equal(await page.evaluate(()=>window.storage.getAccessToken()),scenario==="logout"?null:"new-access");
  }
  await page.evaluate(async () => {
    const {createNotificationWebSocket}=await import("/src/services/webSocketService.js");
    const {createConversationUpdateWebSocket}=await import("/src/services/conversationUpdateWebSocketService.js");
    const {createChatWebSocket}=await import("/src/services/chatWebSocketService.js");
    window.received=[];
    window.sockets=[createNotificationWebSocket({onNotification:x=>window.received.push(x)}),
      createConversationUpdateWebSocket({onUpdate:x=>window.received.push(x)}),
      createChatWebSocket({conversationId:12,onMessage:x=>window.received.push(x)})];
    window.sockets.forEach(s=>s.connect());
  });
  await page.waitForFunction(()=>window.received.length===3);
  assert.deepEqual(destinations.sort(),["/topic/conversations/12","/user/queue/conversation-updates","/user/queue/notifications"].sort());
  await page.evaluate(()=>window.storage.clear());
  await page.waitForFunction(()=>window.sockets.every(s=>!s.isActive()));
  assert.deepEqual(errors,[]);
  console.log("PASS: stale refresh cannot restore logout or overwrite/clear newer login; all three adapters subscribe and deliver; logout stops all clients.");
} finally { await browser?.close(); await server.close(); }
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/tests/liveAuth.browser.mjs
@@ -0,0 +1,67 @@
+import { createServer } from "../node_modules/vite/dist/node/index.js";
+import { fileURLToPath } from "node:url";
+import assert from "node:assert/strict";
+const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
+const origin = "http://127.0.0.1:41816";
+process.env.VITE_API_BASE_URL = origin;
+process.env.VITE_WS_URL = origin.replace("http", "ws") + "/ws";
+const server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)),
+  server: { host: "127.0.0.1", port: 41816, strictPort: true } });
+let browser;
+try {
+  await server.listen(); browser = await chromium.launch({channel:"msedge",headless:true});
+  const page = await browser.newPage(), errors = [], destinations = [];
+  page.on("pageerror", e => errors.push(e.message));
+  let pendingRoute;
+  await page.route("**/*", route => {
+    const url=new URL(route.request().url());
+    assert.equal(url.origin,origin,"External traffic is prohibited");
+    if(url.pathname==="/fixture") return route.fulfill({contentType:"text/html",body:"<html><body>Local fixture</body></html>"});
+    if(url.pathname==="/api/auth/refresh") { pendingRoute=route; return; }
+    return route.continue();
+  });
+  await page.routeWebSocket("**/ws", socket => {
+    socket.onMessage(frame => {
+      const text=String(frame);
+      if(/^(CONNECT|STOMP)/.test(text)) socket.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
+      if(text.startsWith("SUBSCRIBE")) {
+        const destination=text.match(/\ndestination:([^\n]+)/)[1],id=text.match(/\nid:([^\n]+)/)[1];
+        destinations.push(destination);
+        socket.send(`MESSAGE\nsubscription:${id}\nmessage-id:1\ndestination:${destination}\n\n{"id":1}\0`);
+      }
+      if(text.startsWith("DISCONNECT")) socket.close();
+    });
+  });
+  await page.goto(origin+"/fixture");
+  await page.evaluate(async () => {
+    window.storage=(await import("/src/utils/tokenStorage.js")).tokenStorage;
+    window.refresh=(await import("/src/api/axiosClient.js")).refreshAccessToken;
+    window.storage.saveAuth("old-access","old-refresh",{id:1});
+  });
+  for(const scenario of ["logout","new-login-success","new-login-failure"]) {
+    pendingRoute=null;
+    await page.evaluate(() => { window.storage.saveAuth("old-access","old-refresh",{id:1}); window.result=window.refresh().then(()=>"success",()=>"rejected"); });
+    for(let i=0;!pendingRoute&&i<200;i++) await new Promise(r=>setTimeout(r,10));
+    assert.ok(pendingRoute);
+    await page.evaluate(mode => mode==="logout" ? window.storage.clear() : window.storage.saveAuth("new-access","new-refresh",{id:2}),scenario);
+    await pendingRoute.fulfill({status:scenario.endsWith("failure")?401:200,json:{accessToken:"stale-access",refreshToken:"stale-refresh"}});
+    assert.equal(await page.evaluate(()=>window.result),"rejected");
+    assert.equal(await page.evaluate(()=>window.storage.getAccessToken()),scenario==="logout"?null:"new-access");
+  }
+  await page.evaluate(async () => {
+    const {createNotificationWebSocket}=await import("/src/services/webSocketService.js");
+    const {createConversationUpdateWebSocket}=await import("/src/services/conversationUpdateWebSocketService.js");
+    const {createChatWebSocket}=await import("/src/services/chatWebSocketService.js");
+    window.received=[];
+    window.sockets=[createNotificationWebSocket({onNotification:x=>window.received.push(x)}),
+      createConversationUpdateWebSocket({onUpdate:x=>window.received.push(x)}),
+      createChatWebSocket({conversationId:12,onMessage:x=>window.received.push(x)})];
+    window.sockets.forEach(s=>s.connect());
+  });
+  await page.waitForFunction(()=>window.received.length===3);
+  assert.deepEqual(destinations.sort(),["/topic/conversations/12","/user/queue/conversation-updates","/user/queue/notifications"].sort());
+  await page.evaluate(()=>window.storage.clear());
+  await page.waitForFunction(()=>window.sockets.every(s=>!s.isActive()));
+  assert.deepEqual(errors,[]);
+  console.log("PASS: stale refresh cannot restore logout or overwrite/clear newer login; all three adapters subscribe and deliver; logout stops all clients.");
+} finally { await browser?.close(); await server.close(); }
```

## tests/stompConnection.test.js

Added. Regression coverage for lifecycle races, adapters and authentication changes.

### Full current content

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { createStompConnection, tokenExpiringSoon } from "../src/services/stompConnection.js";

const jwt = exp => `x.${btoa(JSON.stringify({ exp }))}.x`;
function fixture(refresh) {
  let token = jwt(9999999999), config, handler;
  const events = new EventTarget(), errors = [], messages = [];
  let opened = 0, closed = 0, subscriptions = 0, unsubscribed = 0;
  const client = { active: false, connected: false, connectHeaders: {},
    activate() { this.active = true; },
    async deactivate() { this.active = false; this.connected = false; },
    forceDisconnect() { this.connected = false; config.onWebSocketClose(); },
    subscribe(destination, callback) { assert.equal(destination, "/topic/conversations/12"); subscriptions++; handler = callback; return { unsubscribe() { unsubscribed++; } }; },
  };
  const socket = createStompConnection({ createClient: c => { config = c; return client; },
    destination: "/topic/conversations/12", getToken: () => token,
    refreshToken: async () => { const value = await refresh?.(); if (value) token = value; return value; },
    authEvents: events, authClearedEvent: "logout", onMessage: m => messages.push(m),
    onError: e => errors.push(e), onConnect: () => opened++, onDisconnect: () => closed++,
  });
  return { socket, client, events, errors, messages, config,
    setToken: t => { token = t; }, emit: body => handler({ body }),
    connect: async () => { socket.connect(); await config.beforeConnect(); if (client.active) { client.connected = true; config.onConnect(); } },
    counts: () => ({ opened, closed, subscriptions, unsubscribed }) };
}

test("expiry threshold and malformed tokens leave validation to backend", () => {
  assert.equal(tokenExpiringSoon(jwt(130),100000),true);
  assert.equal(tokenExpiringSoon(jwt(131),100000),false);
  assert.equal(tokenExpiringSoon("invalid"),false);
});
test("connect and reconnect use current token and one subscription", async () => {
  const f=fixture(); await f.connect(); f.emit('{"id":1}');
  f.setToken(jwt(9999999998)); await f.config.beforeConnect(); f.config.onConnect();
  assert.equal(f.client.connectHeaders.Authorization,`Bearer ${jwt(9999999998)}`);
  assert.deepEqual(f.counts(),{opened:2,closed:0,subscriptions:2,unsubscribed:1});
  assert.deepEqual(f.messages,[{id:1}]); await f.socket.disconnect();
});
test("malformed frame reports safe error and later valid update works", async () => {
  const f=fixture(); await f.connect(); f.emit("secret invalid payload"); f.emit('{"id":2}');
  assert.equal(f.errors.length,1); assert.ok(!f.errors[0].message.includes("secret"));
  assert.deepEqual(f.messages,[{id:2}]); await f.socket.disconnect();
});
test("close callbacks are deduplicated", async () => {
  const f=fixture(); await f.connect(); f.config.onWebSocketClose(); f.config.onDisconnect();
  assert.equal(f.counts().closed,1); await f.socket.disconnect();
});
test("logout during refresh stops connection and ignores late frames", async () => {
  let resolve; const pending=new Promise(r=>{resolve=r;});
  const f=fixture(()=>pending); await f.connect(); f.setToken(jwt(1));
  const flight=f.config.beforeConnect(); f.events.dispatchEvent(new Event("logout"));
  resolve(jwt(9999999999)); await flight; f.emit('{"id":3}');
  assert.equal(f.client.active,false); assert.equal(f.socket.isConnected(),false);
  assert.deepEqual(f.messages,[]);
});
test("refresh rejection settles beforeConnect without unhandled rejection", async () => {
  const f=fixture(()=>Promise.reject(new Error("private"))); f.setToken(jwt(1));
  f.socket.connect(); await assert.doesNotReject(f.config.beforeConnect());
  assert.equal(f.client.active,false); assert.equal(f.errors.length,1);
});
test("auth error refreshes on reconnect once and repeated rejection stops", async () => {
  let refreshes=0; const f=fixture(()=>{refreshes++;return jwt(9999999999);});
  await f.connect(); f.config.onStompError({headers:{message:"Unauthorized"}});
  await f.config.beforeConnect(); assert.equal(refreshes,1);
  f.config.onStompError({headers:{message:"Unauthorized"}});
  assert.equal(f.client.active,false); assert.equal(f.errors.length,1);
});
test("disposal is final and suppresses stale callbacks", async () => {
  const f=fixture(); await f.connect(); await f.socket.disconnect();
  f.socket.connect(); f.config.onConnect(); f.emit('{"id":9}'); f.config.onWebSocketError();
  assert.equal(f.client.active,false); assert.equal(f.counts().opened,1);
  assert.deepEqual(f.messages,[]); assert.deepEqual(f.errors,[]);
});
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/tests/stompConnection.test.js
@@ -0,0 +1,74 @@
+import test from "node:test";
+import assert from "node:assert/strict";
+import { createStompConnection, tokenExpiringSoon } from "../src/services/stompConnection.js";
+
+const jwt = exp => `x.${btoa(JSON.stringify({ exp }))}.x`;
+function fixture(refresh) {
+  let token = jwt(9999999999), config, handler;
+  const events = new EventTarget(), errors = [], messages = [];
+  let opened = 0, closed = 0, subscriptions = 0, unsubscribed = 0;
+  const client = { active: false, connected: false, connectHeaders: {},
+    activate() { this.active = true; },
+    async deactivate() { this.active = false; this.connected = false; },
+    forceDisconnect() { this.connected = false; config.onWebSocketClose(); },
+    subscribe(destination, callback) { assert.equal(destination, "/topic/conversations/12"); subscriptions++; handler = callback; return { unsubscribe() { unsubscribed++; } }; },
+  };
+  const socket = createStompConnection({ createClient: c => { config = c; return client; },
+    destination: "/topic/conversations/12", getToken: () => token,
+    refreshToken: async () => { const value = await refresh?.(); if (value) token = value; return value; },
+    authEvents: events, authClearedEvent: "logout", onMessage: m => messages.push(m),
+    onError: e => errors.push(e), onConnect: () => opened++, onDisconnect: () => closed++,
+  });
+  return { socket, client, events, errors, messages, config,
+    setToken: t => { token = t; }, emit: body => handler({ body }),
+    connect: async () => { socket.connect(); await config.beforeConnect(); if (client.active) { client.connected = true; config.onConnect(); } },
+    counts: () => ({ opened, closed, subscriptions, unsubscribed }) };
+}
+
+test("expiry threshold and malformed tokens leave validation to backend", () => {
+  assert.equal(tokenExpiringSoon(jwt(130),100000),true);
+  assert.equal(tokenExpiringSoon(jwt(131),100000),false);
+  assert.equal(tokenExpiringSoon("invalid"),false);
+});
+test("connect and reconnect use current token and one subscription", async () => {
+  const f=fixture(); await f.connect(); f.emit('{"id":1}');
+  f.setToken(jwt(9999999998)); await f.config.beforeConnect(); f.config.onConnect();
+  assert.equal(f.client.connectHeaders.Authorization,`Bearer ${jwt(9999999998)}`);
+  assert.deepEqual(f.counts(),{opened:2,closed:0,subscriptions:2,unsubscribed:1});
+  assert.deepEqual(f.messages,[{id:1}]); await f.socket.disconnect();
+});
+test("malformed frame reports safe error and later valid update works", async () => {
+  const f=fixture(); await f.connect(); f.emit("secret invalid payload"); f.emit('{"id":2}');
+  assert.equal(f.errors.length,1); assert.ok(!f.errors[0].message.includes("secret"));
+  assert.deepEqual(f.messages,[{id:2}]); await f.socket.disconnect();
+});
+test("close callbacks are deduplicated", async () => {
+  const f=fixture(); await f.connect(); f.config.onWebSocketClose(); f.config.onDisconnect();
+  assert.equal(f.counts().closed,1); await f.socket.disconnect();
+});
+test("logout during refresh stops connection and ignores late frames", async () => {
+  let resolve; const pending=new Promise(r=>{resolve=r;});
+  const f=fixture(()=>pending); await f.connect(); f.setToken(jwt(1));
+  const flight=f.config.beforeConnect(); f.events.dispatchEvent(new Event("logout"));
+  resolve(jwt(9999999999)); await flight; f.emit('{"id":3}');
+  assert.equal(f.client.active,false); assert.equal(f.socket.isConnected(),false);
+  assert.deepEqual(f.messages,[]);
+});
+test("refresh rejection settles beforeConnect without unhandled rejection", async () => {
+  const f=fixture(()=>Promise.reject(new Error("private"))); f.setToken(jwt(1));
+  f.socket.connect(); await assert.doesNotReject(f.config.beforeConnect());
+  assert.equal(f.client.active,false); assert.equal(f.errors.length,1);
+});
+test("auth error refreshes on reconnect once and repeated rejection stops", async () => {
+  let refreshes=0; const f=fixture(()=>{refreshes++;return jwt(9999999999);});
+  await f.connect(); f.config.onStompError({headers:{message:"Unauthorized"}});
+  await f.config.beforeConnect(); assert.equal(refreshes,1);
+  f.config.onStompError({headers:{message:"Unauthorized"}});
+  assert.equal(f.client.active,false); assert.equal(f.errors.length,1);
+});
+test("disposal is final and suppresses stale callbacks", async () => {
+  const f=fixture(); await f.connect(); await f.socket.disconnect();
+  f.socket.connect(); f.config.onConnect(); f.emit('{"id":9}'); f.config.onWebSocketError();
+  assert.equal(f.client.active,false); assert.equal(f.counts().opened,1);
+  assert.deepEqual(f.messages,[]); assert.deepEqual(f.errors,[]);
+});
```

