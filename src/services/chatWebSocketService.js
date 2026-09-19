import { createAuthenticatedWebSocket } from "./authenticatedWebSocket";

export const createChatWebSocket = ({ conversationId, ...callbacks }) => {
  if (!conversationId) return null;
  return createAuthenticatedWebSocket({
    ...callbacks,
    destination: `/topic/conversations/${conversationId}`,
    publishDestination: `/app/chat/${conversationId}`,
  });
};
