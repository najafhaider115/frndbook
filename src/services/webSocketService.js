import { createAuthenticatedWebSocket } from "./authenticatedWebSocket";

export const createNotificationWebSocket = ({ onNotification, ...callbacks }) =>
  createAuthenticatedWebSocket({
    ...callbacks,
    onMessage: onNotification,
    destination: "/user/queue/notifications",
  });
