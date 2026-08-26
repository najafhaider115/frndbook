import { useEffect, useRef, useState } from "react";

import UserAvatar from "../users/UserAvatar";

import MessageList from "./MessageList";
import MessageComposer from "./MessageComposer";

import { getMessages, markMessagesAsRead } from "../../api/messageApi";

import { createChatWebSocket } from "../../services/chatWebSocketService";

const PAGE_SIZE = 10;

const ChatWindow = ({
  conversation,
  currentUserId,
  onMessageReceived,
  onBackToConversations,
}) => {
  const [messages, setMessages] = useState([]);

  const [loading, setLoading] = useState(true);

  const [loadingOlder, setLoadingOlder] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);

  const [totalPages, setTotalPages] = useState(0);

  const [socketConnected, setSocketConnected] = useState(false);

  const [error, setError] = useState("");

  const webSocketRef = useRef(null);

  const conversationId = conversation?.id;

  // ==================================================
  // LOAD INITIAL MESSAGES
  // ==================================================

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    let cancelled = false;

    const initializeChat = async () => {
      try {
        setLoading(true);
        setError("");

        setMessages([]);
        setCurrentPage(0);
        setTotalPages(0);
        setSocketConnected(false);

        const data = await getMessages(conversationId, 0, PAGE_SIZE);

        if (cancelled) {
          return;
        }

        const loadedMessages = [...(data?.content || [])].reverse();

        setMessages(loadedMessages);

        setCurrentPage(data?.number ?? 0);

        setTotalPages(data?.totalPages ?? 0);

        await markMessagesAsRead(conversationId);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to initialize chat:", error);

          setError(error.response?.data?.message || "Unable to load messages");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initializeChat();

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // ==================================================
  // WEBSOCKET
  // ==================================================

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    let cancelled = false;

    const webSocket = createChatWebSocket({
      conversationId,

      onMessage: async (message) => {
        if (cancelled) {
          return;
        }

        setMessages((currentMessages) => {
          const exists = currentMessages.some(
            (item) => String(item.id) === String(message.id),
          );

          if (exists) {
            return currentMessages;
          }

          return [...currentMessages, message];
        });

        onMessageReceived?.(message);

        if (String(message.sender?.id) !== String(currentUserId)) {
          try {
            await markMessagesAsRead(conversationId);
          } catch (error) {
            console.error("Failed to mark messages as read:", error);
          }
        }
      },

      onConnect: () => {
        if (!cancelled) {
          setSocketConnected(true);
          setError("");
        }
      },

      onDisconnect: () => {
        if (!cancelled) {
          setSocketConnected(false);
        }
      },

      onError: (error) => {
        if (!cancelled) {
          console.error("Chat WebSocket error:", error);

          setSocketConnected(false);
        }
      },
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
          console.error("Failed to disconnect chat WebSocket:", error);
        });
      }
    };
  }, [conversationId, currentUserId, onMessageReceived]);

  // ==================================================
  // LOAD OLDER MESSAGES
  // ==================================================

  const loadOlderMessages = async () => {
    if (loadingOlder || currentPage >= totalPages - 1) {
      return;
    }

    const nextPage = currentPage + 1;

    try {
      setLoadingOlder(true);
      setError("");

      const data = await getMessages(conversationId, nextPage, PAGE_SIZE);

      const olderMessages = [...(data?.content || [])].reverse();

      setMessages((currentMessages) => {
        const existingIds = new Set(
          currentMessages.map((message) => String(message.id)),
        );

        const uniqueOlderMessages = olderMessages.filter(
          (message) => !existingIds.has(String(message.id)),
        );

        return [...uniqueOlderMessages, ...currentMessages];
      });

      setCurrentPage(data?.number ?? nextPage);

      setTotalPages(data?.totalPages ?? totalPages);
    } catch (error) {
      console.error("Failed to load older messages:", error);

      setError(
        error.response?.data?.message || "Unable to load older messages",
      );
    } finally {
      setLoadingOlder(false);
    }
  };

  // ==================================================
  // SEND MESSAGE
  // ==================================================

  const handleSendMessage = async (content) => {
    setError("");

    try {
      if (webSocketRef.current && webSocketRef.current.isConnected()) {
        webSocketRef.current.sendMessage(content);

        return;
      }

      const { sendMessage } = await import("../../api/messageApi");

      const savedMessage = await sendMessage(conversationId, content);

      if (!savedMessage) {
        return;
      }
    } catch (error) {
      console.error("Failed to send message:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Unable to send message",
      );

      throw error;
    }
  };

  // ==================================================
  // NO CONVERSATION
  // ==================================================

  if (!conversation) {
    return (
      <section className="chat-window chat-window-empty">
        <p>Select a conversation to start chatting.</p>
      </section>
    );
  }

  const otherUser = conversation.otherUser;

  return (
    <section className="chat-window">
      <header className="chat-header">
        <button
          type="button"
          className="mobile-chat-back-button"
          onClick={onBackToConversations}
          aria-label="Back to conversations"
        >
          ←
        </button>

        <UserAvatar
          name={otherUser?.name}
          image={otherUser?.profileImage}
          userId={otherUser?.id}
          size="medium"
        />

        <div className="chat-header-info">
          <h2>{otherUser?.name || "Unknown User"}</h2>

          <span
            className={
              socketConnected
                ? "chat-connection-status connected"
                : "chat-connection-status"
            }
          >
            {socketConnected ? "Connected" : "Connecting..."}
          </span>
        </div>
      </header>

      {error && <p className="error chat-error">{error}</p>}

      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        loading={loading}
        loadingOlder={loadingOlder}
        hasOlderMessages={currentPage < totalPages - 1}
        onLoadOlder={loadOlderMessages}
      />

      <MessageComposer onSend={handleSendMessage} disabled={!conversationId} />
    </section>
  );
};

export default ChatWindow;
