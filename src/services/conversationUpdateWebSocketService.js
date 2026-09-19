import { createAuthenticatedWebSocket } from "./authenticatedWebSocket";

export const createConversationUpdateWebSocket = ({ onUpdate, ...callbacks }) =>
  createAuthenticatedWebSocket({
    ...callbacks,
    onMessage: onUpdate,
    destination: "/user/queue/conversation-updates",
  });
