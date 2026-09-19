# fbfrontend - Phase 8.2: Full code and changes

Paths are relative to the frontend root. Every changed current file is provided in full. The three stylesheet renames use their original paths as diff sources. Phase 8.1 is the baseline.

## src/auth/ProtectedRoute.jsx

Updated. Expose loading text as a status; authentication decisions are unchanged.

### Full current content

```jsx
import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div role="status" className="loading-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
```

### Changes (+ added / - removed)

```diff
--- before/src/auth/ProtectedRoute.jsx
+++ after/src/auth/ProtectedRoute.jsx
@@ -6,7 +6,7 @@
   const { user, loading } = useAuth();
 
   if (loading) {
-    return <div className="loading-screen">Loading...</div>;
+    return <div role="status" className="loading-screen">Loading...</div>;
   }
 
   if (!user) {
```

## src/auth/PublicRoute.jsx

Updated. Expose loading text as a status; authentication decisions are unchanged.

### Full current content

```jsx
import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthContext";

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div role="status" className="loading-screen">Loading...</div>;
  }

  /*
   * User is already authenticated.
   *
   * Therefore:
   *
   * /login  → /
   * /signup → /
   */

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PublicRoute;
```

### Changes (+ added / - removed)

```diff
--- before/src/auth/PublicRoute.jsx
+++ after/src/auth/PublicRoute.jsx
@@ -6,7 +6,7 @@
   const { user, loading } = useAuth();
 
   if (loading) {
-    return <div className="loading-screen">Loading...</div>;
+    return <div role="status" className="loading-screen">Loading...</div>;
   }
 
   /*
```

## src/components/chat/ChatWindow.jsx

Updated. Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow.

### Full current content

```jsx
import chatStyles from "../../styles/chat.module.css";
import { bindStyles } from "../../utils/bindStyles";
import StatusMessage from "../ui/StatusMessage";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import UserAvatar from "../users/UserAvatar";

import MessageList from "./MessageList";
import MessageComposer from "./MessageComposer";

import { getMessages, markMessagesAsRead } from "../../api/messageApi";

import { createChatWebSocket } from "../../services/chatWebSocketService";

const css = bindStyles(chatStyles);

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
      <section className={css("chat-window chat-window-empty")}>
        <p>Select a conversation to start chatting.</p>
      </section>
    );
  }

  const otherUser = conversation.otherUser;

  return (
    <section className={css("chat-window")}>
      <header className={css("chat-header")}>
        <button
          type="button"
          className={css("mobile-chat-back-button")}
          onClick={onBackToConversations}
          aria-label="Back to conversations"
        >
          ←
        </button>

        <Link
          to={`/users/${otherUser?.id}`}
          className={css("chat-header-avatar-link")}
          aria-label={`View ${otherUser?.name || "user"} profile`}
        >
          <UserAvatar
            name={otherUser?.name}
            image={otherUser?.profileImage}
            userId={otherUser?.id}
            size="medium"
          />
        </Link>

        <div className={css("chat-header-info")}>
          <h2>{otherUser?.name || "Unknown User"}</h2>

          <span
            className={css(
              socketConnected
                ? "chat-connection-status connected"
                : "chat-connection-status"
            )}
          >
            {socketConnected ? "Connected" : "Connecting..."}
          </span>
        </div>
      </header>

      {error && <StatusMessage tone="error" className={css("error chat-error")}>{error}</StatusMessage>}

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
```

### Changes (+ added / - removed)

```diff
--- before/src/components/chat/ChatWindow.jsx
+++ after/src/components/chat/ChatWindow.jsx
@@ -1,3 +1,6 @@
+import chatStyles from "../../styles/chat.module.css";
+import { bindStyles } from "../../utils/bindStyles";
+import StatusMessage from "../ui/StatusMessage";
 import { useEffect, useRef, useState } from "react";
 import { Link } from "react-router-dom";
 
@@ -9,6 +12,8 @@
 import { getMessages, markMessagesAsRead } from "../../api/messageApi";
 
 import { createChatWebSocket } from "../../services/chatWebSocketService";
+
+const css = bindStyles(chatStyles);
 
 const PAGE_SIZE = 10;
 
@@ -264,7 +269,7 @@
 
   if (!conversation) {
     return (
-      <section className="chat-window chat-window-empty">
+      <section className={css("chat-window chat-window-empty")}>
         <p>Select a conversation to start chatting.</p>
       </section>
     );
@@ -273,11 +278,11 @@
   const otherUser = conversation.otherUser;
 
   return (
-    <section className="chat-window">
-      <header className="chat-header">
+    <section className={css("chat-window")}>
+      <header className={css("chat-header")}>
         <button
           type="button"
-          className="mobile-chat-back-button"
+          className={css("mobile-chat-back-button")}
           onClick={onBackToConversations}
           aria-label="Back to conversations"
         >
@@ -286,7 +291,7 @@
 
         <Link
           to={`/users/${otherUser?.id}`}
-          className="chat-header-avatar-link"
+          className={css("chat-header-avatar-link")}
           aria-label={`View ${otherUser?.name || "user"} profile`}
         >
           <UserAvatar
@@ -297,22 +302,22 @@
           />
         </Link>
 
-        <div className="chat-header-info">
+        <div className={css("chat-header-info")}>
           <h2>{otherUser?.name || "Unknown User"}</h2>
 
           <span
-            className={
+            className={css(
               socketConnected
                 ? "chat-connection-status connected"
                 : "chat-connection-status"
-            }
+            )}
           >
             {socketConnected ? "Connected" : "Connecting..."}
           </span>
         </div>
       </header>
 
-      {error && <p className="error chat-error">{error}</p>}
+      {error && <StatusMessage tone="error" className={css("error chat-error")}>{error}</StatusMessage>}
 
       <MessageList
         messages={messages}
```

## src/components/chat/ConversationList.jsx

Updated. Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow.

### Full current content

```jsx
import chatStyles from "../../styles/chat.module.css";
import { bindStyles } from "../../utils/bindStyles";
import UserAvatar from "../users/UserAvatar";

const css = bindStyles(chatStyles);

const ConversationList = ({
  conversations,
  selectedConversationId,
  onSelect,
  loading,
}) => {
  return (
    <aside className={css("conversation-list")}>
      <div className={css("conversation-list-header")}>
        <h2>Messages</h2>
      </div>

      {loading && conversations.length === 0 && (
        <p className={css("chat-status")}>Loading conversations...</p>
      )}

      {!loading && conversations.length === 0 && (
        <div className={css("conversation-empty")}>
          <p>No conversations yet.</p>
          <p>Open a friend and start a conversation.</p>
        </div>
      )}

      <div className={css("conversation-items")}>
        {conversations.map((conversation) => {
          const otherUser = conversation.otherUser;

          const isSelected =
            String(conversation.id) === String(selectedConversationId);

          return (
            <button
              key={conversation.id}
              type="button"
              className={css(`conversation-item ${
                isSelected ? "conversation-item-active" : ""
              }`)}
              aria-current={isSelected ? "true" : undefined}
              onClick={() => onSelect(conversation)}
            >
              <UserAvatar
                name={otherUser?.name}
                image={otherUser?.profileImage}
                userId={otherUser?.id}
                size="medium"
              />

              <div className={css("conversation-item-content")}>
                <strong>{otherUser?.name || "Unknown User"}</strong>

                <span>
                  {conversation.lastMessage?.content || "No messages yet"}
                </span>
              </div>

              <div className={css("conversation-item-time")}>
                {conversation.updatedAt
                  ? new Date(conversation.updatedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

export default ConversationList;
```

### Changes (+ added / - removed)

```diff
--- before/src/components/chat/ConversationList.jsx
+++ after/src/components/chat/ConversationList.jsx
@@ -1,4 +1,8 @@
+import chatStyles from "../../styles/chat.module.css";
+import { bindStyles } from "../../utils/bindStyles";
 import UserAvatar from "../users/UserAvatar";
+
+const css = bindStyles(chatStyles);
 
 const ConversationList = ({
   conversations,
@@ -7,23 +11,23 @@
   loading,
 }) => {
   return (
-    <aside className="conversation-list">
-      <div className="conversation-list-header">
+    <aside className={css("conversation-list")}>
+      <div className={css("conversation-list-header")}>
         <h2>Messages</h2>
       </div>
 
       {loading && conversations.length === 0 && (
-        <p className="chat-status">Loading conversations...</p>
+        <p className={css("chat-status")}>Loading conversations...</p>
       )}
 
       {!loading && conversations.length === 0 && (
-        <div className="conversation-empty">
+        <div className={css("conversation-empty")}>
           <p>No conversations yet.</p>
           <p>Open a friend and start a conversation.</p>
         </div>
       )}
 
-      <div className="conversation-items">
+      <div className={css("conversation-items")}>
         {conversations.map((conversation) => {
           const otherUser = conversation.otherUser;
 
@@ -34,9 +38,10 @@
             <button
               key={conversation.id}
               type="button"
-              className={`conversation-item ${
+              className={css(`conversation-item ${
                 isSelected ? "conversation-item-active" : ""
-              }`}
+              }`)}
+              aria-current={isSelected ? "true" : undefined}
               onClick={() => onSelect(conversation)}
             >
               <UserAvatar
@@ -46,7 +51,7 @@
                 size="medium"
               />
 
-              <div className="conversation-item-content">
+              <div className={css("conversation-item-content")}>
                 <strong>{otherUser?.name || "Unknown User"}</strong>
 
                 <span>
@@ -54,7 +59,7 @@
                 </span>
               </div>
 
-              <div className="conversation-item-time">
+              <div className={css("conversation-item-time")}>
                 {conversation.updatedAt
                   ? new Date(conversation.updatedAt).toLocaleTimeString([], {
                       hour: "2-digit",
```

## src/components/chat/MessageComposer.jsx

Updated. Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow.

### Full current content

```jsx
import chatStyles from "../../styles/chat.module.css";
import { bindStyles } from "../../utils/bindStyles";
import { useState } from "react";

const css = bindStyles(chatStyles);

const MAX_MESSAGE_LENGTH = 5000;

const MessageComposer = ({ onSend, disabled = false }) => {
  const [content, setContent] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent || disabled) {
      return;
    }

    try {
      await onSend(trimmedContent);

      setContent("");
    } catch {
      // Parent handles the error.
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <form className={css("message-composer")} onSubmit={handleSubmit}>
      <textarea aria-label="Message"
        value={content}
        maxLength={MAX_MESSAGE_LENGTH}
        rows={2}
        placeholder="Write a message..."
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />

      <div className={css("message-composer-footer")}>
        <span>
          {content.length}/{MAX_MESSAGE_LENGTH}
        </span>

        <button type="submit" disabled={disabled || !content.trim()}>
          Send
        </button>
      </div>
    </form>
  );
};

export default MessageComposer;
```

### Changes (+ added / - removed)

```diff
--- before/src/components/chat/MessageComposer.jsx
+++ after/src/components/chat/MessageComposer.jsx
@@ -1,4 +1,8 @@
+import chatStyles from "../../styles/chat.module.css";
+import { bindStyles } from "../../utils/bindStyles";
 import { useState } from "react";
+
+const css = bindStyles(chatStyles);
 
 const MAX_MESSAGE_LENGTH = 5000;
 
@@ -32,8 +36,8 @@
   };
 
   return (
-    <form className="message-composer" onSubmit={handleSubmit}>
-      <textarea
+    <form className={css("message-composer")} onSubmit={handleSubmit}>
+      <textarea aria-label="Message"
         value={content}
         maxLength={MAX_MESSAGE_LENGTH}
         rows={2}
@@ -43,7 +47,7 @@
         disabled={disabled}
       />
 
-      <div className="message-composer-footer">
+      <div className={css("message-composer-footer")}>
         <span>
           {content.length}/{MAX_MESSAGE_LENGTH}
         </span>
```

## src/components/chat/MessageList.jsx

Updated. Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow.

### Full current content

```jsx
import chatStyles from "../../styles/chat.module.css";
import { bindStyles } from "../../utils/bindStyles";
import { useEffect, useLayoutEffect, useRef } from "react";

import UserAvatar from "../users/UserAvatar";

const css = bindStyles(chatStyles);

const MessageList = ({
  messages,
  currentUserId,
  loading,
  loadingOlder,
  hasOlderMessages,
  onLoadOlder,
}) => {
  const messageListRef = useRef(null);

  const preserveScrollRef = useRef(null);
  const initialScrollPendingRef = useRef(false);
  const previousMessageCountRef = useRef(0);
  const isNearBottomRef = useRef(true);

  const scrollToBottom = (behavior = "auto") => {
    const element = messageListRef.current;

    if (!element) {
      return;
    }

    element.scrollTo({
      top: element.scrollHeight,
      behavior,
    });
  };

  const updateNearBottom = () => {
    const element = messageListRef.current;

    if (!element) {
      return;
    }

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    isNearBottomRef.current = distanceFromBottom <= 80;
  };

  const handleScroll = () => {
    updateNearBottom();
  };

  /*
   * When a conversation starts loading, prepare for the
   * initial scroll-to-bottom after the first page arrives.
   */
  useEffect(() => {
    if (loading) {
      initialScrollPendingRef.current = true;
      preserveScrollRef.current = null;
    }
  }, [loading]);

  /*
   * Handle all scroll positioning after the DOM has updated.
   *
   * 1. Older messages:
   *    Preserve the user's visual position.
   *
   * 2. Initial load:
   *    Start at the newest message.
   *
   * 3. New realtime messages:
   *    Scroll only when the user is already near the bottom.
   */
  useLayoutEffect(() => {
    if (loading) {
      return;
    }

    const element = messageListRef.current;

    if (!element) {
      return;
    }

    /*
     * Older messages were prepended.
     *
     * Keep the same message in approximately the same
     * visual position instead of jumping to the bottom.
     */
    if (!loadingOlder && preserveScrollRef.current) {
      const previousScroll = preserveScrollRef.current;

      const heightDifference =
        element.scrollHeight - previousScroll.scrollHeight;

      element.scrollTop = previousScroll.scrollTop + heightDifference;

      preserveScrollRef.current = null;
      previousMessageCountRef.current = messages.length;

      updateNearBottom();

      return;
    }

    /*
     * First successful conversation load.
     */
    if (initialScrollPendingRef.current) {
      scrollToBottom("auto");

      initialScrollPendingRef.current = false;
      previousMessageCountRef.current = messages.length;

      updateNearBottom();

      return;
    }

    /*
     * New realtime message.
     *
     * Do not disturb someone who is reading older messages.
     */
    if (messages.length !== previousMessageCountRef.current) {
      if (isNearBottomRef.current) {
        scrollToBottom("smooth");
      }

      previousMessageCountRef.current = messages.length;

      updateNearBottom();
    }
  }, [messages.length, loading, loadingOlder]);

  const handleLoadOlder = async () => {
    const element = messageListRef.current;

    if (element) {
      preserveScrollRef.current = {
        scrollTop: element.scrollTop,
        scrollHeight: element.scrollHeight,
      };
    }

    try {
      await onLoadOlder();
    } catch {
      /*
       * Parent handles the actual error.
       *
       * Keeping this catch prevents the button handler
       * from producing an unhandled promise rejection.
       */
    }
  };

  if (loading) {
    return (
      <div className={css("message-list-container")}>
        <div className={css("message-list message-list-loading")}>
          Loading messages...
        </div>
      </div>
    );
  }

  return (
    <div className={css("message-list-container")}>
      {hasOlderMessages && (
        <div className={css("older-messages-bar")}>
          <button
            type="button"
            className={css("chat-secondary-button")}
            onClick={handleLoadOlder}
            disabled={loadingOlder}
          >
            {loadingOlder
              ? "Loading older messages..."
              : "↑ See older messages"}
          </button>
        </div>
      )}

      <div
        ref={messageListRef}
        className={css("message-list")}
        onScroll={handleScroll}
      >
        {messages.length === 0 && (
          <div className={css("message-empty")}>
            <p>No messages yet.</p>
            <p>Say hello 👋</p>
          </div>
        )}

        {messages.map((message) => {
          const isOwnMessage =
            String(message.sender?.id) === String(currentUserId);

          return (
            <div
              key={message.id}
              className={css(`message-row ${
                isOwnMessage ? "message-row-own" : "message-row-other"
              }`)}
            >
              {!isOwnMessage && (
                <UserAvatar
                  name={message.sender?.name}
                  image={message.sender?.profileImage}
                  userId={message.sender?.id}
                  size="small"
                />
              )}

              <div
                className={css(`message-bubble ${
                  isOwnMessage ? "message-bubble-own" : "message-bubble-other"
                }`)}
              >
                <p>{message.content}</p>

                <span>
                  {message.createdAt
                    ? new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MessageList;
```

### Changes (+ added / - removed)

```diff
--- before/src/components/chat/MessageList.jsx
+++ after/src/components/chat/MessageList.jsx
@@ -1,6 +1,10 @@
+import chatStyles from "../../styles/chat.module.css";
+import { bindStyles } from "../../utils/bindStyles";
 import { useEffect, useLayoutEffect, useRef } from "react";
 
 import UserAvatar from "../users/UserAvatar";
+
+const css = bindStyles(chatStyles);
 
 const MessageList = ({
   messages,
@@ -157,8 +161,8 @@
 
   if (loading) {
     return (
-      <div className="message-list-container">
-        <div className="message-list message-list-loading">
+      <div className={css("message-list-container")}>
+        <div className={css("message-list message-list-loading")}>
           Loading messages...
         </div>
       </div>
@@ -166,12 +170,12 @@
   }
 
   return (
-    <div className="message-list-container">
+    <div className={css("message-list-container")}>
       {hasOlderMessages && (
-        <div className="older-messages-bar">
+        <div className={css("older-messages-bar")}>
           <button
             type="button"
-            className="chat-secondary-button"
+            className={css("chat-secondary-button")}
             onClick={handleLoadOlder}
             disabled={loadingOlder}
           >
@@ -184,11 +188,11 @@
 
       <div
         ref={messageListRef}
-        className="message-list"
+        className={css("message-list")}
         onScroll={handleScroll}
       >
         {messages.length === 0 && (
-          <div className="message-empty">
+          <div className={css("message-empty")}>
             <p>No messages yet.</p>
             <p>Say hello 👋</p>
           </div>
@@ -201,9 +205,9 @@
           return (
             <div
               key={message.id}
-              className={`message-row ${
+              className={css(`message-row ${
                 isOwnMessage ? "message-row-own" : "message-row-other"
-              }`}
+              }`)}
             >
               {!isOwnMessage && (
                 <UserAvatar
@@ -215,9 +219,9 @@
               )}
 
               <div
-                className={`message-bubble ${
+                className={css(`message-bubble ${
                   isOwnMessage ? "message-bubble-own" : "message-bubble-other"
-                }`}
+                }`)}
               >
                 <p>{message.content}</p>
 
```

## src/components/layout/Navbar.jsx

Updated. One link definition, active routes, labelled unread count, accessible disclosure behaviour and skip link.

### Full current content

```jsx
import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import styles from "../../styles/navbar.module.css";
import { bindStyles } from "../../utils/bindStyles";

const css = bindStyles(styles);
const links = [
  ["/", "Home"], ["/friends", "Friends"], ["/messages", "Messages"],
  ["/friend-requests", "Requests"], ["/notifications", "Notifications"],
  ["/profile", "Profile"],
];

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const navRef = useRef(null);
  const toggleRef = useRef(null);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointerDown = (event) => {
      if (!navRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 901px)");
    const onResize = (event) => { if (event.matches) setMenuOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    desktop.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      desktop.removeEventListener("change", onResize);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    closeMenu();
    await logout();
    navigate("/login", { replace: true });
  };
  const renderLinks = (mobile = false) => links.map(([to, label]) => (
    <NavLink
      key={to} to={to} end={to === "/"} onClick={closeMenu}
      className={({ isActive }) => css(
        `${mobile ? "navbar-mobile-link" : "navbar-link"} ${isActive ? "active" : ""}`,
      )}
      aria-label={to === "/notifications" && unreadCount > 0
        ? `Notifications, ${unreadCount} unread` : undefined}
    >
      <span>{label}</span>
      {to === "/notifications" && unreadCount > 0 && (
        <span className={css("notification-badge")} aria-hidden="true">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </NavLink>
  ));

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <nav
        ref={navRef} className={css("navbar")} aria-label="Main navigation"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) closeMenu();
        }}
      >
        <div className={css("navbar-left")}>
          <Link to="/" className={css("navbar-brand")} onClick={closeMenu}>FrndBook</Link>
        </div>
        <div className={css("navbar-right")}>
          {renderLinks()}
          <span className={css("navbar-user")}>{user?.name}</span>
          <button type="button" className={css("navbar-logout")} onClick={handleLogout}>Logout</button>
        </div>
        <button
          ref={toggleRef} type="button" className={css("navbar-menu-toggle")}
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen} aria-controls={menuId}
        >
          <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
        </button>
        <div id={menuId} className={css(`navbar-mobile-menu ${menuOpen ? "open" : ""}`)}>
          <div className={css("navbar-mobile-user")}>
            <span className={css("navbar-mobile-user-name")}>{user?.name || "Account"}</span>
            {user?.email && <span className={css("navbar-mobile-user-email")}>{user.email}</span>}
          </div>
          {renderLinks(true)}
          <button type="button" className={css("navbar-mobile-logout")} onClick={handleLogout}>Logout</button>
        </div>
      </nav>
    </>
  );
}
```

### Changes (+ added / - removed)

```diff
--- before/src/components/layout/Navbar.jsx
+++ after/src/components/layout/Navbar.jsx
@@ -1,152 +1,107 @@
-import { useState } from "react";
-import { Link, useNavigate } from "react-router-dom";
-
+import { useEffect, useId, useRef, useState } from "react";
+import { Link, NavLink, useNavigate } from "react-router-dom";
 import { useAuth } from "../../auth/AuthContext";
 import { useNotifications } from "../../context/NotificationContext";
+import styles from "../../styles/navbar.module.css";
+import { bindStyles } from "../../utils/bindStyles";
 
-const Navbar = () => {
+const css = bindStyles(styles);
+const links = [
+  ["/", "Home"], ["/friends", "Friends"], ["/messages", "Messages"],
+  ["/friend-requests", "Requests"], ["/notifications", "Notifications"],
+  ["/profile", "Profile"],
+];
+
+export default function Navbar() {
   const navigate = useNavigate();
-
   const { user, logout } = useAuth();
   const { unreadCount } = useNotifications();
+  const [menuOpen, setMenuOpen] = useState(false);
+  const menuId = useId();
+  const navRef = useRef(null);
+  const toggleRef = useRef(null);
+  const closeMenu = () => setMenuOpen(false);
 
-  const [menuOpen, setMenuOpen] = useState(false);
-
-  const closeMenu = () => {
-    setMenuOpen(false);
-  };
+  useEffect(() => {
+    if (!menuOpen) return;
+    const onKeyDown = (event) => {
+      if (event.key === "Escape") {
+        setMenuOpen(false);
+        toggleRef.current?.focus();
+      }
+    };
+    const onPointerDown = (event) => {
+      if (!navRef.current?.contains(event.target)) setMenuOpen(false);
+    };
+    const desktop = window.matchMedia("(min-width: 901px)");
+    const onResize = (event) => { if (event.matches) setMenuOpen(false); };
+    document.addEventListener("keydown", onKeyDown);
+    document.addEventListener("pointerdown", onPointerDown);
+    desktop.addEventListener("change", onResize);
+    return () => {
+      document.removeEventListener("keydown", onKeyDown);
+      document.removeEventListener("pointerdown", onPointerDown);
+      desktop.removeEventListener("change", onResize);
+    };
+  }, [menuOpen]);
 
   const handleLogout = async () => {
     closeMenu();
-
     await logout();
-
-    navigate("/login", {
-      replace: true,
-    });
+    navigate("/login", { replace: true });
   };
+  const renderLinks = (mobile = false) => links.map(([to, label]) => (
+    <NavLink
+      key={to} to={to} end={to === "/"} onClick={closeMenu}
+      className={({ isActive }) => css(
+        `${mobile ? "navbar-mobile-link" : "navbar-link"} ${isActive ? "active" : ""}`,
+      )}
+      aria-label={to === "/notifications" && unreadCount > 0
+        ? `Notifications, ${unreadCount} unread` : undefined}
+    >
+      <span>{label}</span>
+      {to === "/notifications" && unreadCount > 0 && (
+        <span className={css("notification-badge")} aria-hidden="true">
+          {unreadCount > 99 ? "99+" : unreadCount}
+        </span>
+      )}
+    </NavLink>
+  ));
 
   return (
-    <nav className="navbar">
-      <div className="navbar-left">
-        <Link to="/" className="navbar-brand" onClick={closeMenu}>
-          FrndBook
-        </Link>
-      </div>
-
-      {/* Desktop navigation */}
-      <div className="navbar-right">
-        <Link to="/" className="navbar-link">
-          Home
-        </Link>
-
-        <Link to="/friends" className="navbar-link">
-          Friends
-        </Link>
-
-        <Link to="/messages" className="navbar-link">
-          Messages
-        </Link>
-
-        <Link to="/friend-requests" className="navbar-link">
-          Requests
-        </Link>
-
-        <Link to="/notifications" className="navbar-link">
-          Notifications
-          {unreadCount > 0 && (
-            <span className="notification-badge">
-              {unreadCount > 99 ? "99+" : unreadCount}
-            </span>
-          )}
-        </Link>
-
-        <Link to="/profile" className="navbar-link">
-          Profile
-        </Link>
-
-        <div className="navbar-user">
-          <span>{user?.name}</span>
+    <>
+      <a className="skip-link" href="#main-content">Skip to content</a>
+      <nav
+        ref={navRef} className={css("navbar")} aria-label="Main navigation"
+        onBlur={(event) => {
+          if (!event.currentTarget.contains(event.relatedTarget)) closeMenu();
+        }}
+      >
+        <div className={css("navbar-left")}>
+          <Link to="/" className={css("navbar-brand")} onClick={closeMenu}>FrndBook</Link>
         </div>
-
-        <button type="button" className="navbar-logout" onClick={handleLogout}>
-          Logout
+        <div className={css("navbar-right")}>
+          {renderLinks()}
+          <span className={css("navbar-user")}>{user?.name}</span>
+          <button type="button" className={css("navbar-logout")} onClick={handleLogout}>Logout</button>
+        </div>
+        <button
+          ref={toggleRef} type="button" className={css("navbar-menu-toggle")}
+          onClick={() => setMenuOpen((current) => !current)}
+          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
+          aria-expanded={menuOpen} aria-controls={menuId}
+        >
+          <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
         </button>
-      </div>
-
-      {/* Mobile menu button */}
-      <button
-        type="button"
-        className="navbar-menu-toggle"
-        onClick={() => setMenuOpen((current) => !current)}
-        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
-        aria-expanded={menuOpen}
-      >
-        <span />
-        <span />
-        <span />
-      </button>
-
-      {/* Mobile navigation */}
-      <div className={`navbar-mobile-menu ${menuOpen ? "open" : ""}`}>
-        <div className="navbar-mobile-user">
-          <span className="navbar-mobile-user-name">
-            {user?.name || "Account"}
-          </span>
-
-          {user?.email && (
-            <span className="navbar-mobile-user-email">{user.email}</span>
-          )}
+        <div id={menuId} className={css(`navbar-mobile-menu ${menuOpen ? "open" : ""}`)}>
+          <div className={css("navbar-mobile-user")}>
+            <span className={css("navbar-mobile-user-name")}>{user?.name || "Account"}</span>
+            {user?.email && <span className={css("navbar-mobile-user-email")}>{user.email}</span>}
+          </div>
+          {renderLinks(true)}
+          <button type="button" className={css("navbar-mobile-logout")} onClick={handleLogout}>Logout</button>
         </div>
-
-        <Link to="/" className="navbar-mobile-link" onClick={closeMenu}>
-          Home
-        </Link>
-
-        <Link to="/friends" className="navbar-mobile-link" onClick={closeMenu}>
-          Friends
-        </Link>
-
-        <Link to="/messages" className="navbar-mobile-link" onClick={closeMenu}>
-          Messages
-        </Link>
-
-        <Link
-          to="/friend-requests"
-          className="navbar-mobile-link"
-          onClick={closeMenu}
-        >
-          Requests
-        </Link>
-
-        <Link
-          to="/notifications"
-          className="navbar-mobile-link"
-          onClick={closeMenu}
-        >
-          <span>Notifications</span>
-
-          {unreadCount > 0 && (
-            <span className="notification-badge">
-              {unreadCount > 99 ? "99+" : unreadCount}
-            </span>
-          )}
-        </Link>
-
-        <Link to="/profile" className="navbar-mobile-link" onClick={closeMenu}>
-          Profile
-        </Link>
-
-        <button
-          type="button"
-          className="navbar-mobile-logout"
-          onClick={handleLogout}
-        >
-          Logout
-        </button>
-      </div>
-    </nav>
+      </nav>
+    </>
   );
-};
-
-export default Navbar;
+}
```

## src/components/ui/FormField.jsx

Added. Reusable native field with persistent label, stable ID, autocomplete passthrough and description/error hooks.

### Full current content

```jsx
import { useId } from "react";
import styles from "./feedback.module.css";

export default function FormField({
  label, id, as: Control = "input", hint, error, className = "", ...props
}) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const description = [props["aria-describedby"], hint && `${controlId}-hint`, error && `${controlId}-error`]
    .filter(Boolean).join(" ") || undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={controlId}>{label}</label>
      <Control
        {...props}
        id={controlId}
        className={`${styles.control} ${className}`.trim()}
        aria-describedby={description}
        aria-invalid={error ? true : props["aria-invalid"]}
      />
      {hint && <span id={`${controlId}-hint`} className={styles.hint}>{hint}</span>}
      {error && <span id={`${controlId}-error`} className={styles.fieldError}>{error}</span>}
    </div>
  );
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/components/ui/FormField.jsx
@@ -0,0 +1,25 @@
+import { useId } from "react";
+import styles from "./feedback.module.css";
+
+export default function FormField({
+  label, id, as: Control = "input", hint, error, className = "", ...props
+}) {
+  const generatedId = useId();
+  const controlId = id || generatedId;
+  const description = [props["aria-describedby"], hint && `${controlId}-hint`, error && `${controlId}-error`]
+    .filter(Boolean).join(" ") || undefined;
+  return (
+    <div className={styles.field}>
+      <label htmlFor={controlId}>{label}</label>
+      <Control
+        {...props}
+        id={controlId}
+        className={`${styles.control} ${className}`.trim()}
+        aria-describedby={description}
+        aria-invalid={error ? true : props["aria-invalid"]}
+      />
+      {hint && <span id={`${controlId}-hint`} className={styles.hint}>{hint}</span>}
+      {error && <span id={`${controlId}-error`} className={styles.fieldError}>{error}</span>}
+    </div>
+  );
+}
```

## src/components/ui/PageContainer.jsx

Updated. Focusable main landmark for the skip link.

### Full current content

```jsx
import styles from "./foundation.module.css";

/** Shared page geometry. Feature classes own maximum width and responsive overrides. */
export default function PageContainer({ className = "", children, ...props }) {
  return (
    <main id="main-content" tabIndex={-1} {...props} className={`${styles.page} ${className}`.trim()}>
      {children}
    </main>
  );
}
```

### Changes (+ added / - removed)

```diff
--- before/src/components/ui/PageContainer.jsx
+++ after/src/components/ui/PageContainer.jsx
@@ -3,7 +3,7 @@
 /** Shared page geometry. Feature classes own maximum width and responsive overrides. */
 export default function PageContainer({ className = "", children, ...props }) {
   return (
-    <main {...props} className={`${styles.page} ${className}`.trim()}>
+    <main id="main-content" tabIndex={-1} {...props} className={`${styles.page} ${className}`.trim()}>
       {children}
     </main>
   );
```

## src/components/ui/StatusMessage.jsx

Added. Consistent operation feedback with alert/status semantics.

### Full current content

```jsx
import styles from "./feedback.module.css";

export default function StatusMessage({ tone = "error", children, className = "" }) {
  if (!children) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`${styles.message} ${styles[tone] || styles.info} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/components/ui/StatusMessage.jsx
@@ -0,0 +1,13 @@
+import styles from "./feedback.module.css";
+
+export default function StatusMessage({ tone = "error", children, className = "" }) {
+  if (!children) return null;
+  return (
+    <div
+      role={tone === "error" ? "alert" : "status"}
+      className={`${styles.message} ${styles[tone] || styles.info} ${className}`.trim()}
+    >
+      {children}
+    </div>
+  );
+}
```

## src/components/ui/feedback.module.css

Added. Shared visual treatment for fields, hints and operation feedback.

### Full current content

```css
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field label {
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
}

.control {
  width: 100%;
  min-height: var(--control-height);
  padding: 11px 12px;
  border: 1px solid var(--color-control-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
}

.control:disabled {
  background: var(--color-disabled);
  color: var(--color-text-secondary);
}

.control[aria-invalid="true"] {
  border-color: var(--color-danger);
}

.control:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.hint {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.fieldError {
  color: var(--color-danger);
  font-size: 13px;
}

.message {
  padding: 12px 14px;
  margin: 10px 0;
  border-radius: var(--radius-md);
  border-inline-start: 3px solid;
  overflow-wrap: anywhere;
}

.error {
  color: var(--color-danger);
  background: var(--color-danger-surface);
}

.success {
  color: var(--color-success);
  background: var(--color-success-surface);
}

.info {
  color: var(--color-text-secondary);
  background: var(--color-selected);
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/components/ui/feedback.module.css
@@ -0,0 +1,69 @@
+.field {
+  display: flex;
+  flex-direction: column;
+  gap: 6px;
+  min-width: 0;
+}
+
+.field label {
+  color: var(--color-text);
+  font-size: 14px;
+  font-weight: 600;
+}
+
+.control {
+  width: 100%;
+  min-height: var(--control-height);
+  padding: 11px 12px;
+  border: 1px solid var(--color-control-border);
+  border-radius: var(--radius-md);
+  background: var(--color-surface);
+  color: var(--color-text);
+}
+
+.control:disabled {
+  background: var(--color-disabled);
+  color: var(--color-text-secondary);
+}
+
+.control[aria-invalid="true"] {
+  border-color: var(--color-danger);
+}
+
+.control:focus-visible {
+  outline: 2px solid var(--color-focus);
+  outline-offset: 2px;
+}
+
+.hint {
+  color: var(--color-text-secondary);
+  font-size: 13px;
+}
+
+.fieldError {
+  color: var(--color-danger);
+  font-size: 13px;
+}
+
+.message {
+  padding: 12px 14px;
+  margin: 10px 0;
+  border-radius: var(--radius-md);
+  border-inline-start: 3px solid;
+  overflow-wrap: anywhere;
+}
+
+.error {
+  color: var(--color-danger);
+  background: var(--color-danger-surface);
+}
+
+.success {
+  color: var(--color-success);
+  background: var(--color-success-surface);
+}
+
+.info {
+  color: var(--color-text-secondary);
+  background: var(--color-selected);
+}
```

## src/components/ui/foundation.module.css

Updated. Primary-button hover styling; shared foundation retained.

### Full current content

```css
:where(.page) {
  width: 100%;
  margin: 0 auto;
  padding: var(--page-padding-y) var(--page-padding-x);
}

:where(.card) {
  padding: 30px;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
}

.button {
  min-height: var(--control-height);
  padding: 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 600;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.button:disabled {
  opacity: 0.6;
}

.button:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.button:disabled {
  cursor: not-allowed;
}
```

### Changes (+ added / - removed)

```diff
--- before/src/components/ui/foundation.module.css
+++ after/src/components/ui/foundation.module.css
@@ -1,4 +1,3 @@
-/* Low specificity lets feature classes retain existing dimensions and breakpoints. */
 :where(.page) {
   width: 100%;
   margin: 0 auto;
@@ -26,3 +25,11 @@
 .button:disabled {
   opacity: 0.6;
 }
+
+.button:hover:not(:disabled) {
+  background: var(--color-primary-hover);
+}
+
+.button:disabled {
+  cursor: not-allowed;
+}
```

## src/components/users/FriendAction.jsx

Updated. Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow.

### Full current content

```jsx
import friendsStyles from "../../styles/friends.module.css";
import { bindStyles } from "../../utils/bindStyles";
import { FRIENDSHIP_STATUS } from "../../utils/friendship";

const css = bindStyles(friendsStyles);

const FriendAction = ({
  status,
  onAdd,
  onAccept,
  onReject,
  onRemove,
  onMessage,
  loading = false,
}) => {
  // ==================================================
  // NO FRIENDSHIP
  // ==================================================

  if (status === FRIENDSHIP_STATUS.NONE) {
    return (
      <button
        type="button"
        className={css("friend-action-button primary")}
        onClick={onAdd}
        disabled={loading}
      >
        {loading ? "Sending..." : "Add Friend"}
      </button>
    );
  }

  // ==================================================
  // REQUEST SENT
  // ==================================================

  if (status === FRIENDSHIP_STATUS.REQUEST_SENT) {
    return (
      <button type="button" className={css("friend-action-button secondary")} disabled>
        Request Sent
      </button>
    );
  }

  // ==================================================
  // REQUEST RECEIVED
  // ==================================================

  if (status === FRIENDSHIP_STATUS.REQUEST_RECEIVED) {
    return (
      <div className={css("friend-action-group")}>
        <button
          type="button"
          className={css("friend-action-button primary")}
          onClick={onAccept}
          disabled={loading}
        >
          {loading ? "Accepting..." : "Accept"}
        </button>

        <button
          type="button"
          className={css("friend-action-button secondary")}
          onClick={onReject}
          disabled={loading}
        >
          Reject
        </button>
      </div>
    );
  }

  // ==================================================
  // FRIENDS
  // ==================================================

  if (status === FRIENDSHIP_STATUS.FRIENDS) {
    return (
      <div className={css("friend-action-group")}>
        <span className={css("friend-status-label")}>✓ Friends</span>

        <button
          type="button"
          className={css("friend-action-button primary")}
          onClick={onMessage}
          disabled={loading}
        >
          Message
        </button>

        <button
          type="button"
          className={css("friend-action-button danger")}
          onClick={onRemove}
          disabled={loading}
        >
          {loading ? "Removing..." : "Remove Friend"}
        </button>
      </div>
    );
  }

  return null;
};

export default FriendAction;
```

### Changes (+ added / - removed)

```diff
--- before/src/components/users/FriendAction.jsx
+++ after/src/components/users/FriendAction.jsx
@@ -1,4 +1,8 @@
+import friendsStyles from "../../styles/friends.module.css";
+import { bindStyles } from "../../utils/bindStyles";
 import { FRIENDSHIP_STATUS } from "../../utils/friendship";
+
+const css = bindStyles(friendsStyles);
 
 const FriendAction = ({
   status,
@@ -17,7 +21,7 @@
     return (
       <button
         type="button"
-        className="friend-action-button primary"
+        className={css("friend-action-button primary")}
         onClick={onAdd}
         disabled={loading}
       >
@@ -32,7 +36,7 @@
 
   if (status === FRIENDSHIP_STATUS.REQUEST_SENT) {
     return (
-      <button type="button" className="friend-action-button secondary" disabled>
+      <button type="button" className={css("friend-action-button secondary")} disabled>
         Request Sent
       </button>
     );
@@ -44,10 +48,10 @@
 
   if (status === FRIENDSHIP_STATUS.REQUEST_RECEIVED) {
     return (
-      <div className="friend-action-group">
+      <div className={css("friend-action-group")}>
         <button
           type="button"
-          className="friend-action-button primary"
+          className={css("friend-action-button primary")}
           onClick={onAccept}
           disabled={loading}
         >
@@ -56,7 +60,7 @@
 
         <button
           type="button"
-          className="friend-action-button secondary"
+          className={css("friend-action-button secondary")}
           onClick={onReject}
           disabled={loading}
         >
@@ -72,12 +76,12 @@
 
   if (status === FRIENDSHIP_STATUS.FRIENDS) {
     return (
-      <div className="friend-action-group">
-        <span className="friend-status-label">✓ Friends</span>
+      <div className={css("friend-action-group")}>
+        <span className={css("friend-status-label")}>✓ Friends</span>
 
         <button
           type="button"
-          className="friend-action-button primary"
+          className={css("friend-action-button primary")}
           onClick={onMessage}
           disabled={loading}
         >
@@ -86,7 +90,7 @@
 
         <button
           type="button"
-          className="friend-action-button danger"
+          className={css("friend-action-button danger")}
           onClick={onRemove}
           disabled={loading}
         >
```

## src/components/users/FriendCard.jsx

Updated. Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow.

### Full current content

```jsx
import friendsStyles from "../../styles/friends.module.css";
import { bindStyles } from "../../utils/bindStyles";
import { Link, useNavigate } from "react-router-dom";

import UserAvatar from "./UserAvatar";

const css = bindStyles(friendsStyles);

const FriendCard = ({ friend, onRemove, removing = false }) => {
  const navigate = useNavigate();

  if (!friend) {
    return null;
  }

  const handleMessage = () => {
    navigate(`/messages?userId=${friend.id}`);
  };

  return (
    <div className={css("friend-card")}>
      <Link to={`/users/${friend.id}`} className={css("friend-card-main")}>
        <UserAvatar
          name={friend.name}
          image={friend.profileImage}
          userId={friend.id}
          size="medium"
        />

        <div className={css("friend-card-info")}>
          <h3>{friend.name || "Unknown User"}</h3>

          <p>{friend.bio || "No bio available"}</p>

          <span className={css("friend-card-status")}>{friend.status || "—"}</span>
        </div>
      </Link>

      <div className={css("friend-card-actions")}>
        <button
          type="button"
          className={css("friend-message-button")}
          onClick={handleMessage}
        >
          Message
        </button>

        <button
          type="button"
          className={css("friend-remove-button")}
          onClick={() => onRemove(friend)}
          disabled={removing}
        >
          {removing ? "Removing..." : "Remove"}
        </button>
      </div>
    </div>
  );
};

export default FriendCard;
```

### Changes (+ added / - removed)

```diff
--- before/src/components/users/FriendCard.jsx
+++ after/src/components/users/FriendCard.jsx
@@ -1,6 +1,10 @@
+import friendsStyles from "../../styles/friends.module.css";
+import { bindStyles } from "../../utils/bindStyles";
 import { Link, useNavigate } from "react-router-dom";
 
 import UserAvatar from "./UserAvatar";
+
+const css = bindStyles(friendsStyles);
 
 const FriendCard = ({ friend, onRemove, removing = false }) => {
   const navigate = useNavigate();
@@ -14,8 +18,8 @@
   };
 
   return (
-    <div className="friend-card">
-      <Link to={`/users/${friend.id}`} className="friend-card-main">
+    <div className={css("friend-card")}>
+      <Link to={`/users/${friend.id}`} className={css("friend-card-main")}>
         <UserAvatar
           name={friend.name}
           image={friend.profileImage}
@@ -23,19 +27,19 @@
           size="medium"
         />
 
-        <div className="friend-card-info">
+        <div className={css("friend-card-info")}>
           <h3>{friend.name || "Unknown User"}</h3>
 
           <p>{friend.bio || "No bio available"}</p>
 
-          <span className="friend-card-status">{friend.status || "—"}</span>
+          <span className={css("friend-card-status")}>{friend.status || "—"}</span>
         </div>
       </Link>
 
-      <div className="friend-card-actions">
+      <div className={css("friend-card-actions")}>
         <button
           type="button"
-          className="friend-message-button"
+          className={css("friend-message-button")}
           onClick={handleMessage}
         >
           Message
@@ -43,7 +47,7 @@
 
         <button
           type="button"
-          className="friend-remove-button"
+          className={css("friend-remove-button")}
           onClick={() => onRemove(friend)}
           disabled={removing}
         >
```

## src/components/users/FriendRequestCard.jsx

Updated. Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow.

### Full current content

```jsx
import friendsStyles from "../../styles/friends.module.css";
import { bindStyles } from "../../utils/bindStyles";
import { Link } from "react-router-dom";

import UserAvatar from "./UserAvatar";

const css = bindStyles(friendsStyles);

const FriendRequestCard = ({
  request,
  type,
  onAccept,
  onReject,
  actionLoading = false,
}) => {
  if (!request) {
    return null;
  }

  const isReceived = type === "received";

  const person = isReceived ? request.sender : request.receiver;

  if (!person) {
    return null;
  }

  return (
    <div className={css("friend-request-card")}>
      <Link to={`/users/${person.id}`} className={css("friend-request-main")}>
        <UserAvatar
          name={person.name}
          image={person.profileImage}
          userId={person.id}
          size="medium"
        />

        <div className={css("friend-request-info")}>
          <h3>{person.name || "Unknown User"}</h3>

          <p>{person.bio || "No bio available"}</p>

          <span>
            {request.createdAt
              ? new Date(request.createdAt).toLocaleString()
              : "—"}
          </span>
        </div>
      </Link>

      {isReceived ? (
        <div className={css("friend-request-actions")}>
          <button
            type="button"
            className={css("friend-action-button primary")}
            onClick={() => onAccept(request.id)}
            disabled={actionLoading}
          >
            {actionLoading ? "Accepting..." : "Accept"}
          </button>

          <button
            type="button"
            className={css("friend-action-button secondary")}
            onClick={() => onReject(request.id)}
            disabled={actionLoading}
          >
            Reject
          </button>
        </div>
      ) : (
        <span className={css("friend-request-sent-label")}>Request Sent</span>
      )}
    </div>
  );
};

export default FriendRequestCard;
```

### Changes (+ added / - removed)

```diff
--- before/src/components/users/FriendRequestCard.jsx
+++ after/src/components/users/FriendRequestCard.jsx
@@ -1,6 +1,10 @@
+import friendsStyles from "../../styles/friends.module.css";
+import { bindStyles } from "../../utils/bindStyles";
 import { Link } from "react-router-dom";
 
 import UserAvatar from "./UserAvatar";
+
+const css = bindStyles(friendsStyles);
 
 const FriendRequestCard = ({
   request,
@@ -22,8 +26,8 @@
   }
 
   return (
-    <div className="friend-request-card">
-      <Link to={`/users/${person.id}`} className="friend-request-main">
+    <div className={css("friend-request-card")}>
+      <Link to={`/users/${person.id}`} className={css("friend-request-main")}>
         <UserAvatar
           name={person.name}
           image={person.profileImage}
@@ -31,7 +35,7 @@
           size="medium"
         />
 
-        <div className="friend-request-info">
+        <div className={css("friend-request-info")}>
           <h3>{person.name || "Unknown User"}</h3>
 
           <p>{person.bio || "No bio available"}</p>
@@ -45,10 +49,10 @@
       </Link>
 
       {isReceived ? (
-        <div className="friend-request-actions">
+        <div className={css("friend-request-actions")}>
           <button
             type="button"
-            className="friend-action-button primary"
+            className={css("friend-action-button primary")}
             onClick={() => onAccept(request.id)}
             disabled={actionLoading}
           >
@@ -57,7 +61,7 @@
 
           <button
             type="button"
-            className="friend-action-button secondary"
+            className={css("friend-action-button secondary")}
             onClick={() => onReject(request.id)}
             disabled={actionLoading}
           >
@@ -65,7 +69,7 @@
           </button>
         </div>
       ) : (
-        <span className="friend-request-sent-label">Request Sent</span>
+        <span className={css("friend-request-sent-label")}>Request Sent</span>
       )}
     </div>
   );
```

## src/components/users/UserAvatar.jsx

Updated. Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow.

### Full current content

```jsx
import usersStyles from "../../styles/users.module.css";
import { bindStyles } from "../../utils/bindStyles";
import { useEffect, useState } from "react";

const css = bindStyles(usersStyles);

const UserAvatar = ({ name, image, userId, size = "medium" }) => {
  const firstLetter = name?.trim()?.charAt(0)?.toUpperCase() || "?";

  const [imageError, setImageError] = useState(false);

  // CHANGE: Add the profileImage value as a cache-busting version.
  // This forces the browser to request the new image when the image changes.
  const imageUrl =
    image && userId
      ? `${import.meta.env.VITE_API_BASE_URL}/api/users/${userId}/profile-image?v=${encodeURIComponent(image)}`
      : null;

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  if (!imageUrl || imageError) {
    return (
      <div className={css(`user-avatar user-avatar-placeholder ${size}`)}>
        {firstLetter}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={name || "User"}
      className={css(`user-avatar ${size}`)}
      onError={() => setImageError(true)}
    />
  );
};

export default UserAvatar;
```

### Changes (+ added / - removed)

```diff
--- before/src/components/users/UserAvatar.jsx
+++ after/src/components/users/UserAvatar.jsx
@@ -1,4 +1,8 @@
+import usersStyles from "../../styles/users.module.css";
+import { bindStyles } from "../../utils/bindStyles";
 import { useEffect, useState } from "react";
+
+const css = bindStyles(usersStyles);
 
 const UserAvatar = ({ name, image, userId, size = "medium" }) => {
   const firstLetter = name?.trim()?.charAt(0)?.toUpperCase() || "?";
@@ -18,7 +22,7 @@
 
   if (!imageUrl || imageError) {
     return (
-      <div className={`user-avatar user-avatar-placeholder ${size}`}>
+      <div className={css(`user-avatar user-avatar-placeholder ${size}`)}>
         {firstLetter}
       </div>
     );
@@ -28,7 +32,7 @@
     <img
       src={imageUrl}
       alt={name || "User"}
-      className={`user-avatar ${size}`}
+      className={css(`user-avatar ${size}`)}
       onError={() => setImageError(true)}
     />
   );
```

## src/components/users/UserCard.jsx

Updated. Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow.

### Full current content

```jsx
import usersStyles from "../../styles/users.module.css";
import { bindStyles } from "../../utils/bindStyles";
import { Link } from "react-router-dom";

import UserAvatar from "./UserAvatar";

const css = bindStyles(usersStyles);

const UserCard = ({ user, onClick }) => {
  if (!user) {
    return null;
  }

  const handleClick = () => {
    if (onClick) {
      onClick(user);
    }
  };

  return (
    <Link to={`/users/${user.id}`} className={css("user-card")} onClick={handleClick}>
      <UserAvatar
        name={user.name}
        image={user.profileImage}
        userId={user.id}
        size="medium"
      />

      <div className={css("user-card-info")}>
        <h3>{user.name || "Unknown User"}</h3>

        {user.bio ? <p>{user.bio}</p> : <p>No bio available</p>}
      </div>
    </Link>
  );
};

export default UserCard;
```

### Changes (+ added / - removed)

```diff
--- before/src/components/users/UserCard.jsx
+++ after/src/components/users/UserCard.jsx
@@ -1,6 +1,10 @@
+import usersStyles from "../../styles/users.module.css";
+import { bindStyles } from "../../utils/bindStyles";
 import { Link } from "react-router-dom";
 
 import UserAvatar from "./UserAvatar";
+
+const css = bindStyles(usersStyles);
 
 const UserCard = ({ user, onClick }) => {
   if (!user) {
@@ -14,7 +18,7 @@
   };
 
   return (
-    <Link to={`/users/${user.id}`} className="user-card" onClick={handleClick}>
+    <Link to={`/users/${user.id}`} className={css("user-card")} onClick={handleClick}>
       <UserAvatar
         name={user.name}
         image={user.profileImage}
@@ -22,7 +26,7 @@
         size="medium"
       />
 
-      <div className="user-card-info">
+      <div className={css("user-card-info")}>
         <h3>{user.name || "Unknown User"}</h3>
 
         {user.bio ? <p>{user.bio}</p> : <p>No bio available</p>}
```

## src/components/users/UserSearch.jsx

Updated. Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow.

### Full current content

```jsx
import usersStyles from "../../styles/users.module.css";
import { bindStyles } from "../../utils/bindStyles";
import StatusMessage from "../ui/StatusMessage";
import { useEffect, useState } from "react";

import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  searchUsers,
} from "../../api/userApi";

import { useAuth } from "../../auth/AuthContext";

import UserCard from "./UserCard";

const css = bindStyles(usersStyles);

const UserSearch = () => {
  const { user: currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");

  const [results, setResults] = useState([]);

  const [recentSearches, setRecentSearches] = useState([]);

  const [page, setPage] = useState(0);

  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(false);

  const [recentLoading, setRecentLoading] = useState(true);

  const [error, setError] = useState("");

  // ==================================================
  // LOAD RECENT SEARCHES
  // ==================================================

  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        setRecentLoading(true);

        const data = await getRecentSearches();

        setRecentSearches(data || []);
      } catch (error) {
        console.error("Failed to load recent searches:", error);
      } finally {
        setRecentLoading(false);
      }
    };

    loadRecentSearches();
  }, []);

  // ==================================================
  // SEARCH
  // ==================================================

  useEffect(() => {
    const trimmedSearch = searchTerm.trim();

    if (!trimmedSearch) {
      setResults([]);

      setPage(0);

      setTotalPages(0);

      setError("");

      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);

        setError("");

        const data = await searchUsers(trimmedSearch, 0, 10);

        const users = data?.content || [];

        /*
         * Don't show the currently logged-in
         * user in user search.
         */

        const filteredUsers = users.filter(
          (searchedUser) => searchedUser.id !== currentUser?.id,
        );

        setResults(filteredUsers);

        setPage(data?.number ?? 0);

        setTotalPages(data?.totalPages ?? 0);
      } catch (error) {
        console.error("User search failed:", error);

        setError(error.response?.data?.message || "Unable to search users");

        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm, currentUser?.id]);

  // ==================================================
  // LOAD PAGE
  // ==================================================

  const loadPage = async (nextPage) => {
    if (!searchTerm.trim()) {
      return;
    }

    try {
      setLoading(true);

      setError("");

      const data = await searchUsers(searchTerm.trim(), nextPage, 10);

      const users = data?.content || [];

      const filteredUsers = users.filter(
        (searchedUser) => searchedUser.id !== currentUser?.id,
      );

      setResults(filteredUsers);

      setPage(data?.number ?? nextPage);

      setTotalPages(data?.totalPages ?? 0);
    } catch (error) {
      console.error("Failed to load search page:", error);

      setError(error.response?.data?.message || "Unable to load results");
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // USER CLICK
  // ==================================================

  const handleUserClick = async (selectedUser) => {
    try {
      await addRecentSearch(selectedUser.id);

      /*
       * Refresh recent searches so the UI
       * immediately reflects the backend state.
       */

      const updatedRecentSearches = await getRecentSearches();

      setRecentSearches(updatedRecentSearches || []);
    } catch (error) {
      console.error("Failed to save recent search:", error);
    }
  };

  // ==================================================
  // CLEAR RECENT SEARCHES
  // ==================================================

  const handleClearRecentSearches = async () => {
    try {
      await clearRecentSearches();

      setRecentSearches([]);
    } catch (error) {
      console.error("Failed to clear recent searches:", error);
    }
  };

  return (
    <section className={css("user-search")}>
      <div className={css("section-header")}>
        <h2>Find People</h2>
      </div>

      <input
        type="text"
        className={css("search-input")}
        aria-label="Search people by name"
        placeholder="Search users by name..."
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />

      {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}

      {loading && <p className={css("search-status")}>Searching...</p>}

      {!loading && searchTerm.trim() && results.length === 0 && !error && (
        <p className={css("search-status")}>No users found.</p>
      )}

      <div className={css("user-results")}>
        {results.map((searchedUser) => (
          <UserCard
            key={searchedUser.id}
            user={searchedUser}
            onClick={handleUserClick}
          />
        ))}
      </div>

      {totalPages > 1 && searchTerm.trim() && (
        <div className={css("pagination")}>
          <button
            disabled={loading || page === 0}
            onClick={() => loadPage(page - 1)}
          >
            Previous
          </button>

          <span>
            Page {page + 1} of {totalPages}
          </span>

          <button
            disabled={loading || page >= totalPages - 1}
            onClick={() => loadPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {!searchTerm.trim() && (
        <section className={css("recent-searches")}>
          <div className={css("section-header")}>
            <h3>Recent Searches</h3>

            {recentSearches.length > 0 && (
              <button
                className={css("text-button")}
                onClick={handleClearRecentSearches}
              >
                Clear
              </button>
            )}
          </div>

          {recentLoading && (
            <p className={css("search-status")}>Loading recent searches...</p>
          )}

          {!recentLoading && recentSearches.length === 0 && (
            <p className={css("search-status")}>No recent searches.</p>
          )}

          <div className={css("user-results")}>
            {recentSearches.map((recentUser) => (
              <UserCard
                key={recentUser.id}
                user={recentUser}
                onClick={handleUserClick}
              />
            ))}
          </div>
        </section>
      )}
    </section>
  );
};

export default UserSearch;
```

### Changes (+ added / - removed)

```diff
--- before/src/components/users/UserSearch.jsx
+++ after/src/components/users/UserSearch.jsx
@@ -1,3 +1,6 @@
+import usersStyles from "../../styles/users.module.css";
+import { bindStyles } from "../../utils/bindStyles";
+import StatusMessage from "../ui/StatusMessage";
 import { useEffect, useState } from "react";
 
 import {
@@ -10,6 +13,8 @@
 import { useAuth } from "../../auth/AuthContext";
 
 import UserCard from "./UserCard";
+
+const css = bindStyles(usersStyles);
 
 const UserSearch = () => {
   const { user: currentUser } = useAuth();
@@ -183,28 +188,29 @@
   };
 
   return (
-    <section className="user-search">
-      <div className="section-header">
+    <section className={css("user-search")}>
+      <div className={css("section-header")}>
         <h2>Find People</h2>
       </div>
 
       <input
         type="text"
-        className="search-input"
+        className={css("search-input")}
+        aria-label="Search people by name"
         placeholder="Search users by name..."
         value={searchTerm}
         onChange={(event) => setSearchTerm(event.target.value)}
       />
 
-      {error && <p className="error">{error}</p>}
-
-      {loading && <p className="search-status">Searching...</p>}
+      {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}
+
+      {loading && <p className={css("search-status")}>Searching...</p>}
 
       {!loading && searchTerm.trim() && results.length === 0 && !error && (
-        <p className="search-status">No users found.</p>
+        <p className={css("search-status")}>No users found.</p>
       )}
 
-      <div className="user-results">
+      <div className={css("user-results")}>
         {results.map((searchedUser) => (
           <UserCard
             key={searchedUser.id}
@@ -215,7 +221,7 @@
       </div>
 
       {totalPages > 1 && searchTerm.trim() && (
-        <div className="pagination">
+        <div className={css("pagination")}>
           <button
             disabled={loading || page === 0}
             onClick={() => loadPage(page - 1)}
@@ -237,13 +243,13 @@
       )}
 
       {!searchTerm.trim() && (
-        <section className="recent-searches">
-          <div className="section-header">
+        <section className={css("recent-searches")}>
+          <div className={css("section-header")}>
             <h3>Recent Searches</h3>
 
             {recentSearches.length > 0 && (
               <button
-                className="text-button"
+                className={css("text-button")}
                 onClick={handleClearRecentSearches}
               >
                 Clear
@@ -252,14 +258,14 @@
           </div>
 
           {recentLoading && (
-            <p className="search-status">Loading recent searches...</p>
+            <p className={css("search-status")}>Loading recent searches...</p>
           )}
 
           {!recentLoading && recentSearches.length === 0 && (
-            <p className="search-status">No recent searches.</p>
+            <p className={css("search-status")}>No recent searches.</p>
           )}
 
-          <div className="user-results">
+          <div className={css("user-results")}>
             {recentSearches.map((recentUser) => (
               <UserCard
                 key={recentUser.id}
```

## src/index.css

Updated. Only global foundation imports remain; feature rules moved to their owners.

### Full current content

```css
/* Application-wide foundations only. Feature CSS is imported by its consumers. */
@import "./styles/tokens.css";
@import "./styles/base.css";
@import "./styles/shared.css";
```

### Changes (+ added / - removed)

```diff
--- before/src/index.css
+++ after/src/index.css
@@ -1,814 +1,4 @@
-/* Foundation first; existing feature selectors remain compatible with current markup. */
+/* Application-wide foundations only. Feature CSS is imported by its consumers. */
 @import "./styles/tokens.css";
 @import "./styles/base.css";
 @import "./styles/shared.css";
-
-/* ==================================================
-   AUTH
-   ================================================== */
-
-.auth-page {
-  min-height: 100vh;
-  min-height: 100dvh;
-
-  display: flex;
-  align-items: center;
-  justify-content: center;
-
-  padding: 20px;
-}
-
-.auth-card {
-  width: min(380px, 100%);
-
-  background: var(--color-surface);
-
-  padding: 30px;
-
-  border-radius: var(--radius-xl);
-
-  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
-}
-
-.auth-card h1 {
-  margin-top: 0;
-}
-
-.auth-card h2 {
-  margin-bottom: 25px;
-}
-
-.auth-card form {
-  display: flex;
-  flex-direction: column;
-  gap: 15px;
-}
-
-.auth-card input {
-  padding: 12px;
-
-  border-radius: var(--radius-sm);
-
-}
-
-.auth-card input:focus {
-  border-color: var(--color-outline);
-}
-
-.auth-card button {
-  width: 100%;
-}
-
-/* ==================================================
-   COMMON
-   ================================================== */
-
-.error {
-  color: #d32f2f;
-  margin: 10px 0;
-}
-
-.success {
-  color: var(--color-success);
-  margin: 10px 0;
-}
-
-.loading-screen {
-  min-height: 100vh;
-  min-height: 100dvh;
-
-  display: flex;
-  align-items: center;
-  justify-content: center;
-
-  padding: 20px;
-
-  font-size: 18px;
-  color: var(--color-text-secondary);
-
-  text-align: center;
-}
-
-/* ==================================================
-   NAVBAR
-   ================================================== */
-
-.navbar {
-  position: sticky;
-  top: 0;
-
-  z-index: 1000;
-
-  width: 100%;
-  min-height: var(--navbar-height);
-
-  padding: 0 30px;
-
-  background: var(--color-surface);
-  border-bottom: 1px solid var(--color-border);
-
-  display: flex;
-  align-items: center;
-  justify-content: space-between;
-}
-
-.navbar-left {
-  min-width: 0;
-
-  display: flex;
-  align-items: center;
-}
-
-.navbar-brand {
-  color: var(--color-text);
-
-  text-decoration: none;
-
-  font-size: 22px;
-  font-weight: 700;
-
-  white-space: nowrap;
-}
-
-.navbar-right {
-  display: flex;
-  align-items: center;
-
-  gap: 20px;
-}
-
-.navbar-link {
-  position: relative;
-
-  min-height: 40px;
-
-  display: inline-flex;
-  align-items: center;
-
-  color: var(--color-text-strong);
-
-  text-decoration: none;
-
-  white-space: nowrap;
-
-  font-size: 14px;
-}
-
-.navbar-link:hover {
-  text-decoration: underline;
-}
-
-.navbar-user {
-  max-width: 160px;
-
-  font-weight: 600;
-
-  white-space: nowrap;
-  overflow: hidden;
-  text-overflow: ellipsis;
-}
-
-.navbar-logout {
-  min-height: 40px;
-
-  padding: 8px 14px;
-
-  border: none;
-  border-radius: var(--radius-sm);
-
-  background: var(--color-primary);
-  color: var(--color-on-primary);
-
-  font-weight: 600;
-
-  transition: background var(--transition-fast);
-}
-
-.navbar-logout:hover {
-  background: var(--color-primary-hover);
-}
-
-/* ==================================================
-   MOBILE NAVBAR
-   ================================================== */
-
-.navbar-menu-toggle {
-  display: none;
-
-  width: 42px;
-  height: 42px;
-
-  padding: 9px;
-
-  border: 1px solid var(--color-border);
-  border-radius: var(--radius-md);
-
-  background: var(--color-surface);
-
-  flex-direction: column;
-  align-items: center;
-  justify-content: center;
-
-  gap: 4px;
-}
-
-.navbar-menu-toggle span {
-  width: 20px;
-  height: 2px;
-
-  border-radius: 2px;
-
-  background: var(--color-text);
-}
-
-.navbar-mobile-menu {
-  display: none;
-}
-
-/* ==================================================
-   HOME
-   ================================================== */
-
-.home-page {
-  max-width: 1000px;
-
-}
-
-.welcome-section {
-  padding: 25px;
-
-  margin-bottom: 25px;
-
-}
-
-.welcome-section h1 {
-  margin-top: 0;
-  margin-bottom: 12px;
-
-  line-height: 1.2;
-}
-
-.welcome-section p {
-  margin: 6px 0;
-
-  color: var(--color-text-secondary);
-}
-
-/* ==================================================
-   SEARCH
-   ================================================== */
-
-.user-search {
-  background: var(--color-surface);
-
-  padding: 25px;
-
-  border-radius: var(--radius-xl);
-
-  box-shadow: var(--shadow-card);
-}
-
-.section-header {
-  display: flex;
-  align-items: center;
-  justify-content: space-between;
-
-  gap: 15px;
-
-  margin-bottom: 15px;
-}
-
-.section-header h2,
-.section-header h3 {
-  margin: 0;
-}
-
-.search-input {
-  min-height: 44px;
-
-  padding: 11px 14px;
-
-  border-radius: var(--radius-md);
-
-  background: var(--color-surface);
-}
-
-.search-input:focus {
-  border-color: var(--color-outline);
-}
-
-.search-status {
-  color: var(--color-text-secondary);
-}
-
-.user-results {
-  display: flex;
-  flex-direction: column;
-
-  gap: 10px;
-
-  margin-top: 15px;
-}
-
-/* ==================================================
-   USER CARD
-   ================================================== */
-
-.user-card {
-  min-width: 0;
-
-  display: flex;
-  align-items: center;
-
-  gap: 14px;
-
-  padding: 12px;
-
-  border: 1px solid var(--color-border);
-  border-radius: var(--radius-lg);
-
-  background: var(--color-surface);
-
-  cursor: pointer;
-
-  text-decoration: none;
-  color: inherit;
-
-  transition:
-    background var(--transition-fast),
-    transform var(--transition-fast);
-}
-
-.user-card-info {
-  min-width: 0;
-}
-
-.user-card-info h3 {
-  margin: 0 0 5px;
-
-  font-size: 16px;
-}
-
-.user-card-info p {
-  margin: 0;
-
-  color: var(--color-text-secondary);
-
-  white-space: nowrap;
-  overflow: hidden;
-  text-overflow: ellipsis;
-}
-
-/* ==================================================
-   AVATAR
-   ================================================== */
-
-.user-avatar {
-  flex-shrink: 0;
-
-  object-fit: cover;
-
-  border-radius: 50%;
-}
-
-.user-avatar-placeholder {
-  display: flex;
-  align-items: center;
-  justify-content: center;
-
-  background: #dddddd;
-  color: var(--color-text-strong);
-
-  font-weight: 700;
-}
-
-.user-avatar.small {
-  width: 36px;
-  height: 36px;
-
-  font-size: 14px;
-}
-
-.user-avatar.medium {
-  width: 48px;
-  height: 48px;
-
-  font-size: 18px;
-}
-
-.user-avatar.large {
-  width: 120px;
-  height: 120px;
-
-  font-size: 42px;
-}
-
-/* ==================================================
-   RECENT SEARCHES
-   ================================================== */
-
-.recent-searches {
-  margin-top: 30px;
-}
-
-.text-button {
-  border: none;
-  background: transparent;
-
-  color: #444444;
-
-  text-decoration: underline;
-
-  padding: 6px 8px;
-}
-
-/* ==================================================
-   PAGINATION
-   ================================================== */
-
-.pagination {
-  margin-top: 20px;
-}
-
-/* ==================================================
-   PROFILE
-   ================================================== */
-
-.profile-page {
-  max-width: 700px;
-
-}
-
-.profile-card h1 {
-  margin-top: 0;
-  margin-bottom: 20px;
-}
-
-.profile-image-section {
-  display: flex;
-  flex-direction: column;
-
-  align-items: center;
-
-  gap: 15px;
-
-  margin: 25px 0;
-}
-
-.profile-image {
-  width: 120px;
-  height: 120px;
-
-  object-fit: cover;
-
-  border-radius: 50%;
-}
-
-.profile-image-section button {
-  min-height: 40px;
-
-  padding: 8px 14px;
-
-  border: 1px solid var(--color-control-border);
-  border-radius: var(--radius-sm);
-
-  background: var(--color-surface);
-
-  font-weight: 600;
-}
-
-.profile-form {
-  display: flex;
-  flex-direction: column;
-
-  gap: 10px;
-}
-
-.profile-form label {
-  font-weight: 600;
-
-  margin-top: 8px;
-}
-
-.profile-form input,
-.profile-form textarea {
-  padding: 11px;
-
-  border-radius: 7px;
-
-  resize: vertical;
-
-}
-
-.profile-form input:focus,
-.profile-form textarea:focus {
-  border-color: var(--color-outline);
-}
-
-.profile-form input:disabled {
-  background: var(--color-disabled);
-
-  color: var(--color-text-secondary);
-
-  cursor: not-allowed;
-}
-
-.profile-form button {
-  width: 100%;
-
-  min-height: 44px;
-
-  margin-top: 10px;
-
-  padding: 11px;
-
-  border: none;
-  border-radius: 7px;
-
-  background: var(--color-primary);
-  color: var(--color-on-primary);
-
-  font-weight: 600;
-}
-
-.profile-form button:disabled {
-  opacity: 0.6;
-}
-
-.character-count {
-  text-align: right;
-
-  font-size: 12px;
-
-  color: var(--color-text-subtle);
-}
-
-.profile-details {
-  margin-top: 25px;
-
-  padding-top: 20px;
-
-  border-top: 1px solid var(--color-border-light);
-
-  color: var(--color-outline);
-}
-
-.profile-details p {
-  margin: 8px 0;
-}
-
-.back-link {
-  display: inline-block;
-
-  margin-bottom: 20px;
-
-  color: var(--color-text-strong);
-
-  text-decoration: none;
-
-  font-weight: 600;
-}
-
-.back-link:hover {
-  text-decoration: underline;
-}
-
-.user-profile-card {
-  max-width: 700px;
-  margin: 0 auto;
-}
-
-.user-profile-info {
-  text-align: center;
-}
-
-.user-profile-info h1 {
-  margin: 0 0 10px;
-}
-
-.user-profile-bio {
-  color: var(--color-outline);
-
-  margin: 0;
-
-  line-height: 1.5;
-}
-
-/* ==================================================
-   REDUCED MOTION
-   ================================================== */
-
-@media (prefers-reduced-motion: reduce) {
-  *,
-  *::before,
-  *::after {
-    scroll-behavior: auto !important;
-    transition-duration: 0.01ms !important;
-    animation-duration: 0.01ms !important;
-  }
-}
-
-/* ==================================================
-   MOBILE
-   ================================================== */
-
-@media (max-width: 700px) {
-  :root {
-    --navbar-height: 56px;
-  }
-
-  .navbar {
-    min-height: var(--navbar-height);
-
-    padding: 0 12px;
-  }
-
-  .navbar-brand {
-    font-size: 20px;
-  }
-
-  .navbar-right {
-    display: none;
-  }
-
-  .navbar-menu-toggle {
-    display: flex;
-  }
-
-  .navbar-mobile-menu {
-    position: absolute;
-
-    top: 100%;
-    left: 0;
-    right: 0;
-
-    display: flex;
-    flex-direction: column;
-
-    max-height: calc(100dvh - var(--navbar-height));
-
-    overflow-y: auto;
-
-    padding: 8px 12px 16px;
-
-    background: var(--color-surface);
-
-    border-bottom: 1px solid var(--color-border);
-
-    box-shadow: var(--shadow-menu);
-
-    visibility: hidden;
-    opacity: 0;
-    transform: translateY(-8px);
-
-    pointer-events: none;
-
-    transition:
-      opacity 0.15s ease,
-      transform 0.15s ease,
-      visibility 0.15s ease;
-  }
-
-  .navbar-mobile-menu.open {
-    visibility: visible;
-    opacity: 1;
-    transform: translateY(0);
-
-    pointer-events: auto;
-  }
-
-  .navbar-mobile-user {
-    display: flex;
-    flex-direction: column;
-
-    padding: 14px 12px;
-
-    margin-bottom: 4px;
-
-    border-bottom: 1px solid var(--color-border-light);
-  }
-
-  .navbar-mobile-user-name {
-    font-weight: 700;
-  }
-
-  .navbar-mobile-user-email {
-    margin-top: 3px;
-
-    color: var(--color-text-secondary);
-
-    font-size: 13px;
-
-    overflow: hidden;
-    text-overflow: ellipsis;
-    white-space: nowrap;
-  }
-
-  .navbar-mobile-link {
-    min-height: 46px;
-
-    display: flex;
-    align-items: center;
-    justify-content: space-between;
-
-    padding: 0 12px;
-
-    border-radius: var(--radius-md);
-
-    color: var(--color-text);
-
-    text-decoration: none;
-
-    font-size: 15px;
-    font-weight: 500;
-  }
-
-  .navbar-mobile-link:active {
-    background: var(--color-hover);
-  }
-
-  .navbar-mobile-logout {
-    width: 100%;
-
-    min-height: 46px;
-
-    margin-top: 8px;
-
-    border: none;
-    border-radius: var(--radius-md);
-
-    background: var(--color-primary);
-    color: var(--color-on-primary);
-
-    font-weight: 600;
-  }
-
-  .home-page,
-  .profile-page {
-    padding: 20px 12px;
-  }
-
-  .welcome-section,
-  .user-search,
-  .profile-card {
-    padding: 20px;
-
-    border-radius: var(--radius-lg);
-  }
-
-  .welcome-section h1 {
-    font-size: 24px;
-  }
-
-  .section-header {
-    align-items: flex-start;
-    flex-direction: column;
-  }
-
-  .pagination {
-    gap: 12px;
-  }
-
-  .pagination button {
-    min-width: 90px;
-  }
-
-  .profile-page {
-    padding-top: 20px;
-  }
-
-  .profile-card {
-    width: 100%;
-  }
-}
-
-@media (max-width: 380px) {
-  .auth-page {
-    padding: 12px;
-  }
-
-  .auth-card {
-    padding: 22px 18px;
-  }
-
-  .welcome-section,
-  .user-search,
-  .profile-card {
-    padding: 16px;
-  }
-
-  .welcome-section h1 {
-    font-size: 22px;
-  }
-}
-
-/* ==================================================
-   DESKTOP-ONLY HOVER
-   ================================================== */
-
-@media (hover: hover) and (pointer: fine) {
-  .user-card:hover {
-    background: #f8f8f8;
-    transform: translateY(-1px);
-  }
-}
```

## src/main.jsx

Updated. Remove obsolete global feature stylesheet imports.

### Full current content

```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

import { AuthProvider } from "./auth/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </AuthProvider>
  </StrictMode>,
);
```

### Changes (+ added / - removed)

```diff
--- before/src/main.jsx
+++ after/src/main.jsx
@@ -7,8 +7,6 @@
 import { NotificationProvider } from "./context/NotificationContext";
 
 import "./index.css";
-import "./styles/friends.css";
-import "./styles/notifications.css";
 
 createRoot(document.getElementById("root")).render(
   <StrictMode>
```

## src/pages/ForgotPassword.jsx

Updated. Adopt feature classes and shared fields/feedback; preserve existing handlers and native constraints.

### Full current content

```jsx
import authStyles from "../styles/auth.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import FormField from "../components/ui/FormField";
import Button from "../components/ui/Button";
import { useState } from "react";
import { Link } from "react-router-dom";

import { forgotPassword } from "../api/authApi";

const css = bindStyles(authStyles);

const ForgotPassword = () => {
  const [email, setEmail] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await forgotPassword(email);

      /*
       * Always show the same message.
       *
       * This prevents revealing whether
       * the email exists in FrndBook.
       */
      setSuccess(
        "If an account exists for this email, a password reset link has been sent.",
      );
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message || "Unable to process your request",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={css("auth-page")}>
      <div className={css("auth-card")}>
        <h1>FrndBook</h1>

        <h2>Forgot Password</h2>

        <p>
          Enter your email and we'll send you a password reset link if an
          account exists.
        </p>

        <form onSubmit={handleSubmit}>
          <FormField label="Email" autoComplete="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}

          {success && <StatusMessage tone="success" className={css("success")}>{success}</StatusMessage>}

          <Button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <p>
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/ForgotPassword.jsx
+++ after/src/pages/ForgotPassword.jsx
@@ -1,8 +1,14 @@
+import authStyles from "../styles/auth.module.css";
+import { bindStyles } from "../utils/bindStyles";
+import StatusMessage from "../components/ui/StatusMessage";
+import FormField from "../components/ui/FormField";
 import Button from "../components/ui/Button";
 import { useState } from "react";
 import { Link } from "react-router-dom";
 
 import { forgotPassword } from "../api/authApi";
+
+const css = bindStyles(authStyles);
 
 const ForgotPassword = () => {
   const [email, setEmail] = useState("");
@@ -43,8 +49,8 @@
   };
 
   return (
-    <div className="auth-page">
-      <div className="auth-card">
+    <div className={css("auth-page")}>
+      <div className={css("auth-card")}>
         <h1>FrndBook</h1>
 
         <h2>Forgot Password</h2>
@@ -55,7 +61,7 @@
         </p>
 
         <form onSubmit={handleSubmit}>
-          <input
+          <FormField label="Email" autoComplete="email"
             type="email"
             placeholder="Email"
             value={email}
@@ -63,9 +69,9 @@
             required
           />
 
-          {error && <p className="error">{error}</p>}
+          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}
 
-          {success && <p className="success">{success}</p>}
+          {success && <StatusMessage tone="success" className={css("success")}>{success}</StatusMessage>}
 
           <Button type="submit" disabled={loading}>
             {loading ? "Sending..." : "Send Reset Link"}
```

## src/pages/FriendRequests.jsx

Updated. Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow.

### Full current content

```jsx
import friendsStyles from "../styles/friends.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import { useEffect, useState } from "react";

import Navbar from "../components/layout/Navbar";

import FriendRequestCard from "../components/users/FriendRequestCard";

import {
  getReceivedFriendRequests,
  getSentFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
} from "../api/friendApi";

const css = bindStyles(friendsStyles);

const FriendRequests = () => {
  const [receivedRequests, setReceivedRequests] = useState([]);

  const [sentRequests, setSentRequests] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [actionRequestId, setActionRequestId] = useState(null);

  // ==================================================
  // LOAD REQUESTS
  // ==================================================

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const [received, sent] = await Promise.all([
        getReceivedFriendRequests(),
        getSentFriendRequests(),
      ]);

      setReceivedRequests(received || []);
      setSentRequests(sent || []);
    } catch (error) {
      console.error("Failed to load friend requests:", error);

      setError(
        error.response?.data?.message || "Unable to load friend requests",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // ==================================================
  // ACCEPT
  // ==================================================

  const handleAccept = async (requestId) => {
    try {
      setError("");
      setActionRequestId(requestId);

      await acceptFriendRequest(requestId);

      setReceivedRequests((requests) =>
        requests.filter((request) => request.id !== requestId),
      );
    } catch (error) {
      console.error("Failed to accept friend request:", error);

      setError(
        error.response?.data?.message || "Unable to accept friend request",
      );
    } finally {
      setActionRequestId(null);
    }
  };

  // ==================================================
  // REJECT
  // ==================================================

  const handleReject = async (requestId) => {
    try {
      setError("");
      setActionRequestId(requestId);

      await rejectFriendRequest(requestId);

      setReceivedRequests((requests) =>
        requests.filter((request) => request.id !== requestId),
      );
    } catch (error) {
      console.error("Failed to reject friend request:", error);

      setError(
        error.response?.data?.message || "Unable to reject friend request",
      );
    } finally {
      setActionRequestId(null);
    }
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <>
        <Navbar />

        <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Loading friend requests...</div>
      </>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <>
      <Navbar />

      <PageContainer className={css("friend-requests-page")}>
        <Card className={css("friend-requests-card")}>
          <div className={css("friends-header")}>
            <div>
              <h1>Friend Requests</h1>

              <p>Manage your incoming and outgoing requests.</p>
            </div>
          </div>

          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}

          {/* ========================================
              RECEIVED
              ======================================== */}

          <section className={css("request-section")}>
            <div className={css("request-section-header")}>
              <h2>Received</h2>

              <span>{receivedRequests.length}</span>
            </div>

            {receivedRequests.length === 0 ? (
              <p className={css("request-empty")}>No pending friend requests.</p>
            ) : (
              <div className={css("friend-request-list")}>
                {receivedRequests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    type="received"
                    onAccept={handleAccept}
                    onReject={handleReject}
                    actionLoading={actionRequestId === request.id}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ========================================
              SENT
              ======================================== */}

          <section className={css("request-section")}>
            <div className={css("request-section-header")}>
              <h2>Sent</h2>

              <span>{sentRequests.length}</span>
            </div>

            {sentRequests.length === 0 ? (
              <p className={css("request-empty")}>No pending sent requests.</p>
            ) : (
              <div className={css("friend-request-list")}>
                {sentRequests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    type="sent"
                  />
                ))}
              </div>
            )}
          </section>
        </Card>
      </PageContainer>
    </>
  );
};

export default FriendRequests;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/FriendRequests.jsx
+++ after/src/pages/FriendRequests.jsx
@@ -1,3 +1,6 @@
+import friendsStyles from "../styles/friends.module.css";
+import { bindStyles } from "../utils/bindStyles";
+import StatusMessage from "../components/ui/StatusMessage";
 import PageContainer from "../components/ui/PageContainer";
 import Card from "../components/ui/Card";
 import { useEffect, useState } from "react";
@@ -13,6 +16,8 @@
   rejectFriendRequest,
 } from "../api/friendApi";
 
+const css = bindStyles(friendsStyles);
+
 const FriendRequests = () => {
   const [receivedRequests, setReceivedRequests] = useState([]);
 
@@ -114,7 +119,7 @@
       <>
         <Navbar />
 
-        <div className="loading-screen">Loading friend requests...</div>
+        <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Loading friend requests...</div>
       </>
     );
   }
@@ -127,9 +132,9 @@
     <>
       <Navbar />
 
-      <PageContainer className="friend-requests-page">
-        <Card className="friend-requests-card">
-          <div className="friends-header">
+      <PageContainer className={css("friend-requests-page")}>
+        <Card className={css("friend-requests-card")}>
+          <div className={css("friends-header")}>
             <div>
               <h1>Friend Requests</h1>
 
@@ -137,23 +142,23 @@
             </div>
           </div>
 
-          {error && <p className="error">{error}</p>}
+          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}
 
           {/* ========================================
               RECEIVED
               ======================================== */}
 
-          <section className="request-section">
-            <div className="request-section-header">
+          <section className={css("request-section")}>
+            <div className={css("request-section-header")}>
               <h2>Received</h2>
 
               <span>{receivedRequests.length}</span>
             </div>
 
             {receivedRequests.length === 0 ? (
-              <p className="request-empty">No pending friend requests.</p>
+              <p className={css("request-empty")}>No pending friend requests.</p>
             ) : (
-              <div className="friend-request-list">
+              <div className={css("friend-request-list")}>
                 {receivedRequests.map((request) => (
                   <FriendRequestCard
                     key={request.id}
@@ -172,17 +177,17 @@
               SENT
               ======================================== */}
 
-          <section className="request-section">
-            <div className="request-section-header">
+          <section className={css("request-section")}>
+            <div className={css("request-section-header")}>
               <h2>Sent</h2>
 
               <span>{sentRequests.length}</span>
             </div>
 
             {sentRequests.length === 0 ? (
-              <p className="request-empty">No pending sent requests.</p>
+              <p className={css("request-empty")}>No pending sent requests.</p>
             ) : (
-              <div className="friend-request-list">
+              <div className={css("friend-request-list")}>
                 {sentRequests.map((request) => (
                   <FriendRequestCard
                     key={request.id}
```

## src/pages/Friends.jsx

Updated. Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow.

### Full current content

```jsx
import friendsStyles from "../styles/friends.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import { useEffect, useState } from "react";

import Navbar from "../components/layout/Navbar";

import FriendCard from "../components/users/FriendCard";

import { getFriends, removeFriend } from "../api/friendApi";

const css = bindStyles(friendsStyles);

const Friends = () => {
  const [friends, setFriends] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [removingFriendId, setRemovingFriendId] = useState(null);

  // ==================================================
  // LOAD FRIENDS
  // ==================================================

  const loadFriends = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getFriends();

      setFriends(data || []);
    } catch (error) {
      console.error("Failed to load friends:", error);

      setError(error.response?.data?.message || "Unable to load friends");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  // ==================================================
  // REMOVE FRIEND
  // ==================================================

  const handleRemoveFriend = async (friend) => {
    if (!friend) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove ${friend.name} from your friends?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setRemovingFriendId(friend.id);

      await removeFriend(friend.id);

      setFriends((currentFriends) =>
        currentFriends.filter(
          (currentFriend) => currentFriend.id !== friend.id,
        ),
      );
    } catch (error) {
      console.error("Failed to remove friend:", error);

      setError(error.response?.data?.message || "Unable to remove friend");
    } finally {
      setRemovingFriendId(null);
    }
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <>
        <Navbar />

        <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Loading friends...</div>
      </>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <>
      <Navbar />

      <PageContainer className={css("friends-page")}>
        <Card className={css("friends-card")}>
          <div className={css("friends-header")}>
            <div>
              <h1>Friends</h1>

              <p>
                {friends.length} {friends.length === 1 ? "friend" : "friends"}
              </p>
            </div>
          </div>

          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}

          {!error && friends.length === 0 && (
            <div className={css("friends-empty")}>
              <h2>No friends yet</h2>

              <p>Search for people and send them a friend request.</p>
            </div>
          )}

          {friends.length > 0 && (
            <div className={css("friends-list")}>
              {friends.map((friend) => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  onRemove={handleRemoveFriend}
                  removing={removingFriendId === friend.id}
                />
              ))}
            </div>
          )}
        </Card>
      </PageContainer>
    </>
  );
};

export default Friends;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/Friends.jsx
+++ after/src/pages/Friends.jsx
@@ -1,3 +1,6 @@
+import friendsStyles from "../styles/friends.module.css";
+import { bindStyles } from "../utils/bindStyles";
+import StatusMessage from "../components/ui/StatusMessage";
 import PageContainer from "../components/ui/PageContainer";
 import Card from "../components/ui/Card";
 import { useEffect, useState } from "react";
@@ -7,6 +10,8 @@
 import FriendCard from "../components/users/FriendCard";
 
 import { getFriends, removeFriend } from "../api/friendApi";
+
+const css = bindStyles(friendsStyles);
 
 const Friends = () => {
   const [friends, setFriends] = useState([]);
@@ -88,7 +93,7 @@
       <>
         <Navbar />
 
-        <div className="loading-screen">Loading friends...</div>
+        <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Loading friends...</div>
       </>
     );
   }
@@ -101,9 +106,9 @@
     <>
       <Navbar />
 
-      <PageContainer className="friends-page">
-        <Card className="friends-card">
-          <div className="friends-header">
+      <PageContainer className={css("friends-page")}>
+        <Card className={css("friends-card")}>
+          <div className={css("friends-header")}>
             <div>
               <h1>Friends</h1>
 
@@ -113,10 +118,10 @@
             </div>
           </div>
 
-          {error && <p className="error">{error}</p>}
+          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}
 
           {!error && friends.length === 0 && (
-            <div className="friends-empty">
+            <div className={css("friends-empty")}>
               <h2>No friends yet</h2>
 
               <p>Search for people and send them a friend request.</p>
@@ -124,7 +129,7 @@
           )}
 
           {friends.length > 0 && (
-            <div className="friends-list">
+            <div className={css("friends-list")}>
               {friends.map((friend) => (
                 <FriendCard
                   key={friend.id}
```

## src/pages/Home.jsx

Updated. Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow.

### Full current content

```jsx
import homeStyles from "../styles/home.module.css";
import { bindStyles } from "../utils/bindStyles";
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import Navbar from "../components/layout/Navbar";

import UserSearch from "../components/users/UserSearch";

import { useAuth } from "../auth/AuthContext";

const css = bindStyles(homeStyles);

const Home = () => {
  const { user } = useAuth();

  return (
    <>
      <Navbar />

      <PageContainer className={css("home-page")}>
        <Card as="section" className={css("welcome-section")}>
          <h1>Welcome to FrndBook</h1>

          <p>Hello, {user?.name}</p>

          <p>{user?.email}</p>
        </Card>

        <UserSearch />
      </PageContainer>
    </>
  );
};

export default Home;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/Home.jsx
+++ after/src/pages/Home.jsx
@@ -1,3 +1,5 @@
+import homeStyles from "../styles/home.module.css";
+import { bindStyles } from "../utils/bindStyles";
 import PageContainer from "../components/ui/PageContainer";
 import Card from "../components/ui/Card";
 import Navbar from "../components/layout/Navbar";
@@ -6,6 +8,8 @@
 
 import { useAuth } from "../auth/AuthContext";
 
+const css = bindStyles(homeStyles);
+
 const Home = () => {
   const { user } = useAuth();
 
@@ -13,8 +17,8 @@
     <>
       <Navbar />
 
-      <PageContainer className="home-page">
-        <Card as="section" className="welcome-section">
+      <PageContainer className={css("home-page")}>
+        <Card as="section" className={css("welcome-section")}>
           <h1>Welcome to FrndBook</h1>
 
           <p>Hello, {user?.name}</p>
```

## src/pages/Login.jsx

Updated. Adopt feature classes and shared fields/feedback; preserve existing handlers and native constraints.

### Full current content

```jsx
import authStyles from "../styles/auth.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import FormField from "../components/ui/FormField";
import Button from "../components/ui/Button";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

const css = bindStyles(authStyles);

const Login = () => {
  const navigate = useNavigate();

  const { login } = useAuth();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login(email, password);

      navigate("/");
    } catch (error) {
      console.error(error);

      setError(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={css("auth-page")}>
      <div className={css("auth-card")}>
        <h1>FrndBook</h1>

        <h2>Login</h2>

        <form onSubmit={handleSubmit}>
          <FormField label="Email" autoComplete="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <FormField label="Password" autoComplete="current-password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}

          <Button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <p>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>

        <p>
          Don't have an account? <Link to="/signup">Signup</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/Login.jsx
+++ after/src/pages/Login.jsx
@@ -1,8 +1,14 @@
+import authStyles from "../styles/auth.module.css";
+import { bindStyles } from "../utils/bindStyles";
+import StatusMessage from "../components/ui/StatusMessage";
+import FormField from "../components/ui/FormField";
 import Button from "../components/ui/Button";
 import { useState } from "react";
 import { Link, useNavigate } from "react-router-dom";
 
 import { useAuth } from "../auth/AuthContext";
+
+const css = bindStyles(authStyles);
 
 const Login = () => {
   const navigate = useNavigate();
@@ -37,14 +43,14 @@
   };
 
   return (
-    <div className="auth-page">
-      <div className="auth-card">
+    <div className={css("auth-page")}>
+      <div className={css("auth-card")}>
         <h1>FrndBook</h1>
 
         <h2>Login</h2>
 
         <form onSubmit={handleSubmit}>
-          <input
+          <FormField label="Email" autoComplete="email"
             type="email"
             placeholder="Email"
             value={email}
@@ -52,7 +58,7 @@
             required
           />
 
-          <input
+          <FormField label="Password" autoComplete="current-password"
             type="password"
             placeholder="Password"
             value={password}
@@ -60,7 +66,7 @@
             required
           />
 
-          {error && <p className="error">{error}</p>}
+          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}
 
           <Button type="submit" disabled={loading}>
             {loading ? "Logging in..." : "Login"}
```

## src/pages/Messages.jsx

Updated. Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow.

### Full current content

```jsx
import chatStyles from "../styles/chat.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import { useCallback, useEffect, useRef, useState } from "react";

import { useSearchParams } from "react-router-dom";

import Navbar from "../components/layout/Navbar";

import ConversationList from "../components/chat/ConversationList";
import ChatWindow from "../components/chat/ChatWindow";

import {
  getConversations,
  getConversation,
  getOrCreateConversation,
} from "../api/conversationApi";

import { useAuth } from "../auth/AuthContext";

import { createConversationUpdateWebSocket } from "../services/conversationUpdateWebSocketService";
import { subscribeConversationSidebar } from "../services/conversationSidebarSubscription";
import { applyConversationUpdate, mergeConversation, mergeConversationLists } from "../utils/conversationUpdates";

const css = bindStyles(chatStyles);

const Messages = () => {
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);

  const [selectedConversation, setSelectedConversation] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  /*
   * Desktop always shows both panels.
   *
   * On mobile this controls whether we are currently
   * looking at the conversation list or the chat window.
   */
  const [mobileView, setMobileView] = useState("conversations");

  // ==================================================
  // LOAD CONVERSATIONS
  // ==================================================

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getConversations();

      setConversations((current) => mergeConversationLists(current, data || []));

      return data || [];
    } catch (error) {
      console.error("Failed to load conversations:", error);

      setError(error.response?.data?.message || "Unable to load conversations");

      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const data = await loadConversations();

      if (cancelled) {
        return;
      }

      const requestedUserId = searchParams.get("userId");

      if (!requestedUserId) {
        if (data.length > 0) {
          setSelectedConversation((current) => current || data[0]);
        }

        return;
      }

      try {
        const conversation = await getOrCreateConversation(requestedUserId);

        if (cancelled) {
          return;
        }

        const refreshed = await loadConversations();

        if (cancelled) {
          return;
        }

        const matchingConversation = refreshed.find(
          (item) => String(item.id) === String(conversation.id),
        );

        const resolvedConversation = matchingConversation || conversation;

        setSelectedConversation(resolvedConversation);

        /*
         * When Messages is opened directly through
         * /messages?userId=..., mobile should go
         * directly into the chat.
         */
        setMobileView("chat");

        setSearchParams(
          {},
          {
            replace: true,
          },
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to open conversation:", error);

          setError(
            error.response?.data?.message || "Unable to start conversation",
          );
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [loadConversations, searchParams, setSearchParams]);

  // ==================================================
  // SELECT CONVERSATION
  // ==================================================

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);

    /*
     * On mobile, selecting a conversation should
     * switch from the conversation list to chat.
     *
     * On desktop this state has no visual effect.
     */
    setMobileView("chat");
  };

  // ==================================================
  // BACK TO CONVERSATIONS
  // ==================================================

  const handleBackToConversations = () => {
    setMobileView("conversations");
  };

  // ==================================================
  // HANDLE REALTIME MESSAGE
  // ==================================================

  const handleConversationUpdate = useCallback((update) => {
    if (update?.conversationId == null || !update.lastMessage) return;
    setConversations((current) => applyConversationUpdate(current, update));
    setSelectedConversation((current) =>
      current && String(current.id) === String(update.conversationId)
        ? mergeConversation(current, {
            ...current,
            lastMessage: update.lastMessage,
            updatedAt: update.updatedAt || update.lastMessage.createdAt,
          })
        : current,
    );
  }, []);

  const handleMessageReceived = useCallback((message) => {
    if (message?.conversationId == null) return;
    handleConversationUpdate({
      conversationId: message.conversationId,
      lastMessage: message,
      updatedAt: message.createdAt,
    });
  }, [handleConversationUpdate]);

  useEffect(() => {
    if (!user?.id) return;
    return subscribeConversationSidebar({
      createSocket: createConversationUpdateWebSocket,
      loadList: getConversations,
      loadConversation: getConversation,
      hasConversation: (id) =>
        conversationsRef.current.some((row) => String(row.id) === id),
      onUpdate: handleConversationUpdate,
      onRows: (rows) => {
        setConversations((current) => mergeConversationLists(current, rows));
        setSelectedConversation((current) => {
          const incoming = rows.find((row) => String(row.id) === String(current?.id));
          return current && incoming ? mergeConversation(current, incoming) : current;
        });
      },
      onError: (error) => {
        console.error("Conversation sidebar update failed:", error);
      },
    });
  }, [user?.id, handleConversationUpdate]);

  // ==================================================
  // LOADING
  // ==================================================

  if (loading && conversations.length === 0) {
    return (
      <>
        <Navbar />

        <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Loading messages...</div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main id="main-content" tabIndex={-1} className={css("messages-page")}>
        <div className={css("messages-card")}>
          {error && <StatusMessage tone="error" className={css("error chat-page-error")}>{error}</StatusMessage>}

          <div
            className={css(`messages-layout ${
              mobileView === "chat"
                ? "mobile-chat-active"
                : "mobile-conversations-active"
            }`)}
          >
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversation?.id}
              onSelect={handleSelectConversation}
              loading={loading}
            />

            <ChatWindow
              conversation={selectedConversation}
              currentUserId={user?.id}
              onMessageReceived={handleMessageReceived}
              onBackToConversations={handleBackToConversations}
            />
          </div>
        </div>
      </main>
    </>
  );
};

export default Messages;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/Messages.jsx
+++ after/src/pages/Messages.jsx
@@ -1,3 +1,6 @@
+import chatStyles from "../styles/chat.module.css";
+import { bindStyles } from "../utils/bindStyles";
+import StatusMessage from "../components/ui/StatusMessage";
 import { useCallback, useEffect, useRef, useState } from "react";
 
 import { useSearchParams } from "react-router-dom";
@@ -19,7 +22,7 @@
 import { subscribeConversationSidebar } from "../services/conversationSidebarSubscription";
 import { applyConversationUpdate, mergeConversation, mergeConversationLists } from "../utils/conversationUpdates";
 
-import "../styles/chat.css";
+const css = bindStyles(chatStyles);
 
 const Messages = () => {
   const { user } = useAuth();
@@ -229,7 +232,7 @@
       <>
         <Navbar />
 
-        <div className="loading-screen">Loading messages...</div>
+        <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Loading messages...</div>
       </>
     );
   }
@@ -238,16 +241,16 @@
     <>
       <Navbar />
 
-      <main className="messages-page">
-        <div className="messages-card">
-          {error && <p className="error chat-page-error">{error}</p>}
+      <main id="main-content" tabIndex={-1} className={css("messages-page")}>
+        <div className={css("messages-card")}>
+          {error && <StatusMessage tone="error" className={css("error chat-page-error")}>{error}</StatusMessage>}
 
           <div
-            className={`messages-layout ${
+            className={css(`messages-layout ${
               mobileView === "chat"
                 ? "mobile-chat-active"
                 : "mobile-conversations-active"
-            }`}
+            }`)}
           >
             <ConversationList
               conversations={conversations}
```

## src/pages/Notifications.jsx

Updated. Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow.

### Full current content

```jsx
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
        error.response?.data?.message || "Unable to mark notification as read",
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
        error.response?.data?.message ||
          "Unable to mark all notifications as read",
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
                          ? new Date(notification.createdAt).toLocaleString()
                          : ""}
                      </span>

                      {notification.type && (
                        <span className={css("notification-type")}>
                          {notification.type}
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
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/Notifications.jsx
+++ after/src/pages/Notifications.jsx
@@ -1,3 +1,6 @@
+import notificationsStyles from "../styles/notifications.module.css";
+import { bindStyles } from "../utils/bindStyles";
+import StatusMessage from "../components/ui/StatusMessage";
 import PageContainer from "../components/ui/PageContainer";
 import Card from "../components/ui/Card";
 import { useEffect, useState } from "react";
@@ -5,6 +8,8 @@
 import Navbar from "../components/layout/Navbar";
 
 import { useNotifications } from "../context/NotificationContext";
+
+const css = bindStyles(notificationsStyles);
 
 const PAGE_SIZE = 10;
 
@@ -105,7 +110,7 @@
       <>
         <Navbar />
 
-        <div className="loading-screen">Loading notifications...</div>
+        <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Loading notifications...</div>
       </>
     );
   }
@@ -118,9 +123,9 @@
     <>
       <Navbar />
 
-      <PageContainer className="notifications-page">
-        <Card className="notifications-card">
-          <div className="notifications-header">
+      <PageContainer className={css("notifications-page")}>
+        <Card className={css("notifications-card")}>
+          <div className={css("notifications-header")}>
             <div>
               <h1>Notifications</h1>
 
@@ -130,7 +135,7 @@
             {notifications.some((notification) => !notification.read) && (
               <button
                 type="button"
-                className="notifications-mark-all"
+                className={css("notifications-mark-all")}
                 onClick={handleMarkAllAsRead}
                 disabled={markAllLoading}
               >
@@ -140,11 +145,11 @@
           </div>
 
           {(error || actionError) && (
-            <p className="error">{actionError || error}</p>
+            <StatusMessage tone="error" className={css("error")}>{actionError || error}</StatusMessage>
           )}
 
           {notifications.length === 0 && !error && (
-            <div className="notifications-empty">
+            <div className={css("notifications-empty")}>
               <h2>No notifications yet</h2>
 
               <p>You're all caught up. New activity will appear here.</p>
@@ -152,31 +157,31 @@
           )}
 
           {notifications.length > 0 && (
-            <div className="notification-list">
+            <div className={css("notification-list")}>
               {notifications.map((notification) => (
                 <article
                   key={notification.id}
-                  className={`notification-item ${
+                  className={css(`notification-item ${
                     notification.read
                       ? "notification-read"
                       : "notification-unread"
-                  }`}
+                  }`)}
                 >
-                  <div className="notification-indicator">
+                  <div className={css("notification-indicator")}>
                     {!notification.read && (
                       <span
-                        className="notification-unread-dot"
+                        className={css("notification-unread-dot")}
                         aria-label="Unread"
                       />
                     )}
                   </div>
 
-                  <div className="notification-content">
-                    <p className="notification-message">
+                  <div className={css("notification-content")}>
+                    <p className={css("notification-message")}>
                       {notification.message}
                     </p>
 
-                    <div className="notification-meta">
+                    <div className={css("notification-meta")}>
                       <span>
                         {notification.createdAt
                           ? new Date(notification.createdAt).toLocaleString()
@@ -184,7 +189,7 @@
                       </span>
 
                       {notification.type && (
-                        <span className="notification-type">
+                        <span className={css("notification-type")}>
                           {notification.type}
                         </span>
                       )}
@@ -194,7 +199,7 @@
                   {!notification.read && (
                     <button
                       type="button"
-                      className="notification-read-button"
+                      className={css("notification-read-button")}
                       onClick={() => handleMarkAsRead(notification.id)}
                       disabled={actionLoadingId === notification.id}
                     >
@@ -209,7 +214,7 @@
           )}
 
           {totalPages > 1 && (
-            <div className="notification-pagination">
+            <div className={css("notification-pagination")}>
               <button
                 type="button"
                 disabled={loading || page === 0}
```

## src/pages/Profile.jsx

Updated. Adopt feature classes and shared fields/feedback; preserve existing handlers and native constraints.

### Full current content

```jsx
import profileStyles from "../styles/profile.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import FormField from "../components/ui/FormField";
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import { useEffect, useRef, useState } from "react";

import Navbar from "../components/layout/Navbar";

import UserAvatar from "../components/users/UserAvatar";

import { updateProfile, updateProfileImage } from "../api/userApi";

import { useAuth } from "../auth/AuthContext";

const css = bindStyles(profileStyles);

const Profile = () => {
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState(user);

  const [name, setName] = useState(user?.name || "");

  const [bio, setBio] = useState(user?.bio || "");

  const [loading, setLoading] = useState(false);

  const [imageLoading, setImageLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [previewImage, setPreviewImage] = useState(null);

  const fileInputRef = useRef(null);

  // ==================================================
  // SYNC USER
  // ==================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfile(user);
    setName(user.name || "");
    setBio(user.bio || "");
  }, [user]);

  // ==================================================
  // CLEANUP PREVIEW
  // ==================================================

  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  // ==================================================
  // UPDATE PROFILE
  // ==================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const updatedUser = await updateProfile(name.trim(), bio.trim());

      setProfile(updatedUser);
      setName(updatedUser.name || "");
      setBio(updatedUser.bio || "");

      setSuccess("Profile updated successfully.");
    } catch (error) {
      console.error("Profile update failed:", error);

      setError(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // IMAGE SELECTION
  // ==================================================

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    setError("");
    setSuccess("");

    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }

    const previewUrl = URL.createObjectURL(file);

    setPreviewImage(previewUrl);

    handleImageUpload(file);
  };

  // ==================================================
  // IMAGE UPLOAD
  // ==================================================

  const handleImageUpload = async (file) => {
    setImageLoading(true);

    setError("");
    setSuccess("");

    try {
      const updatedUser = await updateProfileImage(file);

      setProfile(updatedUser);

      setSuccess("Profile image updated successfully.");

      /*
       * Keep the local preview visible until
       * the profile page is refreshed.
       */
    } catch (error) {
      console.error("Profile image upload failed:", error);

      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }

      setPreviewImage(null);

      setError(
        error.response?.data?.message || "Failed to upload profile image",
      );
    } finally {
      setImageLoading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (authLoading) {
    return <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Loading...</div>;
  }

  if (!profile) {
    return <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Unable to load profile.</div>;
  }

  return (
    <>
      <Navbar />

      <PageContainer className={css("profile-page")}>
        <Card className={css("profile-card")}>
          <h1>My Profile</h1>

          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}

          {success && <StatusMessage tone="success" className={css("success")}>{success}</StatusMessage>}

          <div className={css("profile-image-section")}>
            <UserAvatar
              name={profile.name}
              image={previewImage || profile.profileImage}
              userId={profile.id}
              size="large"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageLoading}
            >
              {imageLoading ? "Uploading..." : "Change Photo"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              hidden
            />
          </div>

          <form className={css("profile-form")} onSubmit={handleSubmit}>

            <FormField label="Name" autoComplete="name"
              type="text"
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              required
            />

            <FormField label="Email" type="email" autoComplete="email" value={profile.email} disabled />

            <FormField as="textarea" label="Bio"
              value={bio}
              maxLength={500}
              rows={5}
              onChange={(event) => setBio(event.target.value)}
            />

            <div className={css("character-count")}>{bio.length}/500</div>

            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>

          <div className={css("profile-details")}>
            <p>
              <strong>Status:</strong> {profile.status || "—"}
            </p>

            <p>
              <strong>Last seen:</strong>{" "}
              {profile.lastSeen
                ? new Date(profile.lastSeen).toLocaleString()
                : "—"}
            </p>
          </div>
        </Card>
      </PageContainer>
    </>
  );
};

export default Profile;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/Profile.jsx
+++ after/src/pages/Profile.jsx
@@ -1,3 +1,7 @@
+import profileStyles from "../styles/profile.module.css";
+import { bindStyles } from "../utils/bindStyles";
+import StatusMessage from "../components/ui/StatusMessage";
+import FormField from "../components/ui/FormField";
 import PageContainer from "../components/ui/PageContainer";
 import Card from "../components/ui/Card";
 import { useEffect, useRef, useState } from "react";
@@ -9,6 +13,8 @@
 import { updateProfile, updateProfileImage } from "../api/userApi";
 
 import { useAuth } from "../auth/AuthContext";
+
+const css = bindStyles(profileStyles);
 
 const Profile = () => {
   const { user, loading: authLoading } = useAuth();
@@ -162,26 +168,26 @@
   // ==================================================
 
   if (authLoading) {
-    return <div className="loading-screen">Loading...</div>;
+    return <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Loading...</div>;
   }
 
   if (!profile) {
-    return <div className="loading-screen">Unable to load profile.</div>;
+    return <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Unable to load profile.</div>;
   }
 
   return (
     <>
       <Navbar />
 
-      <PageContainer className="profile-page">
-        <Card className="profile-card">
+      <PageContainer className={css("profile-page")}>
+        <Card className={css("profile-card")}>
           <h1>My Profile</h1>
 
-          {error && <p className="error">{error}</p>}
-
-          {success && <p className="success">{success}</p>}
-
-          <div className="profile-image-section">
+          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}
+
+          {success && <StatusMessage tone="success" className={css("success")}>{success}</StatusMessage>}
+
+          <div className={css("profile-image-section")}>
             <UserAvatar
               name={profile.name}
               image={previewImage || profile.profileImage}
@@ -206,10 +212,9 @@
             />
           </div>
 
-          <form className="profile-form" onSubmit={handleSubmit}>
-            <label>Name</label>
-
-            <input
+          <form className={css("profile-form")} onSubmit={handleSubmit}>
+
+            <FormField label="Name" autoComplete="name"
               type="text"
               value={name}
               maxLength={100}
@@ -217,27 +222,23 @@
               required
             />
 
-            <label>Email</label>
-
-            <input type="email" value={profile.email} disabled />
-
-            <label>Bio</label>
-
-            <textarea
+            <FormField label="Email" type="email" autoComplete="email" value={profile.email} disabled />
+
+            <FormField as="textarea" label="Bio"
               value={bio}
               maxLength={500}
               rows={5}
               onChange={(event) => setBio(event.target.value)}
             />
 
-            <div className="character-count">{bio.length}/500</div>
+            <div className={css("character-count")}>{bio.length}/500</div>
 
             <button type="submit" disabled={loading}>
               {loading ? "Saving..." : "Save Changes"}
             </button>
           </form>
 
-          <div className="profile-details">
+          <div className={css("profile-details")}>
             <p>
               <strong>Status:</strong> {profile.status || "—"}
             </p>
```

## src/pages/ResetPassword.jsx

Updated. Adopt feature classes and shared fields/feedback; preserve existing handlers and native constraints.

### Full current content

```jsx
import authStyles from "../styles/auth.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import FormField from "../components/ui/FormField";
import Button from "../components/ui/Button";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { resetPassword } from "../api/authApi";

const css = bindStyles(authStyles);

const ResetPassword = () => {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError("Invalid or missing reset link.");

      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");

      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");

      return;
    }

    setLoading(true);

    try {
      await resetPassword({
        token,
        newPassword: password,
      });

      setSuccess("Password reset successfully. Redirecting to login...");

      window.setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      console.error(error);

      setError(error.response?.data?.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={css("auth-page")}>
      <div className={css("auth-card")}>
        <h1>FrndBook</h1>

        <h2>Reset Password</h2>

        <form onSubmit={handleSubmit}>
          <FormField label="New password" autoComplete="new-password"
            type="password"
            placeholder="New password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />

          <FormField label="Confirm password" autoComplete="new-password"
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
          />

          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}

          {success && <StatusMessage tone="success" className={css("success")}>{success}</StatusMessage>}

          <Button type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>

        <p>
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/ResetPassword.jsx
+++ after/src/pages/ResetPassword.jsx
@@ -1,8 +1,14 @@
+import authStyles from "../styles/auth.module.css";
+import { bindStyles } from "../utils/bindStyles";
+import StatusMessage from "../components/ui/StatusMessage";
+import FormField from "../components/ui/FormField";
 import Button from "../components/ui/Button";
 import { useState } from "react";
 import { Link, useNavigate, useSearchParams } from "react-router-dom";
 
 import { resetPassword } from "../api/authApi";
+
+const css = bindStyles(authStyles);
 
 const ResetPassword = () => {
   const navigate = useNavigate();
@@ -68,14 +74,14 @@
   };
 
   return (
-    <div className="auth-page">
-      <div className="auth-card">
+    <div className={css("auth-page")}>
+      <div className={css("auth-card")}>
         <h1>FrndBook</h1>
 
         <h2>Reset Password</h2>
 
         <form onSubmit={handleSubmit}>
-          <input
+          <FormField label="New password" autoComplete="new-password"
             type="password"
             placeholder="New password"
             value={password}
@@ -84,7 +90,7 @@
             required
           />
 
-          <input
+          <FormField label="Confirm password" autoComplete="new-password"
             type="password"
             placeholder="Confirm password"
             value={confirmPassword}
@@ -93,9 +99,9 @@
             required
           />
 
-          {error && <p className="error">{error}</p>}
+          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}
 
-          {success && <p className="success">{success}</p>}
+          {success && <StatusMessage tone="success" className={css("success")}>{success}</StatusMessage>}
 
           <Button type="submit" disabled={loading}>
             {loading ? "Resetting..." : "Reset Password"}
```

## src/pages/Signup.jsx

Updated. Adopt feature classes and shared fields/feedback; preserve existing handlers and native constraints.

### Full current content

```jsx
import authStyles from "../styles/auth.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import FormField from "../components/ui/FormField";
import Button from "../components/ui/Button";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

const css = bindStyles(authStyles);

const Signup = () => {
  const navigate = useNavigate();

  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await signup(name, email, password);

      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message || "Unable to send verification code",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={css("auth-page")}>
      <div className={css("auth-card")}>
        <h1>FrndBook</h1>

        <h2>Create Account</h2>

        <form onSubmit={handleSubmit}>
          <FormField label="Name" autoComplete="name"
            type="text"
            placeholder="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <FormField label="Email" autoComplete="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <FormField label="Password" autoComplete="new-password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />

          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}

          <Button type="submit" disabled={loading}>
            {loading ? "Sending code..." : "Create Account"}
          </Button>
        </form>

        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/Signup.jsx
+++ after/src/pages/Signup.jsx
@@ -1,8 +1,14 @@
+import authStyles from "../styles/auth.module.css";
+import { bindStyles } from "../utils/bindStyles";
+import StatusMessage from "../components/ui/StatusMessage";
+import FormField from "../components/ui/FormField";
 import Button from "../components/ui/Button";
 import { useState } from "react";
 import { Link, useNavigate } from "react-router-dom";
 
 import { useAuth } from "../auth/AuthContext";
+
+const css = bindStyles(authStyles);
 
 const Signup = () => {
   const navigate = useNavigate();
@@ -38,14 +44,14 @@
   };
 
   return (
-    <div className="auth-page">
-      <div className="auth-card">
+    <div className={css("auth-page")}>
+      <div className={css("auth-card")}>
         <h1>FrndBook</h1>
 
         <h2>Create Account</h2>
 
         <form onSubmit={handleSubmit}>
-          <input
+          <FormField label="Name" autoComplete="name"
             type="text"
             placeholder="Name"
             value={name}
@@ -53,7 +59,7 @@
             required
           />
 
-          <input
+          <FormField label="Email" autoComplete="email"
             type="email"
             placeholder="Email"
             value={email}
@@ -61,7 +67,7 @@
             required
           />
 
-          <input
+          <FormField label="Password" autoComplete="new-password"
             type="password"
             placeholder="Password"
             value={password}
@@ -70,7 +76,7 @@
             required
           />
 
-          {error && <p className="error">{error}</p>}
+          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}
 
           <Button type="submit" disabled={loading}>
             {loading ? "Sending code..." : "Create Account"}
```

## src/pages/UserProfile.jsx

Updated. Adopt feature classes and shared fields/feedback; preserve existing handlers and native constraints.

### Full current content

```jsx
import friendsStyles from "../styles/friends.module.css";
import profileStyles from "../styles/profile.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Navbar from "../components/layout/Navbar";

import UserAvatar from "../components/users/UserAvatar";
import FriendAction from "../components/users/FriendAction";

import { getUserById } from "../api/userApi";

import {
  sendFriendRequest,
  getFriends,
  getReceivedFriendRequests,
  getSentFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from "../api/friendApi";

import { useAuth } from "../auth/AuthContext";

import { FRIENDSHIP_STATUS, getFriendshipState } from "../utils/friendship";

const css = bindStyles(friendsStyles, profileStyles);

const UserProfile = () => {
  const { userId } = useParams();

  const navigate = useNavigate();

  const { user: currentUser } = useAuth();

  const [user, setUser] = useState(null);

  const [friendshipStatus, setFriendshipStatus] = useState(
    FRIENDSHIP_STATUS.NONE,
  );

  const [friendRequestId, setFriendRequestId] = useState(null);

  const [loading, setLoading] = useState(true);

  const [friendshipLoading, setFriendshipLoading] = useState(false);

  const [friendshipLoaded, setFriendshipLoaded] = useState(false);

  const [error, setError] = useState("");

  const [friendshipError, setFriendshipError] = useState("");

  // ==================================================
  // LOAD PROFILE
  // ==================================================

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getUserById(userId);

        setUser(data);
      } catch (error) {
        console.error("Failed to load user profile:", error);

        setError(
          error.response?.data?.message || "Unable to load user profile",
        );
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  // ==================================================
  // LOAD FRIENDSHIP STATE
  // ==================================================

  useEffect(() => {
    if (!user || !currentUser) {
      return;
    }

    if (String(user.id) === String(currentUser.id)) {
      setFriendshipLoaded(true);

      return;
    }

    const loadFriendshipState = async () => {
      try {
        setFriendshipError("");
        setFriendshipLoaded(false);

        const [friends, receivedRequests, sentRequests] = await Promise.all([
          getFriends(),
          getReceivedFriendRequests(),
          getSentFriendRequests(),
        ]);

        const state = getFriendshipState(
          user.id,
          friends || [],
          receivedRequests || [],
          sentRequests || [],
        );

        setFriendshipStatus(state.status);

        setFriendRequestId(state.requestId);
      } catch (error) {
        console.error("Failed to load friendship state:", error);

        setFriendshipError(
          error.response?.data?.message || "Unable to load friendship status",
        );
      } finally {
        setFriendshipLoaded(true);
      }
    };

    loadFriendshipState();
  }, [user, currentUser]);

  // ==================================================
  // ADD FRIEND
  // ==================================================

  const handleAddFriend = async () => {
    if (!user) {
      return;
    }

    try {
      setFriendshipLoading(true);
      setFriendshipError("");

      const request = await sendFriendRequest(user.id);

      setFriendshipStatus(FRIENDSHIP_STATUS.REQUEST_SENT);

      setFriendRequestId(request?.id || null);
    } catch (error) {
      console.error("Failed to send friend request:", error);

      setFriendshipError(
        error.response?.data?.message || "Unable to send friend request",
      );
    } finally {
      setFriendshipLoading(false);
    }
  };

  // ==================================================
  // ACCEPT
  // ==================================================

  const handleAcceptFriend = async () => {
    if (!friendRequestId) {
      return;
    }

    try {
      setFriendshipLoading(true);
      setFriendshipError("");

      await acceptFriendRequest(friendRequestId);

      setFriendshipStatus(FRIENDSHIP_STATUS.FRIENDS);

      setFriendRequestId(null);
    } catch (error) {
      console.error("Failed to accept friend request:", error);

      setFriendshipError(
        error.response?.data?.message || "Unable to accept friend request",
      );
    } finally {
      setFriendshipLoading(false);
    }
  };

  // ==================================================
  // REJECT
  // ==================================================

  const handleRejectFriend = async () => {
    if (!friendRequestId) {
      return;
    }

    try {
      setFriendshipLoading(true);
      setFriendshipError("");

      await rejectFriendRequest(friendRequestId);

      setFriendshipStatus(FRIENDSHIP_STATUS.NONE);

      setFriendRequestId(null);
    } catch (error) {
      console.error("Failed to reject friend request:", error);

      setFriendshipError(
        error.response?.data?.message || "Unable to reject friend request",
      );
    } finally {
      setFriendshipLoading(false);
    }
  };

  // ==================================================
  // REMOVE FRIEND
  // ==================================================

  const handleRemoveFriend = async () => {
    if (!user) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove ${user.name} from your friends?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setFriendshipLoading(true);
      setFriendshipError("");

      await removeFriend(user.id);

      setFriendshipStatus(FRIENDSHIP_STATUS.NONE);
    } catch (error) {
      console.error("Failed to remove friend:", error);

      setFriendshipError(
        error.response?.data?.message || "Unable to remove friend",
      );
    } finally {
      setFriendshipLoading(false);
    }
  };

  // ==================================================
  // OPEN MESSAGE
  // ==================================================

  const handleMessage = () => {
    if (!user) {
      return;
    }

    /*
     * Reuse the existing Messages page flow.
     *
     * Messages.jsx already handles:
     *
     * /messages?userId={userId}
     *
     * and resolves/opens the conversation using
     * getOrCreateConversation().
     */
    navigate(`/messages?userId=${user.id}`);
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <>
        <Navbar />

        <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Loading profile...</div>
      </>
    );
  }

  // ==================================================
  // PROFILE ERROR
  // ==================================================

  if (error || !user) {
    return (
      <>
        <Navbar />

        <PageContainer className={css("profile-page")}>
          <Card className={css("profile-card")}>
            <StatusMessage tone="error" className={css("error")}>{error || "User not found."}</StatusMessage>

            <Link to="/" className={css("back-link")}>
              ← Back to Home
            </Link>
          </Card>
        </PageContainer>
      </>
    );
  }

  const isOwnProfile = String(user.id) === String(currentUser?.id);

  // ==================================================
  // UI
  // ==================================================

  return (
    <>
      <Navbar />

      <PageContainer className={css("profile-page")}>
        <Card className={css("profile-card user-profile-card")}>
          <Link to="/" className={css("back-link")}>
            ← Back to Home
          </Link>

          <div className={css("profile-image-section")}>
            <UserAvatar
              name={user.name}
              image={user.profileImage}
              userId={user.id}
              size="large"
            />
          </div>

          <div className={css("user-profile-info")}>
            <h1>{user.name}</h1>

            <p className={css("user-profile-bio")}>{user.bio || "No bio available"}</p>

            <div className={css("profile-details")}>
              <p>
                <strong>Status:</strong> {user.status || "—"}
              </p>

              <p>
                <strong>Last seen:</strong>{" "}
                {user.lastSeen ? new Date(user.lastSeen).toLocaleString() : "—"}
              </p>
            </div>
          </div>

          {!isOwnProfile && (
            <div className={css("friend-action-section")}>
              {friendshipError && <StatusMessage tone="error" className={css("error")}>{friendshipError}</StatusMessage>}

              {!friendshipLoaded ? (
                <p className={css("friendship-loading")}>Checking friendship...</p>
              ) : (
                <FriendAction
                  status={friendshipStatus}
                  onAdd={handleAddFriend}
                  onAccept={handleAcceptFriend}
                  onReject={handleRejectFriend}
                  onRemove={handleRemoveFriend}
                  onMessage={handleMessage}
                  loading={friendshipLoading}
                />
              )}
            </div>
          )}
        </Card>
      </PageContainer>
    </>
  );
};

export default UserProfile;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/UserProfile.jsx
+++ after/src/pages/UserProfile.jsx
@@ -1,3 +1,7 @@
+import friendsStyles from "../styles/friends.module.css";
+import profileStyles from "../styles/profile.module.css";
+import { bindStyles } from "../utils/bindStyles";
+import StatusMessage from "../components/ui/StatusMessage";
 import PageContainer from "../components/ui/PageContainer";
 import Card from "../components/ui/Card";
 import { useEffect, useState } from "react";
@@ -23,6 +27,8 @@
 import { useAuth } from "../auth/AuthContext";
 
 import { FRIENDSHIP_STATUS, getFriendshipState } from "../utils/friendship";
+
+const css = bindStyles(friendsStyles, profileStyles);
 
 const UserProfile = () => {
   const { userId } = useParams();
@@ -279,7 +285,7 @@
       <>
         <Navbar />
 
-        <div className="loading-screen">Loading profile...</div>
+        <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Loading profile...</div>
       </>
     );
   }
@@ -293,11 +299,11 @@
       <>
         <Navbar />
 
-        <PageContainer className="profile-page">
-          <Card className="profile-card">
-            <p className="error">{error || "User not found."}</p>
-
-            <Link to="/" className="back-link">
+        <PageContainer className={css("profile-page")}>
+          <Card className={css("profile-card")}>
+            <StatusMessage tone="error" className={css("error")}>{error || "User not found."}</StatusMessage>
+
+            <Link to="/" className={css("back-link")}>
               ← Back to Home
             </Link>
           </Card>
@@ -316,13 +322,13 @@
     <>
       <Navbar />
 
-      <PageContainer className="profile-page">
-        <Card className="profile-card user-profile-card">
-          <Link to="/" className="back-link">
+      <PageContainer className={css("profile-page")}>
+        <Card className={css("profile-card user-profile-card")}>
+          <Link to="/" className={css("back-link")}>
             ← Back to Home
           </Link>
 
-          <div className="profile-image-section">
+          <div className={css("profile-image-section")}>
             <UserAvatar
               name={user.name}
               image={user.profileImage}
@@ -331,12 +337,12 @@
             />
           </div>
 
-          <div className="user-profile-info">
+          <div className={css("user-profile-info")}>
             <h1>{user.name}</h1>
 
-            <p className="user-profile-bio">{user.bio || "No bio available"}</p>
-
-            <div className="profile-details">
+            <p className={css("user-profile-bio")}>{user.bio || "No bio available"}</p>
+
+            <div className={css("profile-details")}>
               <p>
                 <strong>Status:</strong> {user.status || "—"}
               </p>
@@ -349,11 +355,11 @@
           </div>
 
           {!isOwnProfile && (
-            <div className="friend-action-section">
-              {friendshipError && <p className="error">{friendshipError}</p>}
+            <div className={css("friend-action-section")}>
+              {friendshipError && <StatusMessage tone="error" className={css("error")}>{friendshipError}</StatusMessage>}
 
               {!friendshipLoaded ? (
-                <p className="friendship-loading">Checking friendship...</p>
+                <p className={css("friendship-loading")}>Checking friendship...</p>
               ) : (
                 <FriendAction
                   status={friendshipStatus}
```

## src/pages/VerifyEmail.jsx

Updated. Adopt feature classes and shared fields/feedback; preserve existing handlers and native constraints.

### Full current content

```jsx
import authStyles from "../styles/auth.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import FormField from "../components/ui/FormField";
import Button from "../components/ui/Button";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { resendVerification, verifyEmail } from "../api/authApi";

const css = bindStyles(authStyles);

const RESEND_COOLDOWN_SECONDS = 60;

const VerifyEmail = () => {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") || "");

  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [resendCountdown, setResendCountdown] = useState(
    RESEND_COOLDOWN_SECONDS,
  );

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendCountdown]);

  const handleVerify = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await verifyEmail({
        email,
        otp,
      });

      setSuccess("Email verified successfully. Redirecting to login...");

      window.setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      console.error(error);

      setError(error.response?.data?.message || "Unable to verify email");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) {
      return;
    }

    setError("");
    setSuccess("");
    setResending(true);

    try {
      await resendVerification({
        email,
      });

      setSuccess("A new verification code has been sent.");

      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message || "Unable to resend verification code",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={css("auth-page")}>
      <div className={css("auth-card")}>
        <h1>FrndBook</h1>

        <h2>Verify Your Email</h2>

        <p>Enter the 6-digit verification code sent to your email.</p>

        <form onSubmit={handleVerify}>
          <FormField label="Email" autoComplete="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <FormField label="Verification code" autoComplete="one-time-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            required
          />

          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}

          {success && <StatusMessage tone="success" className={css("success")}>{success}</StatusMessage>}

          <Button type="submit" disabled={loading || otp.length !== 6}>
            {loading ? "Verifying..." : "Verify Email"}
          </Button>
        </form>

        <Button
          type="button"
          onClick={handleResend}
          disabled={resending || resendCountdown > 0}
        >
          {resending
            ? "Sending..."
            : resendCountdown > 0
              ? `Resend code in ${resendCountdown}s`
              : "Resend code"}
        </Button>

        <p>
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/VerifyEmail.jsx
+++ after/src/pages/VerifyEmail.jsx
@@ -1,8 +1,14 @@
+import authStyles from "../styles/auth.module.css";
+import { bindStyles } from "../utils/bindStyles";
+import StatusMessage from "../components/ui/StatusMessage";
+import FormField from "../components/ui/FormField";
 import Button from "../components/ui/Button";
 import { useEffect, useState } from "react";
 import { Link, useNavigate, useSearchParams } from "react-router-dom";
 
 import { resendVerification, verifyEmail } from "../api/authApi";
+
+const css = bindStyles(authStyles);
 
 const RESEND_COOLDOWN_SECONDS = 60;
 
@@ -95,8 +101,8 @@
   };
 
   return (
-    <div className="auth-page">
-      <div className="auth-card">
+    <div className={css("auth-page")}>
+      <div className={css("auth-card")}>
         <h1>FrndBook</h1>
 
         <h2>Verify Your Email</h2>
@@ -104,7 +110,7 @@
         <p>Enter the 6-digit verification code sent to your email.</p>
 
         <form onSubmit={handleVerify}>
-          <input
+          <FormField label="Email" autoComplete="email"
             type="email"
             placeholder="Email"
             value={email}
@@ -112,7 +118,7 @@
             required
           />
 
-          <input
+          <FormField label="Verification code" autoComplete="one-time-code"
             type="text"
             inputMode="numeric"
             maxLength={6}
@@ -124,9 +130,9 @@
             required
           />
 
-          {error && <p className="error">{error}</p>}
+          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}
 
-          {success && <p className="success">{success}</p>}
+          {success && <StatusMessage tone="success" className={css("success")}>{success}</StatusMessage>}
 
           <Button type="submit" disabled={loading || otp.length !== 6}>
             {loading ? "Verifying..." : "Verify Email"}
```

## src/styles/auth.module.css

Added. Scoped feature styles, retaining current layouts and adding the phase-specific visual refinements.

### Full current content

```css
.auth-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.auth-card {
  width: min(420px, 100%);
  background: var(--color-surface);
  padding: 30px;
  border-radius: var(--radius-xl);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.auth-card h1 {
  margin-top: 0;
}

.auth-card h2 {
  margin-bottom: 25px;
}

.auth-card form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.auth-card button {
  width: 100%;
}

@media (max-width: 380px) {
  .auth-page {
    padding: 12px;
  }

  .auth-card {
    padding: 22px 18px;
  }
}

.auth-card h2 {
  margin-top: 8px;
  margin-bottom: 24px;
}

.auth-card > button {
  margin-top: 16px;
}

.auth-card > p {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.auth-card a {
  font-weight: 600;
  text-underline-offset: 3px;
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/styles/auth.module.css
@@ -0,0 +1,63 @@
+.auth-page {
+  min-height: 100vh;
+  min-height: 100dvh;
+  display: flex;
+  align-items: center;
+  justify-content: center;
+  padding: 20px;
+}
+
+.auth-card {
+  width: min(420px, 100%);
+  background: var(--color-surface);
+  padding: 30px;
+  border-radius: var(--radius-xl);
+  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
+}
+
+.auth-card h1 {
+  margin-top: 0;
+}
+
+.auth-card h2 {
+  margin-bottom: 25px;
+}
+
+.auth-card form {
+  display: flex;
+  flex-direction: column;
+  gap: 15px;
+}
+
+.auth-card button {
+  width: 100%;
+}
+
+@media (max-width: 380px) {
+  .auth-page {
+    padding: 12px;
+  }
+
+  .auth-card {
+    padding: 22px 18px;
+  }
+}
+
+.auth-card h2 {
+  margin-top: 8px;
+  margin-bottom: 24px;
+}
+
+.auth-card > button {
+  margin-top: 16px;
+}
+
+.auth-card > p {
+  color: var(--color-text-secondary);
+  font-size: 14px;
+}
+
+.auth-card a {
+  font-weight: 600;
+  text-underline-offset: 3px;
+}
```

## src/styles/base.css

Updated. Shared focus ring, loading status layout, reduced motion and skip-link styles.

### Full current content

```css
/* ==================================================
   RESET
   ================================================== */

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  width: 100%;
  min-height: 100%;
  overflow-x: hidden;
}

body {
  margin: 0;

  width: 100%;
  min-height: 100vh;

  font-family: Arial, Helvetica, sans-serif;

  background: var(--color-bg);
  color: var(--color-text);

  line-height: 1.45;

  overflow-x: hidden;

  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

#root {
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
}

button,
input,
textarea,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}

a {
  color: inherit;
}

img {
  max-width: 100%;
}

input,
textarea {
  min-width: 0;
}

button,
a,
input,
textarea {
  -webkit-tap-highlight-color: transparent;
}

/* ==================================================
   ACCESSIBILITY / FOCUS
   ================================================== */

button:focus-visible,
a:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}






.loading-screen {
min-height: 100vh;
  min-height: 100dvh;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 20px;

  font-size: 18px;
  color: var(--color-text-secondary);

  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
*,
*::before,
*::after {
scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
}
}

/* A skip link becomes visible only for keyboard users. */
.skip-link { position: fixed; top: 8px; left: 12px; transform: translateY(-180%); z-index: 1100; padding: 10px 16px; background: var(--color-primary); color: var(--color-on-primary); border-radius: var(--radius-md); }
.skip-link:focus { transform: translateY(0); }
```

### Changes (+ added / - removed)

```diff
--- before/src/styles/base.css
+++ after/src/styles/base.css
@@ -82,7 +82,41 @@
 a:focus-visible,
 input:focus-visible,
 textarea:focus-visible {
-  outline: 2px solid var(--color-outline);
+  outline: 2px solid var(--color-focus);
   outline-offset: 2px;
 }
 
+
+
+
+
+
+.loading-screen {
+min-height: 100vh;
+  min-height: 100dvh;
+
+  display: flex;
+  align-items: center;
+  justify-content: center;
+
+  padding: 20px;
+
+  font-size: 18px;
+  color: var(--color-text-secondary);
+
+  text-align: center;
+}
+
+@media (prefers-reduced-motion: reduce) {
+*,
+*::before,
+*::after {
+scroll-behavior: auto !important;
+    transition-duration: 0.01ms !important;
+    animation-duration: 0.01ms !important;
+}
+}
+
+/* A skip link becomes visible only for keyboard users. */
+.skip-link { position: fixed; top: 8px; left: 12px; transform: translateY(-180%); z-index: 1100; padding: 10px 16px; background: var(--color-primary); color: var(--color-on-primary); border-radius: var(--radius-md); }
+.skip-link:focus { transform: translateY(0); }
```

## src/styles/chat.module.css

Renamed. Scoped feature styles, retaining current layouts and adding the phase-specific visual refinements.

Replaces `src/styles/chat.css`. Remove that old path.

### Full current content

```css
.messages-page {
  width: 100%;
  max-width: 1200px;
  height: calc(100dvh - var(--navbar-height));
  margin: 0 auto;
  padding: 24px 20px;
  box-sizing: border-box;
}

.messages-card {
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--color-surface);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.messages-layout {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
}

.conversation-list {
  min-width: 0;
  min-height: 0;
  border-right: 1px solid var(--color-item-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.conversation-list-header {
  flex-shrink: 0;
  padding: 18px 20px;
  border-bottom: 1px solid var(--color-item-border);
}

.conversation-list-header h2 {
  margin: 0;
  font-size: 18px;
}

.conversation-items {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
}

.conversation-item {
  width: 100%;
  min-height: 72px;
  box-sizing: border-box;
  padding: 12px 14px;
  border: none;
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-surface);
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  cursor: pointer;
}

.conversation-item:hover {
  background: var(--color-hover);
}

.conversation-item-active {
  background: var(--color-selected);
}

.conversation-item-content {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conversation-item-content strong {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.conversation-item-content span {
  color: var(--color-text-secondary);
  font-size: 13px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.conversation-item-time {
  color: var(--color-text-muted);
  font-size: 11px;
  flex-shrink: 0;
}

.conversation-empty {
  padding: 25px 20px;
  color: var(--color-text-secondary);
  text-align: center;
}

.chat-status {
  flex-shrink: 0;
  padding: 15px;
  color: var(--color-text-subtle);
}

.chat-window {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chat-window-empty {
  align-items: center;
  justify-content: center;
  color: var(--color-text-subtle);
}

.chat-header {
  flex-shrink: 0;
  min-height: 72px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--color-item-border);
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
}

.chat-header h2 {
  margin: 0 0 4px;
  font-size: 18px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-header-avatar-link {
  display: flex;
  flex-shrink: 0;
  border-radius: 50%;
  text-decoration: none;
}

.chat-header-avatar-link:focus-visible {
  outline: 2px solid var(--color-outline);
  outline-offset: 2px;
}

.chat-connection-status {
  color: var(--color-text-muted);
  font-size: 12px;
}

.chat-connection-status.connected {
  color: var(--color-success);
}

.chat-header-info {
  min-width: 0;
  flex: 1;
}

.mobile-chat-back-button {
  display: none;
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid #dddddd;
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 20px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.mobile-chat-back-button:hover {
  background: var(--color-hover);
}

.chat-error {
  flex-shrink: 0;
  margin: 10px 15px;
}

.chat-page-error {
  flex-shrink: 0;
  margin: 12px 15px;
}

.message-list-container {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.older-messages-bar {
  flex-shrink: 0;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-item-border);
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--color-surface);
}

.chat-secondary-button {
  min-height: 36px;
  padding: 7px 12px;
  border: 1px solid var(--color-control-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text-strong);
  cursor: pointer;
  white-space: nowrap;
}

.chat-secondary-button:hover:not(:disabled) {
  background: var(--color-hover);
}

.chat-secondary-button:disabled {
  opacity: 0.6;
}

.message-list {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 20px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
}

.message-list-loading {
  align-items: center;
  justify-content: center;
  color: var(--color-text-subtle);
}

.message-empty {
  flex: 1;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-subtle);
  text-align: center;
}

.message-empty p {
  margin: 4px;
}

.message-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 75%;
  flex-shrink: 0;
}

.message-row-own {
  align-self: flex-end;
  justify-content: flex-end;
}

.message-row-other {
  align-self: flex-start;
}

.message-bubble {
  min-width: 50px;
  max-width: 100%;
  padding: 9px 12px;
  border-radius: 12px;
  box-sizing: border-box;
}

.message-bubble p {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.message-bubble span {
  display: block;
  margin-top: 5px;
  font-size: 10px;
  text-align: right;
}

.message-bubble-own {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-bottom-right-radius: 4px;
}

.message-bubble-other {
  background: var(--color-selected);
  color: var(--color-text);
  border-bottom-left-radius: 4px;
}

.message-bubble-own span {
  color: var(--color-control-border);
}

.message-bubble-other span {
  color: var(--color-text-subtle);
}

.message-composer {
  flex-shrink: 0;
  border-top: 1px solid var(--color-item-border);
  padding: 12px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
  background: var(--color-surface);
}

.message-composer textarea {
  box-sizing: border-box;
  resize: vertical;
  min-height: 50px;
  max-height: 150px;
  padding: 10px;
  border-radius: 7px;
}

.message-composer textarea:focus {
  border-color: var(--color-outline);
}

.message-composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.message-composer-footer span {
  color: var(--color-text-muted);
  font-size: 12px;
}

.message-composer-footer button {
  flex-shrink: 0;
  min-height: 40px;
  padding: 8px 18px;
  border: none;
  border-radius: 6px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  cursor: pointer;
  font-weight: 600;
}

.message-composer-footer button:disabled {
  opacity: 0.5;
}

@media (max-width: 800px) {
  .messages-page {
    height: calc(100dvh - var(--navbar-height));
    padding: 10px;
  }

  .messages-layout {
    grid-template-columns: 1fr;
  }

  .messages-layout.mobile-conversations-active .chat-window {
    display: none;
  }

  .messages-layout.mobile-chat-active .conversation-list {
    display: none;
  }

  .conversation-list {
    min-width: 0;
    min-height: 0;
  }

  .chat-window {
    min-width: 0;
    min-height: 0;
  }

  .mobile-chat-back-button {
    display: inline-flex;
  }

  .message-row {
    max-width: 90%;
  }
}

@media (max-width: 600px) {
  .messages-page {
    height: calc(100dvh - var(--navbar-height));
    padding: 0;
  }

  .messages-card {
    border-radius: 0;
    box-shadow: none;
  }

  .conversation-list-header {
    padding: 16px;
  }

  .conversation-item {
    min-height: 68px;
    padding: 11px 12px;
  }

  .chat-header {
    min-height: 64px;
    padding: 10px 12px;
    gap: 10px;
  }

  .chat-header h2 {
    font-size: 16px;
  }

  .mobile-chat-back-button {
    width: 36px;
    height: 36px;
  }

  .message-list {
    padding: 12px;
    gap: 8px;
  }

  .older-messages-bar {
    padding: 7px 10px;
  }

  .message-row {
    max-width: 92%;
  }

  .message-bubble {
    padding: 8px 11px;
  }

  .message-composer {
    padding: 10px;
    padding-bottom: max(10px, env(safe-area-inset-bottom));
  }

  .message-composer textarea {
    min-height: 48px;
    max-height: 120px;
  }

  .message-composer-footer button {
    min-width: 70px;
  }
}

@media (max-width: 380px) {
  .message-list {
    padding: 10px;
  }

  .message-row {
    max-width: 94%;
  }

  .message-composer {
    padding-left: 8px;
    padding-right: 8px;
  }

  .message-composer-footer {
    gap: 6px;
  }

  .message-composer-footer span {
    font-size: 11px;
  }

  .message-composer-footer button {
    padding-left: 14px;
    padding-right: 14px;
  }
}

.conversation-item:focus-visible {
  outline-offset: -3px;
}

.conversation-item-active {
  box-shadow: inset 3px 0 var(--color-primary);
}

.message-bubble span {
  font-size: 12px;
}
```

### Changes (+ added / - removed)

```diff
--- before/src/styles/chat.css
+++ after/src/styles/chat.module.css
@@ -1,116 +1,73 @@
-/* ==================================================
-   MESSAGES PAGE
-   ================================================== */
-
 .messages-page {
   width: 100%;
   max-width: 1200px;
-
   height: calc(100dvh - var(--navbar-height));
-
   margin: 0 auto;
-
   padding: 24px 20px;
-
   box-sizing: border-box;
 }
 
 .messages-card {
   width: 100%;
   height: 100%;
-
-  min-height: 0;
-
+  min-height: 0;
   background: var(--color-surface);
-
   border-radius: 12px;
-
   box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
-
-  overflow: hidden;
-
-  display: flex;
-  flex-direction: column;
-}
-
-/* ==================================================
-   MESSAGES LAYOUT
-   ================================================== */
+  overflow: hidden;
+  display: flex;
+  flex-direction: column;
+}
 
 .messages-layout {
   flex: 1;
-
-  min-width: 0;
-  min-height: 0;
-
+  min-width: 0;
+  min-height: 0;
   display: grid;
-
   grid-template-columns: 320px minmax(0, 1fr);
 }
 
-/* ==================================================
-   CONVERSATION LIST
-   ================================================== */
-
 .conversation-list {
   min-width: 0;
   min-height: 0;
-
   border-right: 1px solid var(--color-item-border);
-
-  display: flex;
-  flex-direction: column;
-
+  display: flex;
+  flex-direction: column;
   overflow: hidden;
 }
 
 .conversation-list-header {
   flex-shrink: 0;
-
   padding: 18px 20px;
-
   border-bottom: 1px solid var(--color-item-border);
 }
 
 .conversation-list-header h2 {
   margin: 0;
-
   font-size: 18px;
 }
 
 .conversation-items {
   flex: 1;
-
-  min-width: 0;
-  min-height: 0;
-
+  min-width: 0;
+  min-height: 0;
   overflow-y: auto;
   overflow-x: hidden;
-
   overscroll-behavior: contain;
 }
 
 .conversation-item {
   width: 100%;
-
   min-height: 72px;
-
-  box-sizing: border-box;
-
+  box-sizing: border-box;
   padding: 12px 14px;
-
   border: none;
   border-bottom: 1px solid var(--color-border-light);
-
   background: var(--color-surface);
-
-  display: flex;
-  align-items: center;
-
+  display: flex;
+  align-items: center;
   gap: 12px;
-
   text-align: left;
-
   cursor: pointer;
 }
 
@@ -124,69 +81,48 @@
 
 .conversation-item-content {
   min-width: 0;
-
-  flex: 1;
-
-  display: flex;
-  flex-direction: column;
-
+  flex: 1;
+  display: flex;
+  flex-direction: column;
   gap: 4px;
 }
 
 .conversation-item-content strong {
   overflow: hidden;
-
   white-space: nowrap;
-
   text-overflow: ellipsis;
 }
 
 .conversation-item-content span {
   color: var(--color-text-secondary);
-
   font-size: 13px;
-
-  overflow: hidden;
-
+  overflow: hidden;
   white-space: nowrap;
-
   text-overflow: ellipsis;
 }
 
 .conversation-item-time {
   color: var(--color-text-muted);
-
   font-size: 11px;
-
   flex-shrink: 0;
 }
 
 .conversation-empty {
   padding: 25px 20px;
-
   color: var(--color-text-secondary);
-
   text-align: center;
 }
 
 .chat-status {
   flex-shrink: 0;
-
   padding: 15px;
-
   color: var(--color-text-subtle);
 }
 
-/* ==================================================
-   CHAT WINDOW
-   ================================================== */
-
 .chat-window {
   min-width: 0;
   min-height: 0;
-
-  overflow: hidden;
-
+  overflow: hidden;
   display: flex;
   flex-direction: column;
 }
@@ -194,36 +130,23 @@
 .chat-window-empty {
   align-items: center;
   justify-content: center;
-
   color: var(--color-text-subtle);
 }
 
-/* ==================================================
-   CHAT HEADER
-   ================================================== */
-
 .chat-header {
   flex-shrink: 0;
-
   min-height: 72px;
-
   padding: 12px 18px;
-
   border-bottom: 1px solid var(--color-item-border);
-
-  display: flex;
-  align-items: center;
-
+  display: flex;
+  align-items: center;
   gap: 12px;
-
   box-sizing: border-box;
 }
 
 .chat-header h2 {
   margin: 0 0 4px;
-
   font-size: 18px;
-
   overflow: hidden;
   text-overflow: ellipsis;
   white-space: nowrap;
@@ -232,7 +155,6 @@
 .chat-header-avatar-link {
   display: flex;
   flex-shrink: 0;
-
   border-radius: 50%;
   text-decoration: none;
 }
@@ -244,7 +166,6 @@
 
 .chat-connection-status {
   color: var(--color-text-muted);
-
   font-size: 12px;
 }
 
@@ -254,35 +175,22 @@
 
 .chat-header-info {
   min-width: 0;
-
-  flex: 1;
-}
-
-/* ==================================================
-   MOBILE CHAT BACK BUTTON
-   ================================================== */
+  flex: 1;
+}
 
 .mobile-chat-back-button {
   display: none;
-
-  flex-shrink: 0;
-
+  flex-shrink: 0;
   width: 38px;
   height: 38px;
-
   padding: 0;
-
   border: 1px solid #dddddd;
   border-radius: 50%;
-
   background: var(--color-surface);
   color: var(--color-text);
-
   font-size: 20px;
-
   align-items: center;
   justify-content: center;
-
   cursor: pointer;
 }
 
@@ -290,69 +198,43 @@
   background: var(--color-hover);
 }
 
-/* ==================================================
-   ERRORS
-   ================================================== */
-
 .chat-error {
   flex-shrink: 0;
-
   margin: 10px 15px;
 }
 
 .chat-page-error {
   flex-shrink: 0;
-
   margin: 12px 15px;
 }
 
-/* ==================================================
-   MESSAGE LIST CONTAINER
-   ================================================== */
-
 .message-list-container {
   flex: 1;
-
-  min-width: 0;
-  min-height: 0;
-
-  overflow: hidden;
-
-  display: flex;
-  flex-direction: column;
-}
-
-/* ==================================================
-   OLDER MESSAGES
-   ================================================== */
+  min-width: 0;
+  min-height: 0;
+  overflow: hidden;
+  display: flex;
+  flex-direction: column;
+}
 
 .older-messages-bar {
   flex-shrink: 0;
-
   padding: 8px 12px;
-
   border-bottom: 1px solid var(--color-item-border);
-
   display: flex;
   justify-content: center;
   align-items: center;
-
   background: var(--color-surface);
 }
 
 .chat-secondary-button {
   min-height: 36px;
-
   padding: 7px 12px;
-
   border: 1px solid var(--color-control-border);
   border-radius: 6px;
-
   background: var(--color-surface);
   color: var(--color-text-strong);
-
   cursor: pointer;
-
   white-space: nowrap;
 }
 
@@ -364,53 +246,35 @@
   opacity: 0.6;
 }
 
-/* ==================================================
-   MESSAGE SCROLLER
-   ================================================== */
-
 .message-list {
   flex: 1;
-
-  min-width: 0;
-  min-height: 0;
-
+  min-width: 0;
+  min-height: 0;
   padding: 20px;
-
   overflow-y: auto;
   overflow-x: hidden;
-
-  display: flex;
-  flex-direction: column;
-
+  display: flex;
+  flex-direction: column;
   gap: 10px;
-
-  box-sizing: border-box;
-
+  box-sizing: border-box;
   overscroll-behavior: contain;
-
   scroll-behavior: smooth;
 }
 
 .message-list-loading {
   align-items: center;
   justify-content: center;
-
   color: var(--color-text-subtle);
 }
 
 .message-empty {
   flex: 1;
-
   min-height: 100%;
-
-  display: flex;
-  flex-direction: column;
-
+  display: flex;
+  flex-direction: column;
   align-items: center;
   justify-content: center;
-
   color: var(--color-text-subtle);
-
   text-align: center;
 }
 
@@ -418,25 +282,16 @@
   margin: 4px;
 }
 
-/* ==================================================
-   MESSAGE ROW
-   ================================================== */
-
 .message-row {
   display: flex;
-
   align-items: flex-end;
-
   gap: 8px;
-
   max-width: 75%;
-
   flex-shrink: 0;
 }
 
 .message-row-own {
   align-self: flex-end;
-
   justify-content: flex-end;
 }
 
@@ -444,53 +299,37 @@
   align-self: flex-start;
 }
 
-/* ==================================================
-   MESSAGE BUBBLE
-   ================================================== */
-
 .message-bubble {
   min-width: 50px;
-
   max-width: 100%;
-
   padding: 9px 12px;
-
   border-radius: 12px;
-
   box-sizing: border-box;
 }
 
 .message-bubble p {
   margin: 0;
-
   white-space: pre-wrap;
-
   overflow-wrap: anywhere;
-
   word-break: break-word;
 }
 
 .message-bubble span {
   display: block;
-
   margin-top: 5px;
-
   font-size: 10px;
-
   text-align: right;
 }
 
 .message-bubble-own {
   background: var(--color-primary);
   color: var(--color-on-primary);
-
   border-bottom-right-radius: 4px;
 }
 
 .message-bubble-other {
   background: var(--color-selected);
   color: var(--color-text);
-
   border-bottom-left-radius: 4px;
 }
 
@@ -502,41 +341,25 @@
   color: var(--color-text-subtle);
 }
 
-/* ==================================================
-   COMPOSER
-   ================================================== */
-
 .message-composer {
   flex-shrink: 0;
-
   border-top: 1px solid var(--color-item-border);
-
   padding: 12px;
-
   padding-bottom: max(12px, env(safe-area-inset-bottom));
-
-  display: flex;
-  flex-direction: column;
-
+  display: flex;
+  flex-direction: column;
   gap: 8px;
-
-  box-sizing: border-box;
-
+  box-sizing: border-box;
   background: var(--color-surface);
 }
 
 .message-composer textarea {
   box-sizing: border-box;
-
   resize: vertical;
-
   min-height: 50px;
   max-height: 150px;
-
   padding: 10px;
-
   border-radius: 7px;
-
 }
 
 .message-composer textarea:focus {
@@ -545,49 +368,35 @@
 
 .message-composer-footer {
   display: flex;
-
   align-items: center;
   justify-content: space-between;
-
   gap: 10px;
 }
 
 .message-composer-footer span {
   color: var(--color-text-muted);
-
   font-size: 12px;
 }
 
 .message-composer-footer button {
   flex-shrink: 0;
-
   min-height: 40px;
-
   padding: 8px 18px;
-
   border: none;
   border-radius: 6px;
-
   background: var(--color-primary);
   color: var(--color-on-primary);
-
   cursor: pointer;
-
   font-weight: 600;
 }
 
 .message-composer-footer button:disabled {
   opacity: 0.5;
 }
-
-/* ==================================================
-   TABLET
-   ================================================== */
 
 @media (max-width: 800px) {
   .messages-page {
     height: calc(100dvh - var(--navbar-height));
-
     padding: 10px;
   }
 
@@ -622,20 +431,14 @@
   }
 }
 
-/* ==================================================
-   PHONE
-   ================================================== */
-
 @media (max-width: 600px) {
   .messages-page {
     height: calc(100dvh - var(--navbar-height));
-
     padding: 0;
   }
 
   .messages-card {
     border-radius: 0;
-
     box-shadow: none;
   }
 
@@ -645,15 +448,12 @@
 
   .conversation-item {
     min-height: 68px;
-
     padding: 11px 12px;
   }
 
   .chat-header {
     min-height: 64px;
-
     padding: 10px 12px;
-
     gap: 10px;
   }
 
@@ -668,7 +468,6 @@
 
   .message-list {
     padding: 12px;
-
     gap: 8px;
   }
 
@@ -699,10 +498,6 @@
   }
 }
 
-/* ==================================================
-   VERY SMALL PHONES
-   ================================================== */
-
 @media (max-width: 380px) {
   .message-list {
     padding: 10px;
@@ -730,3 +525,15 @@
     padding-right: 14px;
   }
 }
+
+.conversation-item:focus-visible {
+  outline-offset: -3px;
+}
+
+.conversation-item-active {
+  box-shadow: inset 3px 0 var(--color-primary);
+}
+
+.message-bubble span {
+  font-size: 12px;
+}
```

## src/styles/friends.module.css

Renamed. Scoped feature styles, retaining current layouts and adding the phase-specific visual refinements.

Replaces `src/styles/friends.css`. Remove that old path.

### Full current content

```css
.friend-action-section {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-light);
  display: flex;
  justify-content: center;
}

.friend-action-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.friend-action-button {
  min-height: 40px;
  padding: 9px 16px;
  border: 1px solid var(--color-control-border);
  border-radius: 7px;
  background: var(--color-surface);
  font-weight: 600;
}

.friend-action-button.primary {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-color: var(--color-primary);
}

.friend-action-button.secondary {
  background: var(--color-surface);
  color: var(--color-text-strong);
}

.friend-action-button.danger {
  color: var(--color-danger);
  border-color: #d8a7a3;
  background: var(--color-surface);
}

.friend-action-button:disabled {
  opacity: 0.6;
}

.friend-status-label {
  font-weight: 600;
  color: var(--color-success);
}

.friendship-loading {
  margin: 0;
  color: var(--color-text-secondary);
}

.friends-page, .friend-requests-page {
  max-width: 900px;
}

.friends-list, .friend-request-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.friend-card, .friend-request-card {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 14px;
  border: 1px solid var(--color-item-border);
  border-radius: 10px;
  background: var(--color-surface);
}

.friend-card-main, .friend-request-main {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  text-decoration: none;
  color: inherit;
}

.friend-card-info, .friend-request-info {
  min-width: 0;
}

.friend-card-info h3, .friend-request-info h3 {
  margin: 0 0 5px;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.friend-card-info p, .friend-request-info p {
  margin: 0 0 5px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.friend-card-status {
  font-size: 13px;
  color: var(--color-text-subtle);
}

.friend-remove-button {
  flex-shrink: 0;
  min-height: 40px;
  padding: 8px 13px;
  border: 1px solid var(--color-control-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-danger);
  font-weight: 600;
}

.friend-remove-button:disabled {
  opacity: 0.6;
}

.friends-empty {
  padding: 40px 20px;
}

.request-section {
  margin-top: 30px;
}

.request-section:first-of-type {
  margin-top: 10px;
}

.request-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.request-section-header h2 {
  margin: 0;
}

.request-section-header span {
  min-width: 24px;
  height: 24px;
  padding: 0 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--color-border-light);
  font-size: 13px;
  font-weight: 600;
}

.friend-request-info span {
  color: var(--color-text-muted);
  font-size: 12px;
}

.friend-request-actions {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
}

.friend-request-sent-label {
  flex-shrink: 0;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 600;
}

.request-empty {
  margin: 0;
  padding: 18px;
  border: 1px dashed var(--color-control-border);
  border-radius: 8px;
  color: var(--color-text-secondary);
}

@media (max-width: 700px) {
  .friends-page, .friend-requests-page {
    padding: 20px 12px;
  }

  .friends-card, .friend-requests-card {
    padding: 18px;
  }

  .friends-header {
    align-items: flex-start;
    flex-direction: column;
    margin-bottom: 20px;
  }

  .friends-header h1 {
    font-size: 24px;
  }

  .friend-card, .friend-request-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .friend-card-main, .friend-request-main {
    width: 100%;
  }

  .friend-remove-button {
    width: 100%;
  }

  .friend-request-actions {
    width: 100%;
  }

  .friend-request-actions .friend-action-button {
    flex: 1;
  }

  .friend-action-group {
    width: 100%;
  }

  .friend-action-group .friend-action-button {
    flex: 1;
  }
}

@media (max-width: 380px) {
  .friends-card, .friend-requests-card {
    padding: 15px;
  }

  .friend-action-group {
    flex-direction: column;
  }

  .friend-action-group .friend-action-button {
    width: 100%;
  }
}

.friend-card-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.friend-message-button {
  min-height: 40px;
  padding: 8px 13px;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.friend-card-actions {
  flex-wrap: wrap;
}

@media (max-width: 700px) {
  .friend-card-actions {
    width: 100%;
  }

  .friend-card-actions > button {
    flex: 1;
  }
}
```

### Changes (+ added / - removed)

```diff
--- before/src/styles/friends.css
+++ after/src/styles/friends.module.css
@@ -1,13 +1,7 @@
-/* ==================================================
-   FRIEND ACTIONS
-   ================================================== */
-
 .friend-action-section {
   margin-top: 25px;
   padding-top: 20px;
-
   border-top: 1px solid var(--color-border-light);
-
   display: flex;
   justify-content: center;
 }
@@ -16,22 +10,16 @@
   display: flex;
   align-items: center;
   justify-content: center;
-
   gap: 10px;
-
   flex-wrap: wrap;
 }
 
 .friend-action-button {
   min-height: 40px;
-
   padding: 9px 16px;
-
   border: 1px solid var(--color-control-border);
   border-radius: 7px;
-
-  background: var(--color-surface);
-
+  background: var(--color-surface);
   font-weight: 600;
 }
 
@@ -66,78 +54,53 @@
   color: var(--color-text-secondary);
 }
 
-/* ==================================================
-   FRIENDS PAGE
-   ================================================== */
-
-.friends-page,
-.friend-requests-page {
+.friends-page, .friend-requests-page {
   max-width: 900px;
-
-}
-
-.friends-list,
-.friend-request-list {
+}
+
+.friends-list, .friend-request-list {
   display: flex;
   flex-direction: column;
-
   gap: 12px;
 }
 
-.friend-card,
-.friend-request-card {
+.friend-card, .friend-request-card {
   min-width: 0;
-
   display: flex;
   align-items: center;
   justify-content: space-between;
-
   gap: 15px;
-
   padding: 14px;
-
   border: 1px solid var(--color-item-border);
   border-radius: 10px;
-
-  background: var(--color-surface);
-}
-
-.friend-card-main,
-.friend-request-main {
+  background: var(--color-surface);
+}
+
+.friend-card-main, .friend-request-main {
   min-width: 0;
   flex: 1;
-
-  display: flex;
-  align-items: center;
-
+  display: flex;
+  align-items: center;
   gap: 14px;
-
   text-decoration: none;
   color: inherit;
 }
 
-.friend-card-info,
-.friend-request-info {
+.friend-card-info, .friend-request-info {
   min-width: 0;
 }
 
-.friend-card-info h3,
-.friend-request-info h3 {
+.friend-card-info h3, .friend-request-info h3 {
   margin: 0 0 5px;
-
   font-size: 16px;
-
   overflow: hidden;
   text-overflow: ellipsis;
   white-space: nowrap;
 }
 
-.friend-card-info p,
-.friend-request-info p {
+.friend-card-info p, .friend-request-info p {
   margin: 0 0 5px;
-
-  color: var(--color-text-secondary);
-
+  color: var(--color-text-secondary);
   white-space: nowrap;
   overflow: hidden;
   text-overflow: ellipsis;
@@ -150,17 +113,12 @@
 
 .friend-remove-button {
   flex-shrink: 0;
-
   min-height: 40px;
-
   padding: 8px 13px;
-
   border: 1px solid var(--color-control-border);
   border-radius: 6px;
-
   background: var(--color-surface);
   color: var(--color-danger);
-
   font-weight: 600;
 }
 
@@ -170,12 +128,7 @@
 
 .friends-empty {
   padding: 40px 20px;
-
-}
-
-/* ==================================================
-   FRIEND REQUESTS
-   ================================================== */
+}
 
 .request-section {
   margin-top: 30px;
@@ -188,9 +141,7 @@
 .request-section-header {
   display: flex;
   align-items: center;
-
   gap: 10px;
-
   margin-bottom: 12px;
 }
 
@@ -201,17 +152,12 @@
 .request-section-header span {
   min-width: 24px;
   height: 24px;
-
   padding: 0 7px;
-
   display: inline-flex;
   align-items: center;
   justify-content: center;
-
   border-radius: 12px;
-
   background: var(--color-border-light);
-
   font-size: 13px;
   font-weight: 600;
 }
@@ -223,51 +169,37 @@
 
 .friend-request-actions {
   flex-shrink: 0;
-
-  display: flex;
-
+  display: flex;
   gap: 8px;
 }
 
 .friend-request-sent-label {
   flex-shrink: 0;
-
-  color: var(--color-text-secondary);
-
+  color: var(--color-text-secondary);
   font-size: 14px;
   font-weight: 600;
 }
 
 .request-empty {
   margin: 0;
-
   padding: 18px;
-
   border: 1px dashed var(--color-control-border);
   border-radius: 8px;
-
-  color: var(--color-text-secondary);
-}
-
-/* ==================================================
-   MOBILE
-   ================================================== */
+  color: var(--color-text-secondary);
+}
 
 @media (max-width: 700px) {
-  .friends-page,
-  .friend-requests-page {
+  .friends-page, .friend-requests-page {
     padding: 20px 12px;
   }
 
-  .friends-card,
-  .friend-requests-card {
+  .friends-card, .friend-requests-card {
     padding: 18px;
   }
 
   .friends-header {
     align-items: flex-start;
     flex-direction: column;
-
     margin-bottom: 20px;
   }
 
@@ -275,14 +207,12 @@
     font-size: 24px;
   }
 
-  .friend-card,
-  .friend-request-card {
+  .friend-card, .friend-request-card {
     align-items: flex-start;
     flex-direction: column;
   }
 
-  .friend-card-main,
-  .friend-request-main {
+  .friend-card-main, .friend-request-main {
     width: 100%;
   }
 
@@ -308,8 +238,7 @@
 }
 
 @media (max-width: 380px) {
-  .friends-card,
-  .friend-requests-card {
+  .friends-card, .friend-requests-card {
     padding: 15px;
   }
 
@@ -322,27 +251,32 @@
   }
 }
 
-/* ==================================================
-   FRIEND CARD MESSAGE BUTTON
-   ================================================== */
-
 .friend-card-actions {
   flex-shrink: 0;
-
-  display: flex;
-  align-items: center;
-
+  display: flex;
+  align-items: center;
   gap: 8px;
 }
 
 .friend-message-button {
   min-height: 40px;
-
   padding: 8px 13px;
-
   border: 1px solid var(--color-primary);
   border-radius: 6px;
-
   background: var(--color-primary);
   color: var(--color-on-primary);
 }
+
+.friend-card-actions {
+  flex-wrap: wrap;
+}
+
+@media (max-width: 700px) {
+  .friend-card-actions {
+    width: 100%;
+  }
+
+  .friend-card-actions > button {
+    flex: 1;
+  }
+}
```

## src/styles/home.module.css

Added. Scoped feature styles, retaining current layouts and adding the phase-specific visual refinements.

### Full current content

```css
.home-page {
  max-width: 1000px;
}

.welcome-section {
  padding: 25px;
  margin-bottom: 25px;
}

.welcome-section h1 {
  margin-top: 0;
  margin-bottom: 12px;
  line-height: 1.2;
}

.welcome-section p {
  margin: 6px 0;
  color: var(--color-text-secondary);
}

@media (max-width: 700px) {
  .home-page {
    padding: 20px 12px;
  }

  .welcome-section {
    padding: 20px;
    border-radius: var(--radius-lg);
  }

  .welcome-section h1 {
    font-size: 24px;
  }
}

@media (max-width: 380px) {
  .welcome-section {
    padding: 16px;
  }

  .welcome-section h1 {
    font-size: 22px;
  }
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/styles/home.module.css
@@ -0,0 +1,44 @@
+.home-page {
+  max-width: 1000px;
+}
+
+.welcome-section {
+  padding: 25px;
+  margin-bottom: 25px;
+}
+
+.welcome-section h1 {
+  margin-top: 0;
+  margin-bottom: 12px;
+  line-height: 1.2;
+}
+
+.welcome-section p {
+  margin: 6px 0;
+  color: var(--color-text-secondary);
+}
+
+@media (max-width: 700px) {
+  .home-page {
+    padding: 20px 12px;
+  }
+
+  .welcome-section {
+    padding: 20px;
+    border-radius: var(--radius-lg);
+  }
+
+  .welcome-section h1 {
+    font-size: 24px;
+  }
+}
+
+@media (max-width: 380px) {
+  .welcome-section {
+    padding: 16px;
+  }
+
+  .welcome-section h1 {
+    font-size: 22px;
+  }
+}
```

## src/styles/navbar.module.css

Added. Scoped feature styles, retaining current layouts and adding the phase-specific visual refinements.

### Full current content

```css
.navbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  width: 100%;
  min-height: var(--navbar-height);
  padding: 0 30px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@media (max-width: 900px) {
  .navbar {
    min-height: var(--navbar-height);
    padding: 0 12px;
  }
}

.navbar-left {
  min-width: 0;
  display: flex;
  align-items: center;
}

.navbar-brand {
  color: var(--color-text);
  text-decoration: none;
  font-size: 22px;
  font-weight: 700;
  white-space: nowrap;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.navbar-link {
  position: relative;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  color: var(--color-text-strong);
  text-decoration: none;
  white-space: nowrap;
  font-size: 14px;
}

.navbar-link:hover {
  text-decoration: underline;
}

.navbar-user {
  max-width: 160px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.navbar-logout {
  min-height: 40px;
  padding: 8px 14px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 600;
  transition: background var(--transition-fast);
}

.navbar-logout:hover {
  background: var(--color-primary-hover);
}

.navbar-menu-toggle {
  display: none;
  width: 42px;
  height: 42px;
  padding: 9px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.navbar-menu-toggle span {
  width: 20px;
  height: 2px;
  border-radius: 2px;
  background: var(--color-text);
}

.navbar-mobile-menu {
  display: none;
}

@media (max-width: 900px) {
  .navbar-brand {
    font-size: 20px;
  }

  .navbar-right {
    display: none;
  }

  .navbar-menu-toggle {
    display: flex;
  }

  .navbar-mobile-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - var(--navbar-height));
    overflow-y: auto;
    padding: 8px 12px 16px;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    box-shadow: var(--shadow-menu);
    visibility: hidden;
    opacity: 0;
    transform: translateY(-8px);
    pointer-events: none;
    transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s ease;
  }

  .navbar-mobile-menu.open {
    visibility: visible;
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .navbar-mobile-user {
    display: flex;
    flex-direction: column;
    padding: 14px 12px;
    margin-bottom: 4px;
    border-bottom: 1px solid var(--color-border-light);
  }

  .navbar-mobile-user-name {
    font-weight: 700;
  }

  .navbar-mobile-user-email {
    margin-top: 3px;
    color: var(--color-text-secondary);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .navbar-mobile-link {
    min-height: 46px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    border-radius: var(--radius-md);
    color: var(--color-text);
    text-decoration: none;
    font-size: 15px;
    font-weight: 500;
  }

  .navbar-mobile-link:active {
    background: var(--color-hover);
  }

  .navbar-mobile-logout {
    width: 100%;
    min-height: 46px;
    margin-top: 8px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--color-primary);
    color: var(--color-on-primary);
    font-weight: 600;
  }
}

.notification-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 19px;
  height: 19px;
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 10px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 11px;
  font-weight: 700;
  vertical-align: middle;
}

.navbar-link {
  padding: 0 6px;
  border-radius: var(--radius-sm);
}

.navbar-link.active, .navbar-mobile-link.active {
  background: var(--color-selected);
  font-weight: 700;
}

.navbar-menu-toggle {
  width: 44px;
  height: 44px;
}

.navbar-right {
  gap: 12px;
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/styles/navbar.module.css
@@ -0,0 +1,228 @@
+.navbar {
+  position: sticky;
+  top: 0;
+  z-index: 1000;
+  width: 100%;
+  min-height: var(--navbar-height);
+  padding: 0 30px;
+  background: var(--color-surface);
+  border-bottom: 1px solid var(--color-border);
+  display: flex;
+  align-items: center;
+  justify-content: space-between;
+}
+
+@media (max-width: 900px) {
+  .navbar {
+    min-height: var(--navbar-height);
+    padding: 0 12px;
+  }
+}
+
+.navbar-left {
+  min-width: 0;
+  display: flex;
+  align-items: center;
+}
+
+.navbar-brand {
+  color: var(--color-text);
+  text-decoration: none;
+  font-size: 22px;
+  font-weight: 700;
+  white-space: nowrap;
+}
+
+.navbar-right {
+  display: flex;
+  align-items: center;
+  gap: 20px;
+}
+
+.navbar-link {
+  position: relative;
+  min-height: 40px;
+  display: inline-flex;
+  align-items: center;
+  color: var(--color-text-strong);
+  text-decoration: none;
+  white-space: nowrap;
+  font-size: 14px;
+}
+
+.navbar-link:hover {
+  text-decoration: underline;
+}
+
+.navbar-user {
+  max-width: 160px;
+  font-weight: 600;
+  white-space: nowrap;
+  overflow: hidden;
+  text-overflow: ellipsis;
+}
+
+.navbar-logout {
+  min-height: 40px;
+  padding: 8px 14px;
+  border: none;
+  border-radius: var(--radius-sm);
+  background: var(--color-primary);
+  color: var(--color-on-primary);
+  font-weight: 600;
+  transition: background var(--transition-fast);
+}
+
+.navbar-logout:hover {
+  background: var(--color-primary-hover);
+}
+
+.navbar-menu-toggle {
+  display: none;
+  width: 42px;
+  height: 42px;
+  padding: 9px;
+  border: 1px solid var(--color-border);
+  border-radius: var(--radius-md);
+  background: var(--color-surface);
+  flex-direction: column;
+  align-items: center;
+  justify-content: center;
+  gap: 4px;
+}
+
+.navbar-menu-toggle span {
+  width: 20px;
+  height: 2px;
+  border-radius: 2px;
+  background: var(--color-text);
+}
+
+.navbar-mobile-menu {
+  display: none;
+}
+
+@media (max-width: 900px) {
+  .navbar-brand {
+    font-size: 20px;
+  }
+
+  .navbar-right {
+    display: none;
+  }
+
+  .navbar-menu-toggle {
+    display: flex;
+  }
+
+  .navbar-mobile-menu {
+    position: absolute;
+    top: 100%;
+    left: 0;
+    right: 0;
+    display: flex;
+    flex-direction: column;
+    max-height: calc(100dvh - var(--navbar-height));
+    overflow-y: auto;
+    padding: 8px 12px 16px;
+    background: var(--color-surface);
+    border-bottom: 1px solid var(--color-border);
+    box-shadow: var(--shadow-menu);
+    visibility: hidden;
+    opacity: 0;
+    transform: translateY(-8px);
+    pointer-events: none;
+    transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s ease;
+  }
+
+  .navbar-mobile-menu.open {
+    visibility: visible;
+    opacity: 1;
+    transform: translateY(0);
+    pointer-events: auto;
+  }
+
+  .navbar-mobile-user {
+    display: flex;
+    flex-direction: column;
+    padding: 14px 12px;
+    margin-bottom: 4px;
+    border-bottom: 1px solid var(--color-border-light);
+  }
+
+  .navbar-mobile-user-name {
+    font-weight: 700;
+  }
+
+  .navbar-mobile-user-email {
+    margin-top: 3px;
+    color: var(--color-text-secondary);
+    font-size: 13px;
+    overflow: hidden;
+    text-overflow: ellipsis;
+    white-space: nowrap;
+  }
+
+  .navbar-mobile-link {
+    min-height: 46px;
+    display: flex;
+    align-items: center;
+    justify-content: space-between;
+    padding: 0 12px;
+    border-radius: var(--radius-md);
+    color: var(--color-text);
+    text-decoration: none;
+    font-size: 15px;
+    font-weight: 500;
+  }
+
+  .navbar-mobile-link:active {
+    background: var(--color-hover);
+  }
+
+  .navbar-mobile-logout {
+    width: 100%;
+    min-height: 46px;
+    margin-top: 8px;
+    border: none;
+    border-radius: var(--radius-md);
+    background: var(--color-primary);
+    color: var(--color-on-primary);
+    font-weight: 600;
+  }
+}
+
+.notification-badge {
+  display: inline-flex;
+  align-items: center;
+  justify-content: center;
+  min-width: 19px;
+  height: 19px;
+  margin-left: 6px;
+  padding: 0 5px;
+  border-radius: 10px;
+  background: var(--color-primary);
+  color: var(--color-on-primary);
+  font-size: 11px;
+  font-weight: 700;
+  vertical-align: middle;
+}
+
+.navbar-link {
+  padding: 0 6px;
+  border-radius: var(--radius-sm);
+}
+
+.navbar-link.active, .navbar-mobile-link.active {
+  background: var(--color-selected);
+  font-weight: 700;
+}
+
+.navbar-menu-toggle {
+  width: 44px;
+  height: 44px;
+}
+
+.navbar-right {
+  gap: 12px;
+}
```

## src/styles/notifications.module.css

Renamed. Scoped feature styles, retaining current layouts and adding the phase-specific visual refinements.

Replaces `src/styles/notifications.css`. Remove that old path.

### Full current content

```css
.notifications-page {
  max-width: 900px;
}

.notifications-mark-all {
  flex-shrink: 0;
  min-height: 40px;
  padding: 9px 14px;
  border: 1px solid var(--color-control-border);
  border-radius: 7px;
  background: var(--color-surface);
  color: var(--color-text-strong);
  font-weight: 600;
}

.notifications-mark-all:disabled {
  opacity: 0.6;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification-item {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--color-item-border);
  border-radius: 10px;
  transition: background 0.15s ease;
}

.notification-unread {
  background: #fafafa;
}

.notification-read {
  background: var(--color-surface);
}

.notification-indicator {
  width: 10px;
  flex-shrink: 0;
  padding-top: 6px;
}

.notification-unread-dot {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
}

.notification-content {
  min-width: 0;
  flex: 1;
}

.notification-message {
  margin: 0 0 8px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.notification-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  color: var(--color-text-subtle);
  font-size: 13px;
}

.notification-type {
  padding: 2px 7px;
  border-radius: 10px;
  background: var(--color-border-light);
  color: var(--color-outline);
  font-size: 11px;
  font-weight: 600;
}

.notification-read-button {
  flex-shrink: 0;
  min-height: 38px;
  padding: 7px 10px;
  border: 1px solid var(--color-control-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text-strong);
  font-size: 13px;
}

.notification-read-button:disabled {
  opacity: 0.6;
}

.notifications-empty {
  padding: 45px 20px;
}

.notification-pagination {
  margin-top: 25px;
}

@media (max-width: 700px) {
  .notifications-page {
    padding: 20px 12px;
  }

  .notifications-card {
    padding: 18px;
  }

  .notifications-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .notifications-header h1 {
    font-size: 24px;
  }

  .notifications-mark-all {
    width: 100%;
  }

  .notification-item {
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr);
  }

  .notification-read-button {
    grid-column: 2;
    width: 100%;
  }

  .notification-pagination {
    gap: 12px;
  }

  .notification-pagination button {
    min-width: 90px;
  }
}

@media (max-width: 380px) {
  .notifications-card {
    padding: 15px;
  }
}
```

### Changes (+ added / - removed)

```diff
--- before/src/styles/notifications.css
+++ after/src/styles/notifications.module.css
@@ -1,25 +1,15 @@
-/* ==================================================
-   NOTIFICATIONS PAGE
-   ================================================== */
-
 .notifications-page {
   max-width: 900px;
-
 }
 
 .notifications-mark-all {
   flex-shrink: 0;
-
   min-height: 40px;
-
   padding: 9px 14px;
-
   border: 1px solid var(--color-control-border);
   border-radius: 7px;
-
   background: var(--color-surface);
   color: var(--color-text-strong);
-
   font-weight: 600;
 }
 
@@ -27,30 +17,20 @@
   opacity: 0.6;
 }
 
-/* ==================================================
-   LIST
-   ================================================== */
-
 .notification-list {
   display: flex;
   flex-direction: column;
-
   gap: 10px;
 }
 
 .notification-item {
   min-width: 0;
-
   display: flex;
   align-items: flex-start;
-
   gap: 12px;
-
   padding: 16px;
-
   border: 1px solid var(--color-item-border);
   border-radius: 10px;
-
   transition: background 0.15s ease;
 }
 
@@ -64,20 +44,15 @@
 
 .notification-indicator {
   width: 10px;
-
   flex-shrink: 0;
-
   padding-top: 6px;
 }
 
 .notification-unread-dot {
   display: block;
-
   width: 8px;
   height: 8px;
-
   border-radius: 50%;
-
   background: var(--color-primary);
 }
 
@@ -88,50 +63,36 @@
 
 .notification-message {
   margin: 0 0 8px;
-
   line-height: 1.45;
-
   overflow-wrap: anywhere;
 }
 
 .notification-meta {
   display: flex;
   align-items: center;
-
   gap: 10px;
-
   flex-wrap: wrap;
-
   color: var(--color-text-subtle);
-
   font-size: 13px;
 }
 
 .notification-type {
   padding: 2px 7px;
-
   border-radius: 10px;
-
   background: var(--color-border-light);
   color: var(--color-outline);
-
   font-size: 11px;
   font-weight: 600;
 }
 
 .notification-read-button {
   flex-shrink: 0;
-
   min-height: 38px;
-
   padding: 7px 10px;
-
   border: 1px solid var(--color-control-border);
   border-radius: 6px;
-
   background: var(--color-surface);
   color: var(--color-text-strong);
-
   font-size: 13px;
 }
 
@@ -139,53 +100,13 @@
   opacity: 0.6;
 }
 
-/* ==================================================
-   EMPTY STATE
-   ================================================== */
-
 .notifications-empty {
   padding: 45px 20px;
-
 }
-
-/* ==================================================
-   PAGINATION
-   ================================================== */
 
 .notification-pagination {
   margin-top: 25px;
 }
-
-/* ==================================================
-   NAVBAR BADGE
-   ================================================== */
-
-.notification-badge {
-  display: inline-flex;
-
-  align-items: center;
-  justify-content: center;
-
-  min-width: 19px;
-  height: 19px;
-
-  margin-left: 6px;
-  padding: 0 5px;
-
-  border-radius: 10px;
-
-  background: var(--color-primary);
-  color: var(--color-on-primary);
-
-  font-size: 11px;
-  font-weight: 700;
-
-  vertical-align: middle;
-}
-
-/* ==================================================
-   MOBILE
-   ================================================== */
 
 @media (max-width: 700px) {
   .notifications-page {
@@ -211,13 +132,11 @@
 
   .notification-item {
     display: grid;
-
     grid-template-columns: 10px minmax(0, 1fr);
   }
 
   .notification-read-button {
     grid-column: 2;
-
     width: 100%;
   }
 
```

## src/styles/profile.module.css

Added. Scoped feature styles, retaining current layouts and adding the phase-specific visual refinements.

### Full current content

```css
.profile-page {
  max-width: 700px;
}

.profile-card h1 {
  margin-top: 0;
  margin-bottom: 20px;
}

.profile-image-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  margin: 25px 0;
}

.profile-image {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 50%;
}

.profile-image-section button {
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid var(--color-control-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  font-weight: 600;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-form button {
  width: 100%;
  min-height: 44px;
  margin-top: 10px;
  padding: 11px;
  border: none;
  border-radius: 7px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 600;
}

.profile-form button:disabled {
  opacity: 0.6;
}

.character-count {
  text-align: right;
  font-size: 12px;
  color: var(--color-text-subtle);
}

.profile-details {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-light);
  color: var(--color-outline);
}

.profile-details p {
  margin: 8px 0;
}

.back-link {
  display: inline-block;
  margin-bottom: 20px;
  color: var(--color-text-strong);
  text-decoration: none;
  font-weight: 600;
}

.back-link:hover {
  text-decoration: underline;
}

.user-profile-card {
  max-width: 700px;
  margin: 0 auto;
}

.user-profile-info {
  text-align: center;
}

.user-profile-info h1 {
  margin: 0 0 10px;
}

.user-profile-bio {
  color: var(--color-outline);
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 700px) {
  .profile-page {
    padding: 20px 12px;
  }

  .profile-card {
    padding: 20px;
    border-radius: var(--radius-lg);
  }

  .profile-page {
    padding-top: 20px;
  }

  .profile-card {
    width: 100%;
  }
}

@media (max-width: 380px) {
  .profile-card {
    padding: 16px;
  }
}

.profile-form {
  gap: 16px;
}

.profile-form textarea {
  resize: vertical;
  min-height: 120px;
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/styles/profile.module.css
@@ -0,0 +1,136 @@
+.profile-page {
+  max-width: 700px;
+}
+
+.profile-card h1 {
+  margin-top: 0;
+  margin-bottom: 20px;
+}
+
+.profile-image-section {
+  display: flex;
+  flex-direction: column;
+  align-items: center;
+  gap: 15px;
+  margin: 25px 0;
+}
+
+.profile-image {
+  width: 120px;
+  height: 120px;
+  object-fit: cover;
+  border-radius: 50%;
+}
+
+.profile-image-section button {
+  min-height: 40px;
+  padding: 8px 14px;
+  border: 1px solid var(--color-control-border);
+  border-radius: var(--radius-sm);
+  background: var(--color-surface);
+  font-weight: 600;
+}
+
+.profile-form {
+  display: flex;
+  flex-direction: column;
+  gap: 10px;
+}
+
+.profile-form button {
+  width: 100%;
+  min-height: 44px;
+  margin-top: 10px;
+  padding: 11px;
+  border: none;
+  border-radius: 7px;
+  background: var(--color-primary);
+  color: var(--color-on-primary);
+  font-weight: 600;
+}
+
+.profile-form button:disabled {
+  opacity: 0.6;
+}
+
+.character-count {
+  text-align: right;
+  font-size: 12px;
+  color: var(--color-text-subtle);
+}
+
+.profile-details {
+  margin-top: 25px;
+  padding-top: 20px;
+  border-top: 1px solid var(--color-border-light);
+  color: var(--color-outline);
+}
+
+.profile-details p {
+  margin: 8px 0;
+}
+
+.back-link {
+  display: inline-block;
+  margin-bottom: 20px;
+  color: var(--color-text-strong);
+  text-decoration: none;
+  font-weight: 600;
+}
+
+.back-link:hover {
+  text-decoration: underline;
+}
+
+.user-profile-card {
+  max-width: 700px;
+  margin: 0 auto;
+}
+
+.user-profile-info {
+  text-align: center;
+}
+
+.user-profile-info h1 {
+  margin: 0 0 10px;
+}
+
+.user-profile-bio {
+  color: var(--color-outline);
+  margin: 0;
+  line-height: 1.5;
+}
+
+@media (max-width: 700px) {
+  .profile-page {
+    padding: 20px 12px;
+  }
+
+  .profile-card {
+    padding: 20px;
+    border-radius: var(--radius-lg);
+  }
+
+  .profile-page {
+    padding-top: 20px;
+  }
+
+  .profile-card {
+    width: 100%;
+  }
+}
+
+@media (max-width: 380px) {
+  .profile-card {
+    padding: 16px;
+  }
+}
+
+.profile-form {
+  gap: 16px;
+}
+
+.profile-form textarea {
+  resize: vertical;
+  min-height: 120px;
+}
```

## src/styles/shared.css

Updated. Keep shared pagination/header chrome; remove field overrides now owned by FormField.

### Full current content

```css
/* Compatibility selectors allow incremental adoption without rewriting forms. */
.search-input,
.message-composer textarea {
  width: 100%;
  border: 1px solid var(--color-control-border);

}

.friends-header,
.notifications-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 25px;
}

.friends-header h1,
.notifications-header h1 {
  margin: 0 0 6px;
}

.friends-header p,
.notifications-header p {
  margin: 0;
  color: var(--color-text-secondary);
}

.pagination,
.notification-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.pagination button,
.notification-pagination button {
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid var(--color-control-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.pagination button:disabled,
.notification-pagination button:disabled {
  opacity: 0.5;
}

.friends-empty,
.notifications-empty {
  text-align: center;
  border: 1px dashed var(--color-control-border);
  border-radius: var(--radius-lg);
}

.friends-empty h2,
.notifications-empty h2 {
  margin: 0 0 8px;
}

.friends-empty p,
.notifications-empty p {
  margin: 0;
  color: var(--color-text-secondary);
}
```

### Changes (+ added / - removed)

```diff
--- before/src/styles/shared.css
+++ after/src/styles/shared.css
@@ -1,12 +1,9 @@
 /* Compatibility selectors allow incremental adoption without rewriting forms. */
-.auth-card input,
 .search-input,
-.profile-form input,
-.profile-form textarea,
 .message-composer textarea {
   width: 100%;
   border: 1px solid var(--color-control-border);
-  outline: none;
+
 }
 
 .friends-header,
```

## src/styles/tokens.css

Updated. Shared focus/feedback colours and stronger muted text contrast.

### Full current content

```css
/* ==================================================
   DESIGN SYSTEM / GLOBAL
   ================================================== */

:root {
  --color-bg: #f5f6f8;
  --color-surface: #ffffff;

  --color-text: #222222;
  --color-text-secondary: #666666;
  --color-text-muted: #666666;

  --color-border: #e2e5e9;
  --color-border-light: #eeeeee;

  --color-primary: #222222;
  --color-primary-hover: #111111;

  --color-danger: #b3261e;
  --color-success: #2e7d32;

  --color-hover: #f7f7f7;
  --color-selected: #f0f1f3;
  --color-disabled: #f2f2f2;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;

  --shadow-card: 0 2px 10px rgba(0, 0, 0, 0.05);
  --shadow-menu: 0 8px 24px rgba(0, 0, 0, 0.1);

  --navbar-height: 64px;

  --page-padding-x: 20px;
  --page-padding-y: 35px;

  --transition-fast: 0.15s ease;
  /* Shared control colours; retain existing values during migration. */
  --color-control-border: #cccccc;
  --color-outline: #555555;
  --color-text-strong: #333333;
  --color-text-subtle: #777777;
  --color-item-border: #e5e5e5;
  --color-on-primary: #ffffff;
  --control-height: 44px;
  --color-focus: #2459a6;
  --color-danger-surface: #fff2f1;
  --color-success-surface: #edf7ee;
}


@media (max-width: 700px) {
:root {
--navbar-height: 56px;
}
}
```

### Changes (+ added / - removed)

```diff
--- before/src/styles/tokens.css
+++ after/src/styles/tokens.css
@@ -8,7 +8,7 @@
 
   --color-text: #222222;
   --color-text-secondary: #666666;
-  --color-text-muted: #888888;
+  --color-text-muted: #666666;
 
   --color-border: #e2e5e9;
   --color-border-light: #eeeeee;
@@ -45,5 +45,14 @@
   --color-item-border: #e5e5e5;
   --color-on-primary: #ffffff;
   --control-height: 44px;
+  --color-focus: #2459a6;
+  --color-danger-surface: #fff2f1;
+  --color-success-surface: #edf7ee;
 }
 
+
+@media (max-width: 700px) {
+:root {
+--navbar-height: 56px;
+}
+}
```

## src/styles/users.module.css

Added. Scoped feature styles, retaining current layouts and adding the phase-specific visual refinements.

### Full current content

```css


.user-search {
  background: var(--color-surface);
  padding: 25px;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 15px;
}

.section-header h2, .section-header h3 {
  margin: 0;
}

.search-input {
  min-height: 44px;
  padding: 11px 14px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.search-input:focus {
  border-color: var(--color-outline);
}

.search-status {
  color: var(--color-text-secondary);
}

.user-results {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 15px;
}

.user-card {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.user-card-info {
  min-width: 0;
}

.user-card-info h3 {
  margin: 0 0 5px;
  font-size: 16px;
}

.user-card-info p {
  margin: 0;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-avatar {
  flex-shrink: 0;
  object-fit: cover;
  border-radius: 50%;
}

.user-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dddddd;
  color: var(--color-text-strong);
  font-weight: 700;
}

.user-avatar.small {
  width: 36px;
  height: 36px;
  font-size: 14px;
}

.user-avatar.medium {
  width: 48px;
  height: 48px;
  font-size: 18px;
}

.user-avatar.large {
  width: 120px;
  height: 120px;
  font-size: 42px;
}

.recent-searches {
  margin-top: 30px;
}

.text-button {
  border: none;
  background: transparent;
  color: #444444;
  text-decoration: underline;
  padding: 6px 8px;
}

.pagination {
  margin-top: 20px;
}

@media (max-width: 700px) {


  .user-search {
    padding: 20px;
    border-radius: var(--radius-lg);
  }

  .section-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .pagination {
    gap: 12px;
  }

  .pagination button {
    min-width: 90px;
  }
}

@media (max-width: 380px) {
  .user-search {
    padding: 16px;
  }
}

@media (hover: hover) and (pointer: fine) {
  .user-card:hover {
    background: #f8f8f8;
    transform: translateY(-1px);
  }
}

.user-card:focus-visible {
  outline-offset: 3px;
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/styles/users.module.css
@@ -0,0 +1,162 @@
+
+
+.user-search {
+  background: var(--color-surface);
+  padding: 25px;
+  border-radius: var(--radius-xl);
+  box-shadow: var(--shadow-card);
+}
+
+.section-header {
+  display: flex;
+  align-items: center;
+  justify-content: space-between;
+  gap: 15px;
+  margin-bottom: 15px;
+}
+
+.section-header h2, .section-header h3 {
+  margin: 0;
+}
+
+.search-input {
+  min-height: 44px;
+  padding: 11px 14px;
+  border-radius: var(--radius-md);
+  background: var(--color-surface);
+}
+
+.search-input:focus {
+  border-color: var(--color-outline);
+}
+
+.search-status {
+  color: var(--color-text-secondary);
+}
+
+.user-results {
+  display: flex;
+  flex-direction: column;
+  gap: 10px;
+  margin-top: 15px;
+}
+
+.user-card {
+  min-width: 0;
+  display: flex;
+  align-items: center;
+  gap: 14px;
+  padding: 12px;
+  border: 1px solid var(--color-border);
+  border-radius: var(--radius-lg);
+  background: var(--color-surface);
+  cursor: pointer;
+  text-decoration: none;
+  color: inherit;
+  transition: background var(--transition-fast), transform var(--transition-fast);
+}
+
+.user-card-info {
+  min-width: 0;
+}
+
+.user-card-info h3 {
+  margin: 0 0 5px;
+  font-size: 16px;
+}
+
+.user-card-info p {
+  margin: 0;
+  color: var(--color-text-secondary);
+  white-space: nowrap;
+  overflow: hidden;
+  text-overflow: ellipsis;
+}
+
+.user-avatar {
+  flex-shrink: 0;
+  object-fit: cover;
+  border-radius: 50%;
+}
+
+.user-avatar-placeholder {
+  display: flex;
+  align-items: center;
+  justify-content: center;
+  background: #dddddd;
+  color: var(--color-text-strong);
+  font-weight: 700;
+}
+
+.user-avatar.small {
+  width: 36px;
+  height: 36px;
+  font-size: 14px;
+}
+
+.user-avatar.medium {
+  width: 48px;
+  height: 48px;
+  font-size: 18px;
+}
+
+.user-avatar.large {
+  width: 120px;
+  height: 120px;
+  font-size: 42px;
+}
+
+.recent-searches {
+  margin-top: 30px;
+}
+
+.text-button {
+  border: none;
+  background: transparent;
+  color: #444444;
+  text-decoration: underline;
+  padding: 6px 8px;
+}
+
+.pagination {
+  margin-top: 20px;
+}
+
+@media (max-width: 700px) {
+
+
+  .user-search {
+    padding: 20px;
+    border-radius: var(--radius-lg);
+  }
+
+  .section-header {
+    align-items: flex-start;
+    flex-direction: column;
+  }
+
+  .pagination {
+    gap: 12px;
+  }
+
+  .pagination button {
+    min-width: 90px;
+  }
+}
+
+@media (max-width: 380px) {
+  .user-search {
+    padding: 16px;
+  }
+}
+
+@media (hover: hover) and (pointer: fine) {
+  .user-card:hover {
+    background: #f8f8f8;
+    transform: translateY(-1px);
+  }
+}
+
+.user-card:focus-visible {
+  outline-offset: 3px;
+}
```

## src/utils/bindStyles.js

Added. Bind feature module classes while retaining existing DOM hooks used by tests/shared styles.

### Full current content

```javascript
/** Keep stable DOM hooks while feature declarations use collision-free module classes.
 * Unknown tokens belong to the shared foundation (for example pagination).
 */
export function bindStyles(...sheets) {
  return (value = "") => {
    const tokens = value.trim().split(/\s+/).filter(Boolean);
    const scoped = tokens.flatMap((token) => sheets.map((sheet) => sheet[token]).filter(Boolean));
    return [...new Set([...tokens, ...scoped])].join(" ");
  };
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/utils/bindStyles.js
@@ -0,0 +1,10 @@
+/** Keep stable DOM hooks while feature declarations use collision-free module classes.
+ * Unknown tokens belong to the shared foundation (for example pagination).
+ */
+export function bindStyles(...sheets) {
+  return (value = "") => {
+    const tokens = value.trim().split(/\s+/).filter(Boolean);
+    const scoped = tokens.flatMap((token) => sheets.map((sheet) => sheet[token]).filter(Boolean));
+    return [...new Set([...tokens, ...scoped])].join(" ");
+  };
+}
```

## tests/ui.browser.mjs

Added. Isolated responsive, form-payload and keyboard-navigation regression checks.

### Full current content

```javascript
// Isolated UI regression checks. HTTP and WebSocket traffic never reaches cloud services.
import { createServer } from "../node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

const origin = "http://127.0.0.1:41814";
process.env.VITE_API_BASE_URL = origin;
process.env.VITE_WS_URL = origin.replace("http", "ws") + "/ws";
const server = await createServer({
  root: fileURLToPath(new URL("..", import.meta.url)),
  server: { host: "127.0.0.1", port: 41814, strictPort: true },
});
const account = { id: 1, name: "Review User", email: "review@example.invalid", bio: "Profile fixture", profileImage: null };
const friend = { ...account, id: 2, name: "Sample Friend With A Longer Name", bio: "A longer biography to check wrapping on smaller screens." };
const errors = [];
const blocked = [];
const requests = [];
let browser;
const screenshots = process.env.UI_SCREENSHOT_DIR;
const token = "test." + Buffer.from(JSON.stringify({ sub: account.email, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64") + ".test";

async function pageFor(width, authenticated = false) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.on("pageerror", error => errors.push(error.message));
  if (authenticated) await page.addInitScript(({ account, token }) => {
    localStorage.setItem("frndbook_access_token", token);
    localStorage.setItem("frndbook_refresh_token", "fixture");
    localStorage.setItem("frndbook_user", JSON.stringify(account));
  }, { account, token });
  await page.route("**/*", route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) { blocked.push(url.origin); return route.abort(); }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (request.method() !== "GET") requests.push({ path: url.pathname, body: request.postDataJSON() });
    let body = [];
    if (url.pathname === "/api/auth/login") {
      return route.fulfill({ status: 401, json: { message: "Fixture login rejected" } });
    }
    if (url.pathname === "/api/users/me") body = account;
    else if (url.pathname === "/api/users/2") body = friend;
    else if (url.pathname === "/api/friends") body = [friend];
    else if (url.pathname.endsWith("/requests/received")) body = [{ id: 5, sender: friend }];
    else if (url.pathname.endsWith("/requests/sent")) body = [{ id: 6, receiver: friend }];
    else if (url.pathname.endsWith("unread-count")) body = 1;
    else if (url.pathname === "/api/notifications") body = {
      content: [{ id: 1, message: "Sample notification", type: "CHAT_MESSAGE", read: false }], totalPages: 2, number: 0,
    };
    else if (url.pathname === "/api/conversations") body = [{ id: 12, otherUser: friend, lastMessage: null }];
    else if (url.pathname.includes("/messages")) body = { content: [], last: true, totalElements: 0 };
    return route.fulfill({ json: body });
  });
  await page.routeWebSocket("**/*", socket => {
    if (!socket.url().startsWith(origin.replace("http", "ws"))) { socket.close(); return; }
    socket.onMessage(data => {
      if (/^(CONNECT|STOMP)/.test(String(data))) socket.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
    });
  });
  return page;
}

try {
  await server.listen();
  browser = await chromium.launch({ channel: "msedge", headless: true });
  if (screenshots) await mkdir(screenshots, { recursive: true });
  const publicPaths = ["/login", "/signup", "/forgot-password", "/reset-password?token=fixture", "/verify-email?email=review%40example.invalid"];
  const privatePaths = ["/", "/profile", "/users/2", "/friends", "/friend-requests", "/notifications", "/messages"];
  let screens = 0;
  for (const width of process.env.UI_INTERACTIONS_ONLY ? [] : [1280, 800, 390, 320]) {
    for (const path of [...publicPaths, ...privatePaths]) {
      const page = await pageFor(width, privatePaths.includes(path));
      await page.goto(origin + path);
      if (privatePaths.includes(path)) {
        await page.locator("nav").waitFor();
        assert.equal(await page.locator("nav").evaluate(el => getComputedStyle(el).display), "flex");
        assert.equal(await page.locator("nav").evaluate(el => getComputedStyle(el).position), "sticky");
      }
      if (path === "/messages") {
        await page.locator(".chat-header h2").waitFor({ state: "attached" });
        if (width <= 800) await page.locator(".conversation-item").first().click();
        await page.locator(".chat-header h2").waitFor();
      }
      if (path === "/friends") await page.locator(".friend-card").waitFor();
      await page.waitForTimeout(150);
      const badControls = await page.locator("input:not([hidden]), textarea").evaluateAll(elements => elements.filter(el =>
        !el.labels?.length && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby"),
      ).map(el => el.outerHTML));
      assert.deepEqual(badControls, [], `Unlabelled controls at ${width} ${path}`);
      const overflow = await page.locator("body").evaluate(body => [...body.querySelectorAll("main, .auth-card, nav, button, input, textarea")].filter(el => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (!rect.width || style.visibility === "hidden") return false;
        return rect.right > innerWidth + 1 || rect.left < -1;
      }).map(el => el.className));
      assert.deepEqual(overflow, [], `Horizontal overflow at ${width} ${path}`);
      if (screenshots && ["/login", "/profile", "/friends", "/messages", "/notifications"].includes(path)) {
        await page.screenshot({ path: `${screenshots}/${width}-${path.slice(1)}.png`, fullPage: true });
      }
      screens++;
      await page.close();
    }
  }

  // Labelled form controls still submit the original payload and expose server feedback.
  let page = await pageFor(390);
  await page.goto(origin + "/login");
  await page.getByLabel("Email", { exact: true }).fill("person@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Fixture login rejected" }).waitFor();
  assert.deepEqual(requests.find(r => r.path === "/api/auth/login").body, { email: "person@example.invalid", password: "password123" });
  if (screenshots) await page.screenshot({ path: `${screenshots}/login-error.png`, fullPage: true });
  await page.close();

  page = await pageFor(390);
  await page.goto(origin + "/verify-email?email=review%40example.invalid");
  assert.ok(await page.getByRole("button", { name: "Verify Email", exact: true }).isDisabled());
  const otp = page.getByLabel("Verification code", { exact: true });
  await otp.fill("12a");
  assert.equal(await otp.inputValue(), "12");
  await otp.fill("123456");
  assert.equal(await otp.inputValue(), "123456");
  assert.ok(await page.getByRole("button", { name: /Resend code in/ }).isDisabled());
  await page.getByRole("button", { name: "Verify Email", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Email verified successfully" }).waitFor();
  assert.deepEqual(requests.find(r => r.path === "/api/auth/verify-email").body, { email: "review@example.invalid", otp: "123456" });
  await page.close();

  // Disclosure navigation supports Escape, outside clicks, focus exit and active pages.
  page = await pageFor(390, true);
  await page.goto(origin + "/friends");
  const toggle = page.locator(".navbar-menu-toggle");
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  const menuId = await toggle.getAttribute("aria-controls");
  assert.ok(menuId);
  await page.locator(".navbar-mobile-menu a").first().focus();
  await page.keyboard.press("Escape");
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.ok(await toggle.evaluate(el => el === document.activeElement));
  await toggle.click();
  await page.mouse.click(380, 850);
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  await toggle.click();
  await page.locator(".friend-message-button").focus();
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  await toggle.click();
  const active = page.locator('.navbar-mobile-menu a[aria-current="page"]');
  await page.waitForFunction(() =>
    getComputedStyle(document.querySelector(".navbar-mobile-menu")).opacity === "1",
  );
  assert.equal(await active.innerText(), "Friends");
  if (screenshots) await page.screenshot({ path: `${screenshots}/mobile-menu.png`, fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(100);
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await skip.focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => document.activeElement.id), "main-content");
  await page.close();

  assert.deepEqual(errors, [], "Unexpected browser JavaScript errors");
  assert.deepEqual(blocked, [], "Unexpected external network attempts");
  console.log(`PASS: ${screens ? `${screens} responsive screens, control labels and overflow checks; ` : "interaction-only run; "}login/OTP payloads; feedback roles; keyboard/mobile navigation; no external traffic.`);
} finally {
  await browser?.close();
  await server.close();
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/tests/ui.browser.mjs
@@ -0,0 +1,171 @@
+// Isolated UI regression checks. HTTP and WebSocket traffic never reaches cloud services.
+import { createServer } from "../node_modules/vite/dist/node/index.js";
+import { fileURLToPath } from "node:url";
+import { mkdir } from "node:fs/promises";
+import assert from "node:assert/strict";
+const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
+
+const origin = "http://127.0.0.1:41814";
+process.env.VITE_API_BASE_URL = origin;
+process.env.VITE_WS_URL = origin.replace("http", "ws") + "/ws";
+const server = await createServer({
+  root: fileURLToPath(new URL("..", import.meta.url)),
+  server: { host: "127.0.0.1", port: 41814, strictPort: true },
+});
+const account = { id: 1, name: "Review User", email: "review@example.invalid", bio: "Profile fixture", profileImage: null };
+const friend = { ...account, id: 2, name: "Sample Friend With A Longer Name", bio: "A longer biography to check wrapping on smaller screens." };
+const errors = [];
+const blocked = [];
+const requests = [];
+let browser;
+const screenshots = process.env.UI_SCREENSHOT_DIR;
+const token = "test." + Buffer.from(JSON.stringify({ sub: account.email, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64") + ".test";
+
+async function pageFor(width, authenticated = false) {
+  const page = await browser.newPage({ viewport: { width, height: 900 } });
+  page.on("pageerror", error => errors.push(error.message));
+  if (authenticated) await page.addInitScript(({ account, token }) => {
+    localStorage.setItem("frndbook_access_token", token);
+    localStorage.setItem("frndbook_refresh_token", "fixture");
+    localStorage.setItem("frndbook_user", JSON.stringify(account));
+  }, { account, token });
+  await page.route("**/*", route => {
+    const request = route.request();
+    const url = new URL(request.url());
+    if (url.origin !== origin) { blocked.push(url.origin); return route.abort(); }
+    if (!url.pathname.startsWith("/api/")) return route.continue();
+    if (request.method() !== "GET") requests.push({ path: url.pathname, body: request.postDataJSON() });
+    let body = [];
+    if (url.pathname === "/api/auth/login") {
+      return route.fulfill({ status: 401, json: { message: "Fixture login rejected" } });
+    }
+    if (url.pathname === "/api/users/me") body = account;
+    else if (url.pathname === "/api/users/2") body = friend;
+    else if (url.pathname === "/api/friends") body = [friend];
+    else if (url.pathname.endsWith("/requests/received")) body = [{ id: 5, sender: friend }];
+    else if (url.pathname.endsWith("/requests/sent")) body = [{ id: 6, receiver: friend }];
+    else if (url.pathname.endsWith("unread-count")) body = 1;
+    else if (url.pathname === "/api/notifications") body = {
+      content: [{ id: 1, message: "Sample notification", type: "CHAT_MESSAGE", read: false }], totalPages: 2, number: 0,
+    };
+    else if (url.pathname === "/api/conversations") body = [{ id: 12, otherUser: friend, lastMessage: null }];
+    else if (url.pathname.includes("/messages")) body = { content: [], last: true, totalElements: 0 };
+    return route.fulfill({ json: body });
+  });
+  await page.routeWebSocket("**/*", socket => {
+    if (!socket.url().startsWith(origin.replace("http", "ws"))) { socket.close(); return; }
+    socket.onMessage(data => {
+      if (/^(CONNECT|STOMP)/.test(String(data))) socket.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
+    });
+  });
+  return page;
+}
+
+try {
+  await server.listen();
+  browser = await chromium.launch({ channel: "msedge", headless: true });
+  if (screenshots) await mkdir(screenshots, { recursive: true });
+  const publicPaths = ["/login", "/signup", "/forgot-password", "/reset-password?token=fixture", "/verify-email?email=review%40example.invalid"];
+  const privatePaths = ["/", "/profile", "/users/2", "/friends", "/friend-requests", "/notifications", "/messages"];
+  let screens = 0;
+  for (const width of process.env.UI_INTERACTIONS_ONLY ? [] : [1280, 800, 390, 320]) {
+    for (const path of [...publicPaths, ...privatePaths]) {
+      const page = await pageFor(width, privatePaths.includes(path));
+      await page.goto(origin + path);
+      if (privatePaths.includes(path)) {
+        await page.locator("nav").waitFor();
+        assert.equal(await page.locator("nav").evaluate(el => getComputedStyle(el).display), "flex");
+        assert.equal(await page.locator("nav").evaluate(el => getComputedStyle(el).position), "sticky");
+      }
+      if (path === "/messages") {
+        await page.locator(".chat-header h2").waitFor({ state: "attached" });
+        if (width <= 800) await page.locator(".conversation-item").first().click();
+        await page.locator(".chat-header h2").waitFor();
+      }
+      if (path === "/friends") await page.locator(".friend-card").waitFor();
+      await page.waitForTimeout(150);
+      const badControls = await page.locator("input:not([hidden]), textarea").evaluateAll(elements => elements.filter(el =>
+        !el.labels?.length && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby"),
+      ).map(el => el.outerHTML));
+      assert.deepEqual(badControls, [], `Unlabelled controls at ${width} ${path}`);
+      const overflow = await page.locator("body").evaluate(body => [...body.querySelectorAll("main, .auth-card, nav, button, input, textarea")].filter(el => {
+        const rect = el.getBoundingClientRect();
+        const style = getComputedStyle(el);
+        if (!rect.width || style.visibility === "hidden") return false;
+        return rect.right > innerWidth + 1 || rect.left < -1;
+      }).map(el => el.className));
+      assert.deepEqual(overflow, [], `Horizontal overflow at ${width} ${path}`);
+      if (screenshots && ["/login", "/profile", "/friends", "/messages", "/notifications"].includes(path)) {
+        await page.screenshot({ path: `${screenshots}/${width}-${path.slice(1)}.png`, fullPage: true });
+      }
+      screens++;
+      await page.close();
+    }
+  }
+
+  // Labelled form controls still submit the original payload and expose server feedback.
+  let page = await pageFor(390);
+  await page.goto(origin + "/login");
+  await page.getByLabel("Email", { exact: true }).fill("person@example.invalid");
+  await page.getByLabel("Password", { exact: true }).fill("password123");
+  await page.getByRole("button", { name: "Login", exact: true }).click();
+  await page.getByRole("alert").filter({ hasText: "Fixture login rejected" }).waitFor();
+  assert.deepEqual(requests.find(r => r.path === "/api/auth/login").body, { email: "person@example.invalid", password: "password123" });
+  if (screenshots) await page.screenshot({ path: `${screenshots}/login-error.png`, fullPage: true });
+  await page.close();
+
+  page = await pageFor(390);
+  await page.goto(origin + "/verify-email?email=review%40example.invalid");
+  assert.ok(await page.getByRole("button", { name: "Verify Email", exact: true }).isDisabled());
+  const otp = page.getByLabel("Verification code", { exact: true });
+  await otp.fill("12a");
+  assert.equal(await otp.inputValue(), "12");
+  await otp.fill("123456");
+  assert.equal(await otp.inputValue(), "123456");
+  assert.ok(await page.getByRole("button", { name: /Resend code in/ }).isDisabled());
+  await page.getByRole("button", { name: "Verify Email", exact: true }).click();
+  await page.getByRole("status").filter({ hasText: "Email verified successfully" }).waitFor();
+  assert.deepEqual(requests.find(r => r.path === "/api/auth/verify-email").body, { email: "review@example.invalid", otp: "123456" });
+  await page.close();
+
+  // Disclosure navigation supports Escape, outside clicks, focus exit and active pages.
+  page = await pageFor(390, true);
+  await page.goto(origin + "/friends");
+  const toggle = page.locator(".navbar-menu-toggle");
+  await toggle.click();
+  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
+  const menuId = await toggle.getAttribute("aria-controls");
+  assert.ok(menuId);
+  await page.locator(".navbar-mobile-menu a").first().focus();
+  await page.keyboard.press("Escape");
+  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
+  assert.ok(await toggle.evaluate(el => el === document.activeElement));
+  await toggle.click();
+  await page.mouse.click(380, 850);
+  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
+  await toggle.click();
+  await page.locator(".friend-message-button").focus();
+  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
+  await toggle.click();
+  const active = page.locator('.navbar-mobile-menu a[aria-current="page"]');
+  await page.waitForFunction(() =>
+    getComputedStyle(document.querySelector(".navbar-mobile-menu")).opacity === "1",
+  );
+  assert.equal(await active.innerText(), "Friends");
+  if (screenshots) await page.screenshot({ path: `${screenshots}/mobile-menu.png`, fullPage: true });
+  await page.setViewportSize({ width: 1280, height: 900 });
+  await page.waitForTimeout(100);
+  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
+  const skip = page.getByRole("link", { name: "Skip to content" });
+  await skip.focus();
+  await page.keyboard.press("Enter");
+  assert.equal(await page.evaluate(() => document.activeElement.id), "main-content");
+  await page.close();
+
+  assert.deepEqual(errors, [], "Unexpected browser JavaScript errors");
+  assert.deepEqual(blocked, [], "Unexpected external network attempts");
+  console.log(`PASS: ${screens ? `${screens} responsive screens, control labels and overflow checks; ` : "interaction-only run; "}login/OTP payloads; feedback roles; keyboard/mobile navigation; no external traffic.`);
+} finally {
+  await browser?.close();
+  await server.close();
+}
```

## vite.config.js

Updated. Compact generated CSS Module class names.

### Full current content

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      // Short scoped names keep feature isolation without shipping long selectors.
      generateScopedName: 'fb_[hash:base64:8]',
    },
  },
})
```

### Changes (+ added / - removed)

```diff
--- before/vite.config.js
+++ after/vite.config.js
@@ -4,4 +4,10 @@
 // https://vite.dev/config/
 export default defineConfig({
   plugins: [react()],
+  css: {
+    modules: {
+      // Short scoped names keep feature isolation without shipping long selectors.
+      generateScopedName: 'fb_[hash:base64:8]',
+    },
+  },
 })
```

