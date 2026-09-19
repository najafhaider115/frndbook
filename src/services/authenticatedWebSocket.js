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
