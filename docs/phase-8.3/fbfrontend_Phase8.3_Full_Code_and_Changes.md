# fbfrontend - Phase 8.3: Full code and changes

Paths are relative to the frontend root. Every changed current file is provided in full. Phase 8.2 is the baseline. New files have an empty before-version.

## src/api/messageApi.js

Updated. Forward optional AbortSignal for disposed history requests; existing endpoints and payloads retained.

### Full current content

```javascript
import axiosClient from "./axiosClient";

// ==================================================
// GET MESSAGE HISTORY
// ==================================================

export const getMessages = async (conversationId, page = 0, size = 20, signal) => {
  const response = await axiosClient.get(
    `/api/conversations/${conversationId}/messages`,
    {
      signal,
      params: {
        page,
        size,
      },
    },
  );

  return response.data;
};

// ==================================================
// SEND MESSAGE THROUGH REST
// ==================================================

export const sendMessage = async (conversationId, content) => {
  const response = await axiosClient.post(
    `/api/conversations/${conversationId}/messages`,
    {
      content,
    },
  );

  return response.data;
};

// ==================================================
// MARK CONVERSATION MESSAGES AS READ
// ==================================================

export const markMessagesAsRead = async (conversationId) => {
  const response = await axiosClient.patch(
    `/api/conversations/${conversationId}/messages/read`,
  );

  return response.data;
};
```

### Changes (+ added / - removed)

```diff
--- before/src/api/messageApi.js
+++ after/src/api/messageApi.js
@@ -4,10 +4,11 @@
 // GET MESSAGE HISTORY
 // ==================================================
 
-export const getMessages = async (conversationId, page = 0, size = 20) => {
+export const getMessages = async (conversationId, page = 0, size = 20, signal) => {
   const response = await axiosClient.get(
     `/api/conversations/${conversationId}/messages`,
     {
+      signal,
       params: {
         page,
         size,
```

## src/components/chat/ChatWindow.jsx

Updated. Wire session and live updates, recover after reconnect/focus, separate send/history feedback and isolate conversation lifetimes.

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
import { getMessages, markMessagesAsRead, sendMessage } from "../../api/messageApi";
import { createChatWebSocket } from "../../services/chatWebSocketService";
import { createMessageSession } from "../../services/messageSession";

const css = bindStyles(chatStyles);

const ConversationChat = ({ conversation, currentUserId, onMessageReceived, onBackToConversations }) => {
  const sectionRef = useRef(null);
  const sessionRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [state, setState] = useState({ messages: [], loading: true, syncing: false,
    loadingOlder: false, hasOlder: false, historyError: "", sendError: "" });
  const conversationId = conversation.id;

  useEffect(() => {
    let active = true;
    let resizeTimer;
    const visible = () => document.visibilityState === "visible" &&
      Boolean(sectionRef.current?.getClientRects().length);
    const session = createMessageSession({
      conversationId,
      fetchPage: (page, size, signal) => getMessages(conversationId, page, size, signal),
      saveMessage: (content) => sendMessage(conversationId, content),
      markRead: () => markMessagesAsRead(conversationId),
      isVisible: visible,
      onState: setState,
      onMessage: onMessageReceived,
    });
    sessionRef.current = session;
    void session.initialize();
    const socket = createChatWebSocket({
      conversationId,
      onMessage: session.receive,
      onConnect: () => {
        if (!active) return;
        setSocketConnected(true);
        void session.recover();
      },
      onDisconnect: () => { if (active) setSocketConnected(false); },
      onError: () => { if (active) setSocketConnected(false); },
    });
    socket?.connect();
    const resume = () => {
      if (visible()) { void session.recover(); session.requestRead(); }
    };
    const resize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resume, 200);
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("resize", resize);
    // A mobile conversation can become visible without a viewport resize.
    const observer = new ResizeObserver(() => { if (visible()) session.requestRead(); });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => {
      active = false;
      clearTimeout(resizeTimer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("resize", resize);
      session.dispose();
      sessionRef.current = null;
      void socket?.disconnect().catch(() => {});
    };
  }, [conversationId, currentUserId, onMessageReceived]);

  const otherUser = conversation.otherUser;

  return (
    <section ref={sectionRef} className={css("chat-window")}>
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
            {socketConnected ? (state.syncing ? "Syncing messages..." : "Connected") : "Live updates disconnected"}
          </span>
        </div>
      </header>

      {!socketConnected && (
        <p role="status" className={css("chat-status")}>
          You can still send messages. Live updates will resume when connected.
        </p>
      )}
      {state.historyError && (
        <div className={css("chat-recovery")}>
          <StatusMessage tone="error">{state.historyError}</StatusMessage>
          <button type="button" className={css("chat-secondary-button")}
            disabled={state.loading || state.syncing || state.loadingOlder}
            onClick={() => sessionRef.current?.recover()}>Retry loading messages</button>
        </div>
      )}
      {state.sendError && <StatusMessage tone="error" className={css("chat-error")}>{state.sendError}</StatusMessage>}

      <MessageList
        messages={state.messages}
        currentUserId={currentUserId}
        loading={state.loading && state.messages.length === 0}
        loadingOlder={state.loadingOlder}
        syncing={state.syncing}
        historyError={state.historyError}
        hasOlderMessages={state.hasOlder}
        onLoadOlder={() => sessionRef.current?.loadOlder()}
      />

      <MessageComposer onSend={(content) => sessionRef.current.send(content)} />
    </section>
  );
};


export default function ChatWindow(props) {
  if (!props.conversation) {
    return <section className={css("chat-window chat-window-empty")}>
      <p>Select a conversation to start chatting.</p>
    </section>;
  }
  // Switching account/conversation remounts history and composer together.
  return <ConversationChat key={`${props.currentUserId}:${props.conversation.id}`} {...props} />;
}
```

### Changes (+ added / - removed)

```diff
--- before/src/components/chat/ChatWindow.jsx
+++ after/src/components/chat/ChatWindow.jsx
@@ -3,282 +3,81 @@
 import StatusMessage from "../ui/StatusMessage";
 import { useEffect, useRef, useState } from "react";
 import { Link } from "react-router-dom";
-
 import UserAvatar from "../users/UserAvatar";
-
 import MessageList from "./MessageList";
 import MessageComposer from "./MessageComposer";
-
-import { getMessages, markMessagesAsRead } from "../../api/messageApi";
-
+import { getMessages, markMessagesAsRead, sendMessage } from "../../api/messageApi";
 import { createChatWebSocket } from "../../services/chatWebSocketService";
+import { createMessageSession } from "../../services/messageSession";
 
 const css = bindStyles(chatStyles);
 
-const PAGE_SIZE = 10;
-
-const ChatWindow = ({
-  conversation,
-  currentUserId,
-  onMessageReceived,
-  onBackToConversations,
-}) => {
-  const [messages, setMessages] = useState([]);
-
-  const [loading, setLoading] = useState(true);
-
-  const [loadingOlder, setLoadingOlder] = useState(false);
-
-  const [currentPage, setCurrentPage] = useState(0);
-
-  const [totalPages, setTotalPages] = useState(0);
-
+const ConversationChat = ({ conversation, currentUserId, onMessageReceived, onBackToConversations }) => {
+  const sectionRef = useRef(null);
+  const sessionRef = useRef(null);
   const [socketConnected, setSocketConnected] = useState(false);
-
-  const [error, setError] = useState("");
-
-  const webSocketRef = useRef(null);
-
-  const conversationId = conversation?.id;
-
-  // ==================================================
-  // LOAD INITIAL MESSAGES
-  // ==================================================
+  const [state, setState] = useState({ messages: [], loading: true, syncing: false,
+    loadingOlder: false, hasOlder: false, historyError: "", sendError: "" });
+  const conversationId = conversation.id;
 
   useEffect(() => {
-    if (!conversationId) {
-      return;
-    }
-
-    let cancelled = false;
-
-    const initializeChat = async () => {
-      try {
-        setLoading(true);
-        setError("");
-
-        setMessages([]);
-        setCurrentPage(0);
-        setTotalPages(0);
-        setSocketConnected(false);
-
-        const data = await getMessages(conversationId, 0, PAGE_SIZE);
-
-        if (cancelled) {
-          return;
-        }
-
-        const loadedMessages = [...(data?.content || [])].reverse();
-
-        setMessages(loadedMessages);
-
-        setCurrentPage(data?.number ?? 0);
-
-        setTotalPages(data?.totalPages ?? 0);
-
-        await markMessagesAsRead(conversationId);
-      } catch (error) {
-        if (!cancelled) {
-          console.error("Failed to initialize chat:", error);
-
-          setError(error.response?.data?.message || "Unable to load messages");
-        }
-      } finally {
-        if (!cancelled) {
-          setLoading(false);
-        }
-      }
+    let active = true;
+    let resizeTimer;
+    const visible = () => document.visibilityState === "visible" &&
+      Boolean(sectionRef.current?.getClientRects().length);
+    const session = createMessageSession({
+      conversationId,
+      fetchPage: (page, size, signal) => getMessages(conversationId, page, size, signal),
+      saveMessage: (content) => sendMessage(conversationId, content),
+      markRead: () => markMessagesAsRead(conversationId),
+      isVisible: visible,
+      onState: setState,
+      onMessage: onMessageReceived,
+    });
+    sessionRef.current = session;
+    void session.initialize();
+    const socket = createChatWebSocket({
+      conversationId,
+      onMessage: session.receive,
+      onConnect: () => {
+        if (!active) return;
+        setSocketConnected(true);
+        void session.recover();
+      },
+      onDisconnect: () => { if (active) setSocketConnected(false); },
+      onError: () => { if (active) setSocketConnected(false); },
+    });
+    socket?.connect();
+    const resume = () => {
+      if (visible()) { void session.recover(); session.requestRead(); }
     };
-
-    initializeChat();
-
+    const resize = () => {
+      clearTimeout(resizeTimer);
+      resizeTimer = setTimeout(resume, 200);
+    };
+    document.addEventListener("visibilitychange", resume);
+    window.addEventListener("focus", resume);
+    window.addEventListener("resize", resize);
+    // A mobile conversation can become visible without a viewport resize.
+    const observer = new ResizeObserver(() => { if (visible()) session.requestRead(); });
+    if (sectionRef.current) observer.observe(sectionRef.current);
     return () => {
-      cancelled = true;
-    };
-  }, [conversationId]);
-
-  // ==================================================
-  // WEBSOCKET
-  // ==================================================
-
-  useEffect(() => {
-    if (!conversationId) {
-      return;
-    }
-
-    let cancelled = false;
-
-    const webSocket = createChatWebSocket({
-      conversationId,
-
-      onMessage: async (message) => {
-        if (cancelled) {
-          return;
-        }
-
-        setMessages((currentMessages) => {
-          const exists = currentMessages.some(
-            (item) => String(item.id) === String(message.id),
-          );
-
-          if (exists) {
-            return currentMessages;
-          }
-
-          return [...currentMessages, message];
-        });
-
-        onMessageReceived?.(message);
-
-        if (String(message.sender?.id) !== String(currentUserId)) {
-          try {
-            await markMessagesAsRead(conversationId);
-          } catch (error) {
-            console.error("Failed to mark messages as read:", error);
-          }
-        }
-      },
-
-      onConnect: () => {
-        if (!cancelled) {
-          setSocketConnected(true);
-          setError("");
-        }
-      },
-
-      onDisconnect: () => {
-        if (!cancelled) {
-          setSocketConnected(false);
-        }
-      },
-
-      onError: (error) => {
-        if (!cancelled) {
-          console.error("Chat WebSocket error:", error);
-
-          setSocketConnected(false);
-        }
-      },
-    });
-
-    if (!webSocket) {
-      return;
-    }
-
-    webSocketRef.current = webSocket;
-
-    webSocket.connect();
-
-    return () => {
-      cancelled = true;
-
-      const currentWebSocket = webSocketRef.current;
-
-      webSocketRef.current = null;
-
-      if (currentWebSocket) {
-        currentWebSocket.disconnect().catch((error) => {
-          console.error("Failed to disconnect chat WebSocket:", error);
-        });
-      }
+      active = false;
+      clearTimeout(resizeTimer);
+      observer.disconnect();
+      document.removeEventListener("visibilitychange", resume);
+      window.removeEventListener("focus", resume);
+      window.removeEventListener("resize", resize);
+      session.dispose();
+      sessionRef.current = null;
+      void socket?.disconnect().catch(() => {});
     };
   }, [conversationId, currentUserId, onMessageReceived]);
-
-  // ==================================================
-  // LOAD OLDER MESSAGES
-  // ==================================================
-
-  const loadOlderMessages = async () => {
-    if (loadingOlder || currentPage >= totalPages - 1) {
-      return;
-    }
-
-    const nextPage = currentPage + 1;
-
-    try {
-      setLoadingOlder(true);
-      setError("");
-
-      const data = await getMessages(conversationId, nextPage, PAGE_SIZE);
-
-      const olderMessages = [...(data?.content || [])].reverse();
-
-      setMessages((currentMessages) => {
-        const existingIds = new Set(
-          currentMessages.map((message) => String(message.id)),
-        );
-
-        const uniqueOlderMessages = olderMessages.filter(
-          (message) => !existingIds.has(String(message.id)),
-        );
-
-        return [...uniqueOlderMessages, ...currentMessages];
-      });
-
-      setCurrentPage(data?.number ?? nextPage);
-
-      setTotalPages(data?.totalPages ?? totalPages);
-    } catch (error) {
-      console.error("Failed to load older messages:", error);
-
-      setError(
-        error.response?.data?.message || "Unable to load older messages",
-      );
-    } finally {
-      setLoadingOlder(false);
-    }
-  };
-
-  // ==================================================
-  // SEND MESSAGE
-  // ==================================================
-
-  const handleSendMessage = async (content) => {
-    setError("");
-
-    try {
-      if (webSocketRef.current && webSocketRef.current.isConnected()) {
-        webSocketRef.current.sendMessage(content);
-
-        return;
-      }
-
-      const { sendMessage } = await import("../../api/messageApi");
-
-      const savedMessage = await sendMessage(conversationId, content);
-
-      if (!savedMessage) {
-        return;
-      }
-    } catch (error) {
-      console.error("Failed to send message:", error);
-
-      setError(
-        error.response?.data?.message ||
-          error.message ||
-          "Unable to send message",
-      );
-
-      throw error;
-    }
-  };
-
-  // ==================================================
-  // NO CONVERSATION
-  // ==================================================
-
-  if (!conversation) {
-    return (
-      <section className={css("chat-window chat-window-empty")}>
-        <p>Select a conversation to start chatting.</p>
-      </section>
-    );
-  }
 
   const otherUser = conversation.otherUser;
 
   return (
-    <section className={css("chat-window")}>
+    <section ref={sectionRef} className={css("chat-window")}>
       <header className={css("chat-header")}>
         <button
           type="button"
@@ -312,25 +111,49 @@
                 : "chat-connection-status"
             )}
           >
-            {socketConnected ? "Connected" : "Connecting..."}
+            {socketConnected ? (state.syncing ? "Syncing messages..." : "Connected") : "Live updates disconnected"}
           </span>
         </div>
       </header>
 
-      {error && <StatusMessage tone="error" className={css("error chat-error")}>{error}</StatusMessage>}
+      {!socketConnected && (
+        <p role="status" className={css("chat-status")}>
+          You can still send messages. Live updates will resume when connected.
+        </p>
+      )}
+      {state.historyError && (
+        <div className={css("chat-recovery")}>
+          <StatusMessage tone="error">{state.historyError}</StatusMessage>
+          <button type="button" className={css("chat-secondary-button")}
+            disabled={state.loading || state.syncing || state.loadingOlder}
+            onClick={() => sessionRef.current?.recover()}>Retry loading messages</button>
+        </div>
+      )}
+      {state.sendError && <StatusMessage tone="error" className={css("chat-error")}>{state.sendError}</StatusMessage>}
 
       <MessageList
-        messages={messages}
+        messages={state.messages}
         currentUserId={currentUserId}
-        loading={loading}
-        loadingOlder={loadingOlder}
-        hasOlderMessages={currentPage < totalPages - 1}
-        onLoadOlder={loadOlderMessages}
+        loading={state.loading && state.messages.length === 0}
+        loadingOlder={state.loadingOlder}
+        syncing={state.syncing}
+        historyError={state.historyError}
+        hasOlderMessages={state.hasOlder}
+        onLoadOlder={() => sessionRef.current?.loadOlder()}
       />
 
-      <MessageComposer onSend={handleSendMessage} disabled={!conversationId} />
+      <MessageComposer onSend={(content) => sessionRef.current.send(content)} />
     </section>
   );
 };
 
-export default ChatWindow;
+
+export default function ChatWindow(props) {
+  if (!props.conversation) {
+    return <section className={css("chat-window chat-window-empty")}>
+      <p>Select a conversation to start chatting.</p>
+    </section>;
+  }
+  // Switching account/conversation remounts history and composer together.
+  return <ConversationChat key={`${props.currentUserId}:${props.conversation.id}`} {...props} />;
+}
```

## src/components/chat/MessageComposer.jsx

Updated. Guard repeated sends, retain failed or edited drafts and avoid IME Enter submission.

### Full current content

```jsx
import chatStyles from "../../styles/chat.module.css";
import { bindStyles } from "../../utils/bindStyles";
import { useEffect, useRef, useState } from "react";

const css = bindStyles(chatStyles);
const MAX_MESSAGE_LENGTH = 5000;

export default function MessageComposer({ onSend, disabled = false }) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);
  const revision = useRef(0);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const value = content.trim();
    if (!value || disabled || inFlight.current) return;
    inFlight.current = true;
    const submittedRevision = revision.current;
    setSending(true);
    try {
      await onSend(value);
      // Preserve edits made while waiting for the server acknowledgement.
      if (mounted.current && submittedRevision === revision.current) setContent("");
    } catch {
      // The chat shows the error; retain the draft for an explicit retry.
    } finally {
      inFlight.current = false;
      if (mounted.current) setSending(false);
    }
  };
  const handleKeyDown = (event) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };
  return (
    <form className={css("message-composer")} onSubmit={handleSubmit} aria-busy={sending}>
      <textarea aria-label="Message" value={content} maxLength={MAX_MESSAGE_LENGTH}
        rows={2} placeholder="Write a message..."
        onChange={(event) => { revision.current++; setContent(event.target.value); }}
        onKeyDown={handleKeyDown} disabled={disabled} />
      <div className={css("message-composer-footer")}>
        <span>{content.length}/{MAX_MESSAGE_LENGTH}</span>
        <button type="submit" disabled={disabled || sending || !content.trim()}>
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
```

### Changes (+ added / - removed)

```diff
--- before/src/components/chat/MessageComposer.jsx
+++ after/src/components/chat/MessageComposer.jsx
@@ -1,63 +1,55 @@
 import chatStyles from "../../styles/chat.module.css";
 import { bindStyles } from "../../utils/bindStyles";
-import { useState } from "react";
+import { useEffect, useRef, useState } from "react";
 
 const css = bindStyles(chatStyles);
-
 const MAX_MESSAGE_LENGTH = 5000;
 
-const MessageComposer = ({ onSend, disabled = false }) => {
+export default function MessageComposer({ onSend, disabled = false }) {
   const [content, setContent] = useState("");
+  const [sending, setSending] = useState(false);
+  const inFlight = useRef(false);
+  const revision = useRef(0);
+  const mounted = useRef(false);
+  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
 
   const handleSubmit = async (event) => {
     event.preventDefault();
-
-    const trimmedContent = content.trim();
-
-    if (!trimmedContent || disabled) {
-      return;
-    }
-
+    const value = content.trim();
+    if (!value || disabled || inFlight.current) return;
+    inFlight.current = true;
+    const submittedRevision = revision.current;
+    setSending(true);
     try {
-      await onSend(trimmedContent);
-
-      setContent("");
+      await onSend(value);
+      // Preserve edits made while waiting for the server acknowledgement.
+      if (mounted.current && submittedRevision === revision.current) setContent("");
     } catch {
-      // Parent handles the error.
+      // The chat shows the error; retain the draft for an explicit retry.
+    } finally {
+      inFlight.current = false;
+      if (mounted.current) setSending(false);
     }
   };
-
   const handleKeyDown = (event) => {
+    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
     if (event.key === "Enter" && !event.shiftKey) {
       event.preventDefault();
-
       event.currentTarget.form?.requestSubmit();
     }
   };
-
   return (
-    <form className={css("message-composer")} onSubmit={handleSubmit}>
-      <textarea aria-label="Message"
-        value={content}
-        maxLength={MAX_MESSAGE_LENGTH}
-        rows={2}
-        placeholder="Write a message..."
-        onChange={(event) => setContent(event.target.value)}
-        onKeyDown={handleKeyDown}
-        disabled={disabled}
-      />
-
+    <form className={css("message-composer")} onSubmit={handleSubmit} aria-busy={sending}>
+      <textarea aria-label="Message" value={content} maxLength={MAX_MESSAGE_LENGTH}
+        rows={2} placeholder="Write a message..."
+        onChange={(event) => { revision.current++; setContent(event.target.value); }}
+        onKeyDown={handleKeyDown} disabled={disabled} />
       <div className={css("message-composer-footer")}>
-        <span>
-          {content.length}/{MAX_MESSAGE_LENGTH}
-        </span>
-
-        <button type="submit" disabled={disabled || !content.trim()}>
-          Send
+        <span>{content.length}/{MAX_MESSAGE_LENGTH}</span>
+        <button type="submit" disabled={disabled || sending || !content.trim()}>
+          {sending ? "Sending..." : "Send"}
         </button>
       </div>
     </form>
   );
-};
-
-export default MessageComposer;
+}
```

## src/components/chat/MessageList.jsx

Updated. Preserve older-history scroll position and distinguish failed history from an empty conversation.

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
  syncing = false,
  historyError = "",
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
    if (loadingOlder && preserveScrollRef.current) return;
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
            disabled={loadingOlder || syncing}
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
            <p>{historyError ? "Message history is unavailable. Please retry above." : "No messages yet."}</p>
            {!historyError && <p>Say hello 👋</p>}
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
@@ -11,6 +11,8 @@
   currentUserId,
   loading,
   loadingOlder,
+  syncing = false,
+  historyError = "",
   hasOlderMessages,
   onLoadOlder,
 }) => {
@@ -91,6 +93,7 @@
      * Keep the same message in approximately the same
      * visual position instead of jumping to the bottom.
      */
+    if (loadingOlder && preserveScrollRef.current) return;
     if (!loadingOlder && preserveScrollRef.current) {
       const previousScroll = preserveScrollRef.current;
 
@@ -177,7 +180,7 @@
             type="button"
             className={css("chat-secondary-button")}
             onClick={handleLoadOlder}
-            disabled={loadingOlder}
+            disabled={loadingOlder || syncing}
           >
             {loadingOlder
               ? "Loading older messages..."
@@ -193,8 +196,8 @@
       >
         {messages.length === 0 && (
           <div className={css("message-empty")}>
-            <p>No messages yet.</p>
-            <p>Say hello 👋</p>
+            <p>{historyError ? "Message history is unavailable. Please retry above." : "No messages yet."}</p>
+            {!historyError && <p>Say hello 👋</p>}
           </div>
         )}
 
```

## src/services/messageSession.js

Added. Own asynchronous history, recovery, acknowledged sends and visibility-gated read requests for one conversation lifetime.

### Full current content

```javascript
import { compareMessages, lastPage, mergeMessages } from "../utils/messageHistory.js";

export const MESSAGE_PAGE_SIZE = 10;
const MAX_SCAN_PAGES = 1000;

/** One lifetime per account/conversation. Dependencies make async races testable. */
export function createMessageSession({ conversationId, fetchPage, saveMessage, markRead,
  isVisible = () => true, onState, onMessage }) {
  let alive = true;
  let initialized = false;
  let anchor = null;
  let olderPage = 0;
  let historyFlight = null;
  let recoverQueued = false;
  let sendFlight = false;
  let readTimer = null;
  let reading = false;
  let readAgain = false;
  const abort = new AbortController();
  let state = { messages: [], loading: true, syncing: false, loadingOlder: false,
    hasOlder: false, historyError: "", sendError: "" };

  const update = (patch) => {
    if (!alive) return;
    state = { ...state, ...patch };
    onState(state);
  };
  const accept = (messages) => {
    if (!alive) return;
    update({ messages: mergeMessages(state.messages, messages, conversationId) });
  };
  const requestRead = () => {
    if (!alive || !initialized || !isVisible()) return;
    if (reading) { readAgain = true; return; }
    if (readTimer) return;
    readTimer = setTimeout(async () => {
      readTimer = null;
      if (!alive || !isVisible()) return;
      reading = true;
      try { await markRead(); } catch { /* Read failure must not hide delivered messages. */ }
      finally {
        reading = false;
        if (readAgain) { readAgain = false; requestRead(); }
      }
    }, 100);
  };
  const load = async (page) => {
    const data = await fetchPage(page, MESSAGE_PAGE_SIZE, abort.signal);
    if (!data || !Array.isArray(data.content)) throw new Error("Invalid message history response");
    return data;
  };
  const runHistory = (kind) => {
    if (!alive) return Promise.resolve();
    if (historyFlight) {
      if (kind !== "older") recoverQueued = true;
      return historyFlight;
    }
    const initial = !initialized;
    update({ historyError: "", loading: initial, syncing: !initial && kind !== "older", loadingOlder: kind === "older" });
    historyFlight = (async () => {
      try {
        if (initial) {
          const data = await load(0);
          if (!alive) return;
          accept(data.content);
          anchor = mergeMessages([], data.content, conversationId).at(-1) || null;
          olderPage = 0;
          initialized = true;
          update({ hasOlder: !lastPage(data, 0, MESSAGE_PAGE_SIZE) });
        } else {
          const oldest = state.messages[0];
          const boundary = kind === "older" ? oldest : anchor;
          let nextAnchor = null;
          let page = kind === "older" ? Math.max(0, olderPage - 1) : 0;
          let complete = false;
          for (let count = 0; count < MAX_SCAN_PAGES && alive; count++, page++) {
            const data = await load(page);
            if (!alive) return;
            const incoming = mergeMessages([], data.content, conversationId);
            if (kind !== "older" && page === 0) nextAnchor = incoming.at(-1) || anchor;
            accept(incoming);
            const end = lastPage(data, page, MESSAGE_PAGE_SIZE);
            const reached = kind === "older"
              ? incoming.some(message => !boundary || compareMessages(message, boundary) < 0)
              : incoming.some(message => boundary && String(message.id) === String(boundary.id));
            if (reached || end) {
              if (kind === "older") {
                olderPage = page;
                update({ hasOlder: !end });
              } else {
                anchor = nextAnchor;
                if (end) update({ hasOlder: false });
                else if (!oldest) update({ hasOlder: true });
              }
              complete = true;
              break;
            }
          }
          if (alive && !complete) throw new Error("History is too large to synchronize in one pass. Reopen this conversation to load recent messages.");
        }
        if (alive) {
          const latest = state.messages.at(-1);
          if (latest) onMessage?.(latest);
          requestRead();
        }
      } catch (error) {
        if (alive) update({ historyError: error.response?.data?.message || error.message || "Unable to load messages" });
      } finally {
        historyFlight = null;
        if (alive) {
          update({ loading: false, syncing: false, loadingOlder: false });
          if (recoverQueued) { recoverQueued = false; void runHistory("recover"); }
        }
      }
    })();
    return historyFlight;
  };

  return {
    initialize: () => runHistory("initial"),
    recover: () => runHistory("recover"),
    loadOlder: () => state.hasOlder ? runHistory("older") : Promise.resolve(),
    requestRead,
    receive(message) {
      if (!alive || message?.id == null || String(message.conversationId) !== String(conversationId)) return;
      accept([message]);
      onMessage?.(message);
      requestRead();
    },
    async send(content) {
      if (!alive || sendFlight) throw new Error("A message is already being sent");
      sendFlight = true;
      update({ sendError: "" });
      try {
        // REST provides a persistence acknowledgement. WebSocket remains live delivery.
        const saved = await saveMessage(content);
        if (saved?.id == null || String(saved.conversationId) !== String(conversationId)) {
          throw new Error("The server did not confirm this message");
        }
        if (alive) { accept([saved]); onMessage?.(saved); }
        return saved;
      } catch (error) {
        update({ sendError: error.response?.data?.message ||
          "Send could not be confirmed. Your text was kept. Check recent messages before retrying." });
        throw error;
      } finally { sendFlight = false; }
    },
    dispose() {
      alive = false;
      abort.abort();
      clearTimeout(readTimer);
    },
  };
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/services/messageSession.js
@@ -0,0 +1,154 @@
+import { compareMessages, lastPage, mergeMessages } from "../utils/messageHistory.js";
+
+export const MESSAGE_PAGE_SIZE = 10;
+const MAX_SCAN_PAGES = 1000;
+
+/** One lifetime per account/conversation. Dependencies make async races testable. */
+export function createMessageSession({ conversationId, fetchPage, saveMessage, markRead,
+  isVisible = () => true, onState, onMessage }) {
+  let alive = true;
+  let initialized = false;
+  let anchor = null;
+  let olderPage = 0;
+  let historyFlight = null;
+  let recoverQueued = false;
+  let sendFlight = false;
+  let readTimer = null;
+  let reading = false;
+  let readAgain = false;
+  const abort = new AbortController();
+  let state = { messages: [], loading: true, syncing: false, loadingOlder: false,
+    hasOlder: false, historyError: "", sendError: "" };
+
+  const update = (patch) => {
+    if (!alive) return;
+    state = { ...state, ...patch };
+    onState(state);
+  };
+  const accept = (messages) => {
+    if (!alive) return;
+    update({ messages: mergeMessages(state.messages, messages, conversationId) });
+  };
+  const requestRead = () => {
+    if (!alive || !initialized || !isVisible()) return;
+    if (reading) { readAgain = true; return; }
+    if (readTimer) return;
+    readTimer = setTimeout(async () => {
+      readTimer = null;
+      if (!alive || !isVisible()) return;
+      reading = true;
+      try { await markRead(); } catch { /* Read failure must not hide delivered messages. */ }
+      finally {
+        reading = false;
+        if (readAgain) { readAgain = false; requestRead(); }
+      }
+    }, 100);
+  };
+  const load = async (page) => {
+    const data = await fetchPage(page, MESSAGE_PAGE_SIZE, abort.signal);
+    if (!data || !Array.isArray(data.content)) throw new Error("Invalid message history response");
+    return data;
+  };
+  const runHistory = (kind) => {
+    if (!alive) return Promise.resolve();
+    if (historyFlight) {
+      if (kind !== "older") recoverQueued = true;
+      return historyFlight;
+    }
+    const initial = !initialized;
+    update({ historyError: "", loading: initial, syncing: !initial && kind !== "older", loadingOlder: kind === "older" });
+    historyFlight = (async () => {
+      try {
+        if (initial) {
+          const data = await load(0);
+          if (!alive) return;
+          accept(data.content);
+          anchor = mergeMessages([], data.content, conversationId).at(-1) || null;
+          olderPage = 0;
+          initialized = true;
+          update({ hasOlder: !lastPage(data, 0, MESSAGE_PAGE_SIZE) });
+        } else {
+          const oldest = state.messages[0];
+          const boundary = kind === "older" ? oldest : anchor;
+          let nextAnchor = null;
+          let page = kind === "older" ? Math.max(0, olderPage - 1) : 0;
+          let complete = false;
+          for (let count = 0; count < MAX_SCAN_PAGES && alive; count++, page++) {
+            const data = await load(page);
+            if (!alive) return;
+            const incoming = mergeMessages([], data.content, conversationId);
+            if (kind !== "older" && page === 0) nextAnchor = incoming.at(-1) || anchor;
+            accept(incoming);
+            const end = lastPage(data, page, MESSAGE_PAGE_SIZE);
+            const reached = kind === "older"
+              ? incoming.some(message => !boundary || compareMessages(message, boundary) < 0)
+              : incoming.some(message => boundary && String(message.id) === String(boundary.id));
+            if (reached || end) {
+              if (kind === "older") {
+                olderPage = page;
+                update({ hasOlder: !end });
+              } else {
+                anchor = nextAnchor;
+                if (end) update({ hasOlder: false });
+                else if (!oldest) update({ hasOlder: true });
+              }
+              complete = true;
+              break;
+            }
+          }
+          if (alive && !complete) throw new Error("History is too large to synchronize in one pass. Reopen this conversation to load recent messages.");
+        }
+        if (alive) {
+          const latest = state.messages.at(-1);
+          if (latest) onMessage?.(latest);
+          requestRead();
+        }
+      } catch (error) {
+        if (alive) update({ historyError: error.response?.data?.message || error.message || "Unable to load messages" });
+      } finally {
+        historyFlight = null;
+        if (alive) {
+          update({ loading: false, syncing: false, loadingOlder: false });
+          if (recoverQueued) { recoverQueued = false; void runHistory("recover"); }
+        }
+      }
+    })();
+    return historyFlight;
+  };
+
+  return {
+    initialize: () => runHistory("initial"),
+    recover: () => runHistory("recover"),
+    loadOlder: () => state.hasOlder ? runHistory("older") : Promise.resolve(),
+    requestRead,
+    receive(message) {
+      if (!alive || message?.id == null || String(message.conversationId) !== String(conversationId)) return;
+      accept([message]);
+      onMessage?.(message);
+      requestRead();
+    },
+    async send(content) {
+      if (!alive || sendFlight) throw new Error("A message is already being sent");
+      sendFlight = true;
+      update({ sendError: "" });
+      try {
+        // REST provides a persistence acknowledgement. WebSocket remains live delivery.
+        const saved = await saveMessage(content);
+        if (saved?.id == null || String(saved.conversationId) !== String(conversationId)) {
+          throw new Error("The server did not confirm this message");
+        }
+        if (alive) { accept([saved]); onMessage?.(saved); }
+        return saved;
+      } catch (error) {
+        update({ sendError: error.response?.data?.message ||
+          "Send could not be confirmed. Your text was kept. Check recent messages before retrying." });
+        throw error;
+      } finally { sendFlight = false; }
+    },
+    dispose() {
+      alive = false;
+      abort.abort();
+      clearTimeout(readTimer);
+    },
+  };
+}
```

## src/styles/chat.module.css

Updated. Add compact spacing for history retry feedback.

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

.chat-recovery {
  padding: 8px 12px;
  flex-shrink: 0;
}
```

### Changes (+ added / - removed)

```diff
--- before/src/styles/chat.module.css
+++ after/src/styles/chat.module.css
@@ -537,3 +537,8 @@
 .message-bubble span {
   font-size: 12px;
 }
+
+.chat-recovery {
+  padding: 8px 12px;
+  flex-shrink: 0;
+}
```

## src/utils/messageHistory.js

Added. Merge by message ID, preserve read state, filter conversations and sort deterministic timestamp ties.

### Full current content

```javascript
export const compareMessages = (a, b) => {
  const time = (Date.parse(a.createdAt || "") || 0) - (Date.parse(b.createdAt || "") || 0);
  if (time) return time;
  const first = String(a.id), second = String(b.id);
  return /^\d+$/.test(first) && /^\d+$/.test(second)
    ? first.length - second.length || first.localeCompare(second)
    : first.localeCompare(second);
};

/** History, REST acknowledgements and live echoes share one identity. */
export function mergeMessages(current, incoming, conversationId) {
  const rows = new Map();
  for (const message of [...current, ...incoming]) {
    if (message?.id == null || String(message.conversationId) !== String(conversationId)) continue;
    const id = String(message.id);
    const existing = rows.get(id);
    rows.set(id, { ...message, ...existing, read: Boolean(existing?.read || message.read) });
  }
  return [...rows.values()].sort(compareMessages);
}

export const lastPage = (data, page, size) => data.last === true ||
  (Number.isInteger(data.totalPages) && page >= data.totalPages - 1) ||
  (data.content?.length || 0) < size;
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/utils/messageHistory.js
@@ -0,0 +1,24 @@
+export const compareMessages = (a, b) => {
+  const time = (Date.parse(a.createdAt || "") || 0) - (Date.parse(b.createdAt || "") || 0);
+  if (time) return time;
+  const first = String(a.id), second = String(b.id);
+  return /^\d+$/.test(first) && /^\d+$/.test(second)
+    ? first.length - second.length || first.localeCompare(second)
+    : first.localeCompare(second);
+};
+
+/** History, REST acknowledgements and live echoes share one identity. */
+export function mergeMessages(current, incoming, conversationId) {
+  const rows = new Map();
+  for (const message of [...current, ...incoming]) {
+    if (message?.id == null || String(message.conversationId) !== String(conversationId)) continue;
+    const id = String(message.id);
+    const existing = rows.get(id);
+    rows.set(id, { ...message, ...existing, read: Boolean(existing?.read || message.read) });
+  }
+  return [...rows.values()].sort(compareMessages);
+}
+
+export const lastPage = (data, page, size) => data.last === true ||
+  (Number.isInteger(data.totalPages) && page >= data.totalPages - 1) ||
+  (data.content?.length || 0) < size;
```

## tests/chat.browser.mjs

Added. Mocked browser regression for actual chat behaviour, disconnect recovery and draft isolation.

### Full current content

```javascript
import { createServer } from "../node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = "http://127.0.0.1:41815";
process.env.VITE_API_BASE_URL = origin;
process.env.VITE_WS_URL = origin.replace("http", "ws") + "/ws";
const server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)),
  server: { host: "127.0.0.1", port: 41815, strictPort: true } });
const user = id => ({ id, name: `U${id}`, email: `u${id}@example.invalid` });
const message = (id, content, conversationId = 12) => ({ id, content, conversationId,
  sender: user(1), createdAt: "2026-09-14T10:00:00", read: false });
const rows = new Map([[12, Array.from({ length: 20 }, (_, i) => message(i + 1, `history-${i + 1}`))],
  [23, [message(101, "other-conversation", 23)]]]);
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
const initial = deferred(); let initialHeld = true;
let postGate = null, olderGate = null, rejectSend = false, echo = true;
let posts = 0, olderRequested = false;
const subscriptions = [], errors = [], external = [];
const until = async (condition) => {
  for (let i = 0; i < 400; i++) { if (condition()) return; await new Promise(resolve => setTimeout(resolve, 25)); }
  throw new Error("Timed out waiting for fixture event");
};
const deliver = row => {
  for (const sub of subscriptions.filter(s => !s.closed && s.destination === `/topic/conversations/${row.conversationId}`)) {
    sub.socket.send(`MESSAGE\nsubscription:${sub.id}\nmessage-id:${row.id}\ndestination:${sub.destination}\ncontent-type:application/json\n\n${JSON.stringify(row)}\0`);
  }
};
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(account => {
    const payload = btoa(JSON.stringify({ sub: account.email, exp: Math.floor(Date.now() / 1000) + 3600 }));
    localStorage.setItem("frndbook_access_token", `test.${payload}.test`);
    localStorage.setItem("frndbook_refresh_token", "fixture");
    localStorage.setItem("frndbook_user", JSON.stringify(account));
  }, user(2));
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { external.push(url.origin); return route.abort(); }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let body = [];
    if (url.pathname === "/api/users/me") body = user(2);
    else if (url.pathname === "/api/conversations") body = [
      { id: 12, otherUser: user(1), lastMessage: rows.get(12).at(-1) },
      { id: 23, otherUser: user(3), lastMessage: null },
    ];
    else if (url.pathname.endsWith("unread-count")) body = 0;
    const match = url.pathname.match(/^\/api\/conversations\/(\d+)\/messages$/);
    if (match) {
      const id = Number(match[1]);
      if (route.request().method() === "POST") {
        posts++;
        if (rejectSend) return route.fulfill({ status: 422, json: { message: "Fixture rejected" } });
        const row = message(Math.max(...rows.get(id).map(m => m.id)) + 1, route.request().postDataJSON().content, id);
        row.sender = user(2); rows.get(id).push(row); body = row;
        if (echo) deliver(row);
        if (postGate) await postGate.promise;
      } else {
        const number = Number(url.searchParams.get("page") || 0), size = Number(url.searchParams.get("size") || 10);
        const sorted = [...rows.get(id)].reverse();
        body = { content: sorted.slice(number * size, (number + 1) * size), number,
          totalPages: Math.ceil(sorted.length / size), last: (number + 1) * size >= sorted.length };
        if (initialHeld && id === 12 && number === 0) await initial.promise;
        if (olderGate && id === 12 && number > 0) { olderRequested = true; await olderGate.promise; }
      }
    }
    try { await route.fulfill({ json: body }); } catch { /* The app may abort a disposed history request. */ }
  });
  await page.routeWebSocket("**/*", socket => {
    socket.onMessage(data => {
      const frame = String(data);
      if (/^(CONNECT|STOMP)/.test(frame)) socket.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
      if (frame.startsWith("SUBSCRIBE")) subscriptions.push({ socket, closed: false,
        destination: frame.match(/\ndestination:([^\n]+)/)?.[1], id: frame.match(/\nid:([^\n]+)/)?.[1] });
      assert.ok(!frame.startsWith("SEND"), "UI sends must use acknowledged REST, not fire-and-forget STOMP");
    });
    socket.onClose(() => { subscriptions.filter(s => s.socket === socket).forEach(s => { s.closed = true; }); });
  });
  await page.goto(origin + "/messages");
  await until(() => subscriptions.some(s => s.destination === "/topic/conversations/12" && !s.closed));
  const live = message(21, "live-before-history"); rows.get(12).push(live); deliver(live);
  await page.locator(".message-bubble p").filter({ hasText: "live-before-history" }).waitFor();
  initialHeld = false; initial.resolve();
  await page.locator(".message-bubble p").filter({ hasText: "history-20" }).waitFor();
  assert.equal(await page.locator(".message-bubble p").filter({ hasText: "live-before-history" }).count(), 1);

  const composer = page.getByRole("textbox", { name: "Message", exact: true });
  postGate = deferred();
  await composer.fill("pending-send"); await page.getByRole("button", { name: "Send", exact: true }).click();
  await until(() => posts === 1);
  await composer.press("Enter"); assert.equal(posts, 1);
  assert.ok(await page.getByRole("button", { name: "Sending...", exact: true }).isDisabled());
  await composer.fill("next draft"); postGate.resolve(); postGate = null;
  await page.getByRole("button", { name: "Send", exact: true }).waitFor();
  assert.equal(await composer.inputValue(), "next draft");
  assert.equal(await page.locator(".message-bubble p").filter({ hasText: "pending-send" }).count(), 1);

  const liveSub = subscriptions.findLast(s => s.destination === "/topic/conversations/12" && !s.closed);
  liveSub.closed = true; liveSub.socket.close(); echo = false;
  await page.getByText("Live updates disconnected", { exact: true }).waitFor();
  await composer.fill("rest-without-socket"); await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.locator(".message-bubble p").filter({ hasText: "rest-without-socket" }).waitFor();
  rejectSend = true;
  await composer.fill("keep-on-failure"); await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Fixture rejected" }).waitFor();
  assert.equal(await composer.inputValue(), "keep-on-failure"); rejectSend = false;

  for (let i = 1; i <= 25; i++) rows.get(12).push(message(rows.get(12).at(-1).id + 1, `missed-${i}`));
  await until(() => subscriptions.some(s => s.destination === "/topic/conversations/12" && !s.closed));
  await page.locator(".message-bubble p").filter({ hasText: /^missed-1$/ }).waitFor();
  for (let i = 1; i <= 25; i++) assert.equal(await page.locator(".message-bubble p").filter({ hasText: new RegExp(`^missed-${i}$`) }).count(), 1);

  // IME Enter must not trigger submission.
  const previousPosts = posts;
  await composer.dispatchEvent("keydown", { key: "Enter", code: "Enter", isComposing: true });
  assert.equal(posts, previousPosts);
  olderGate = deferred();
  await page.getByRole("button", { name: /See older messages/ }).click();
  await until(() => olderRequested);
  await page.locator(".conversation-item").filter({ hasText: "U3" }).click();
  await page.locator(".chat-header h2").filter({ hasText: "U3" }).waitFor();
  assert.equal(await composer.inputValue(), "");
  olderGate.resolve(); olderGate = null;
  await page.locator(".message-bubble p").filter({ hasText: "other-conversation" }).waitFor();
  assert.equal(await page.locator(".message-bubble p").filter({ hasText: /history-|missed-/ }).count(), 0);
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  console.log("PASS: live/history race; acknowledged send and echo dedupe; repeated Enter; edits during send; REST without socket; retained failed draft; 25-message reconnect recovery; IME Enter; stale older request and draft isolation.");
} finally {
  await browser?.close(); await server.close();
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/tests/chat.browser.mjs
@@ -0,0 +1,134 @@
+import { createServer } from "../node_modules/vite/dist/node/index.js";
+import { fileURLToPath } from "node:url";
+import assert from "node:assert/strict";
+const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
+const origin = "http://127.0.0.1:41815";
+process.env.VITE_API_BASE_URL = origin;
+process.env.VITE_WS_URL = origin.replace("http", "ws") + "/ws";
+const server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)),
+  server: { host: "127.0.0.1", port: 41815, strictPort: true } });
+const user = id => ({ id, name: `U${id}`, email: `u${id}@example.invalid` });
+const message = (id, content, conversationId = 12) => ({ id, content, conversationId,
+  sender: user(1), createdAt: "2026-09-14T10:00:00", read: false });
+const rows = new Map([[12, Array.from({ length: 20 }, (_, i) => message(i + 1, `history-${i + 1}`))],
+  [23, [message(101, "other-conversation", 23)]]]);
+const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
+const initial = deferred(); let initialHeld = true;
+let postGate = null, olderGate = null, rejectSend = false, echo = true;
+let posts = 0, olderRequested = false;
+const subscriptions = [], errors = [], external = [];
+const until = async (condition) => {
+  for (let i = 0; i < 400; i++) { if (condition()) return; await new Promise(resolve => setTimeout(resolve, 25)); }
+  throw new Error("Timed out waiting for fixture event");
+};
+const deliver = row => {
+  for (const sub of subscriptions.filter(s => !s.closed && s.destination === `/topic/conversations/${row.conversationId}`)) {
+    sub.socket.send(`MESSAGE\nsubscription:${sub.id}\nmessage-id:${row.id}\ndestination:${sub.destination}\ncontent-type:application/json\n\n${JSON.stringify(row)}\0`);
+  }
+};
+let browser;
+try {
+  await server.listen();
+  browser = await chromium.launch({ channel: "msedge", headless: true });
+  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
+  page.on("pageerror", error => errors.push(error.message));
+  await page.addInitScript(account => {
+    const payload = btoa(JSON.stringify({ sub: account.email, exp: Math.floor(Date.now() / 1000) + 3600 }));
+    localStorage.setItem("frndbook_access_token", `test.${payload}.test`);
+    localStorage.setItem("frndbook_refresh_token", "fixture");
+    localStorage.setItem("frndbook_user", JSON.stringify(account));
+  }, user(2));
+  await page.route("**/*", async route => {
+    const url = new URL(route.request().url());
+    if (url.origin !== origin) { external.push(url.origin); return route.abort(); }
+    if (!url.pathname.startsWith("/api/")) return route.continue();
+    let body = [];
+    if (url.pathname === "/api/users/me") body = user(2);
+    else if (url.pathname === "/api/conversations") body = [
+      { id: 12, otherUser: user(1), lastMessage: rows.get(12).at(-1) },
+      { id: 23, otherUser: user(3), lastMessage: null },
+    ];
+    else if (url.pathname.endsWith("unread-count")) body = 0;
+    const match = url.pathname.match(/^\/api\/conversations\/(\d+)\/messages$/);
+    if (match) {
+      const id = Number(match[1]);
+      if (route.request().method() === "POST") {
+        posts++;
+        if (rejectSend) return route.fulfill({ status: 422, json: { message: "Fixture rejected" } });
+        const row = message(Math.max(...rows.get(id).map(m => m.id)) + 1, route.request().postDataJSON().content, id);
+        row.sender = user(2); rows.get(id).push(row); body = row;
+        if (echo) deliver(row);
+        if (postGate) await postGate.promise;
+      } else {
+        const number = Number(url.searchParams.get("page") || 0), size = Number(url.searchParams.get("size") || 10);
+        const sorted = [...rows.get(id)].reverse();
+        body = { content: sorted.slice(number * size, (number + 1) * size), number,
+          totalPages: Math.ceil(sorted.length / size), last: (number + 1) * size >= sorted.length };
+        if (initialHeld && id === 12 && number === 0) await initial.promise;
+        if (olderGate && id === 12 && number > 0) { olderRequested = true; await olderGate.promise; }
+      }
+    }
+    try { await route.fulfill({ json: body }); } catch { /* The app may abort a disposed history request. */ }
+  });
+  await page.routeWebSocket("**/*", socket => {
+    socket.onMessage(data => {
+      const frame = String(data);
+      if (/^(CONNECT|STOMP)/.test(frame)) socket.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
+      if (frame.startsWith("SUBSCRIBE")) subscriptions.push({ socket, closed: false,
+        destination: frame.match(/\ndestination:([^\n]+)/)?.[1], id: frame.match(/\nid:([^\n]+)/)?.[1] });
+      assert.ok(!frame.startsWith("SEND"), "UI sends must use acknowledged REST, not fire-and-forget STOMP");
+    });
+    socket.onClose(() => { subscriptions.filter(s => s.socket === socket).forEach(s => { s.closed = true; }); });
+  });
+  await page.goto(origin + "/messages");
+  await until(() => subscriptions.some(s => s.destination === "/topic/conversations/12" && !s.closed));
+  const live = message(21, "live-before-history"); rows.get(12).push(live); deliver(live);
+  await page.locator(".message-bubble p").filter({ hasText: "live-before-history" }).waitFor();
+  initialHeld = false; initial.resolve();
+  await page.locator(".message-bubble p").filter({ hasText: "history-20" }).waitFor();
+  assert.equal(await page.locator(".message-bubble p").filter({ hasText: "live-before-history" }).count(), 1);
+
+  const composer = page.getByRole("textbox", { name: "Message", exact: true });
+  postGate = deferred();
+  await composer.fill("pending-send"); await page.getByRole("button", { name: "Send", exact: true }).click();
+  await until(() => posts === 1);
+  await composer.press("Enter"); assert.equal(posts, 1);
+  assert.ok(await page.getByRole("button", { name: "Sending...", exact: true }).isDisabled());
+  await composer.fill("next draft"); postGate.resolve(); postGate = null;
+  await page.getByRole("button", { name: "Send", exact: true }).waitFor();
+  assert.equal(await composer.inputValue(), "next draft");
+  assert.equal(await page.locator(".message-bubble p").filter({ hasText: "pending-send" }).count(), 1);
+
+  const liveSub = subscriptions.findLast(s => s.destination === "/topic/conversations/12" && !s.closed);
+  liveSub.closed = true; liveSub.socket.close(); echo = false;
+  await page.getByText("Live updates disconnected", { exact: true }).waitFor();
+  await composer.fill("rest-without-socket"); await page.getByRole("button", { name: "Send", exact: true }).click();
+  await page.locator(".message-bubble p").filter({ hasText: "rest-without-socket" }).waitFor();
+  rejectSend = true;
+  await composer.fill("keep-on-failure"); await page.getByRole("button", { name: "Send", exact: true }).click();
+  await page.getByRole("alert").filter({ hasText: "Fixture rejected" }).waitFor();
+  assert.equal(await composer.inputValue(), "keep-on-failure"); rejectSend = false;
+
+  for (let i = 1; i <= 25; i++) rows.get(12).push(message(rows.get(12).at(-1).id + 1, `missed-${i}`));
+  await until(() => subscriptions.some(s => s.destination === "/topic/conversations/12" && !s.closed));
+  await page.locator(".message-bubble p").filter({ hasText: /^missed-1$/ }).waitFor();
+  for (let i = 1; i <= 25; i++) assert.equal(await page.locator(".message-bubble p").filter({ hasText: new RegExp(`^missed-${i}$`) }).count(), 1);
+
+  // IME Enter must not trigger submission.
+  const previousPosts = posts;
+  await composer.dispatchEvent("keydown", { key: "Enter", code: "Enter", isComposing: true });
+  assert.equal(posts, previousPosts);
+  olderGate = deferred();
+  await page.getByRole("button", { name: /See older messages/ }).click();
+  await until(() => olderRequested);
+  await page.locator(".conversation-item").filter({ hasText: "U3" }).click();
+  await page.locator(".chat-header h2").filter({ hasText: "U3" }).waitFor();
+  assert.equal(await composer.inputValue(), "");
+  olderGate.resolve(); olderGate = null;
+  await page.locator(".message-bubble p").filter({ hasText: "other-conversation" }).waitFor();
+  assert.equal(await page.locator(".message-bubble p").filter({ hasText: /history-|missed-/ }).count(), 0);
+  assert.deepEqual(errors, []); assert.deepEqual(external, []);
+  console.log("PASS: live/history race; acknowledged send and echo dedupe; repeated Enter; edits during send; REST without socket; retained failed draft; 25-message reconnect recovery; IME Enter; stale older request and draft isolation.");
+} finally {
+  await browser?.close(); await server.close();
+}
```

## tests/messageSession.test.js

Added. Ten isolated unit tests for merging, asynchronous races, pagination, sends and read marking.

### Full current content

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { createMessageSession } from "../src/services/messageSession.js";
import { mergeMessages } from "../src/utils/messageHistory.js";

const message = (id, extra = {}) => ({ id, conversationId: 12, content: `message ${id}`,
  createdAt: "2026-09-14T10:00:00", sender: { id: 2 }, read: false, ...extra });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const pageOf = (rows, page, size) => ({ content: [...rows].reverse().slice(page * size, (page + 1) * size),
  totalPages: Math.ceil(rows.length / size), last: (page + 1) * size >= rows.length });
function setup(overrides = {}) {
  let state;
  const updates = [], messages = [];
  const session = createMessageSession({ conversationId: 12,
    fetchPage: async () => ({ content: [], last: true }),
    saveMessage: async () => message(1), markRead: async () => {}, isVisible: () => false,
    onState: value => { state = value; updates.push(value); }, onMessage: value => messages.push(value), ...overrides });
  return { session, state: () => state, updates, messages };
}

test("merge filters other conversations, deduplicates numeric/string IDs, sorts ties and preserves read=true", () => {
  const rows = mergeMessages([message(10, { read: true })], [message("10"), message(2), message(8, { conversationId: 99 }), null], 12);
  assert.deepEqual(rows.map(m => m.id), [2, 10]);
  assert.equal(rows[1].read, true);
});

test("late initial history merges with an already received live message", async () => {
  const wait = deferred(); const app = setup({ fetchPage: () => wait.promise });
  const loading = app.session.initialize();
  app.session.receive(message(2)); wait.resolve({ content: [message(1)], last: true });
  await loading;
  assert.deepEqual(app.state().messages.map(m => m.id), [1, 2]); app.session.dispose();
});

test("REST acknowledgement updates messages/sidebar and its live echo is deduplicated", async () => {
  const wait = deferred(); const app = setup({ saveMessage: () => wait.promise });
  await app.session.initialize(); const send = app.session.send("hello");
  app.session.receive(message(5)); wait.resolve(message(5)); await send;
  assert.equal(app.state().messages.length, 1);
  assert.equal(app.messages.at(-1).id, 5); app.session.dispose();
});

test("a second send is rejected while the first is pending", async () => {
  const wait = deferred(); let calls = 0;
  const app = setup({ saveMessage: () => { calls++; return wait.promise; } });
  const first = app.session.send("a"); await assert.rejects(app.session.send("a"));
  wait.resolve(message(1)); await first; assert.equal(calls, 1); app.session.dispose();
});

test("failed send does not fabricate a delivered message and allows explicit retry", async () => {
  let fail = true;
  const app = setup({ saveMessage: async () => { if (fail) throw new Error("offline"); return message(1); } });
  await app.session.initialize(); await assert.rejects(app.session.send("a"));
  assert.equal(app.state().messages.length, 0); assert.match(app.state().sendError, /Check recent messages/);
  fail = false; await app.session.send("a"); assert.equal(app.state().messages.length, 1); app.session.dispose();
});

test("reconnect scans several pages to the last synchronized anchor, not a newer live arrival", async () => {
  let rows = [message(1)]; const pages = [];
  const app = setup({ fetchPage: async (page, size) => { pages.push(page); return pageOf(rows, page, size); } });
  await app.session.initialize(); rows = Array.from({ length: 36 }, (_, i) => message(i + 1));
  app.session.receive(message(36)); await app.session.recover();
  assert.equal(app.state().messages.length, 36); assert.deepEqual(pages, [0, 0, 1, 2, 3]); app.session.dispose();
});

test("older history tolerates page offsets shifted by a burst of new messages", async () => {
  let rows = Array.from({ length: 30 }, (_, i) => message(i + 1));
  const app = setup({ fetchPage: async (page, size) => pageOf(rows, page, size) });
  await app.session.initialize(); rows = Array.from({ length: 55 }, (_, i) => message(i + 1));
  await app.session.loadOlder();
  assert.ok(app.state().messages.some(m => m.id === 20));
  while (app.state().hasOlder) await app.session.loadOlder();
  assert.deepEqual(app.state().messages.map(m => m.id), rows.map(m => m.id)); app.session.dispose();
});

test("disposed session ignores late history/send responses and aborts history", async () => {
  const history = deferred(), send = deferred(); let signal;
  const app = setup({ fetchPage: (_page, _size, value) => { signal = value; return history.promise; }, saveMessage: () => send.promise });
  const pending = app.session.initialize(), saving = app.session.send("a");
  const updates = app.updates.length; app.session.dispose();
  history.resolve({ content: [message(1)], last: true }); send.resolve(message(2));
  await Promise.all([pending, saving]); assert.equal(signal.aborted, true);
  assert.equal(app.updates.length, updates); assert.equal(app.messages.length, 0);
});

test("history error remains separate from a successful send and can be retried", async () => {
  let fail = true;
  const app = setup({ fetchPage: async () => { if (fail) throw new Error("history unavailable"); return { content: [message(1)], last: true }; } });
  await app.session.initialize(); await app.session.send("a");
  assert.equal(app.state().historyError, "history unavailable");
  fail = false; await app.session.recover(); assert.equal(app.state().historyError, ""); app.session.dispose();
});

test("read marking waits for history, is visibility-gated and batches arrivals", async () => {
  let visible = false, reads = 0;
  const app = setup({ isVisible: () => visible, markRead: async () => { reads++; } });
  await app.session.initialize(); app.session.receive(message(1));
  await new Promise(resolve => setTimeout(resolve, 120)); assert.equal(reads, 0);
  visible = true; app.session.requestRead(); app.session.receive(message(2)); app.session.receive(message(3));
  await new Promise(resolve => setTimeout(resolve, 120)); assert.equal(reads, 1); app.session.dispose();
});
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/tests/messageSession.test.js
@@ -0,0 +1,101 @@
+import test from "node:test";
+import assert from "node:assert/strict";
+import { createMessageSession } from "../src/services/messageSession.js";
+import { mergeMessages } from "../src/utils/messageHistory.js";
+
+const message = (id, extra = {}) => ({ id, conversationId: 12, content: `message ${id}`,
+  createdAt: "2026-09-14T10:00:00", sender: { id: 2 }, read: false, ...extra });
+const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
+const pageOf = (rows, page, size) => ({ content: [...rows].reverse().slice(page * size, (page + 1) * size),
+  totalPages: Math.ceil(rows.length / size), last: (page + 1) * size >= rows.length });
+function setup(overrides = {}) {
+  let state;
+  const updates = [], messages = [];
+  const session = createMessageSession({ conversationId: 12,
+    fetchPage: async () => ({ content: [], last: true }),
+    saveMessage: async () => message(1), markRead: async () => {}, isVisible: () => false,
+    onState: value => { state = value; updates.push(value); }, onMessage: value => messages.push(value), ...overrides });
+  return { session, state: () => state, updates, messages };
+}
+
+test("merge filters other conversations, deduplicates numeric/string IDs, sorts ties and preserves read=true", () => {
+  const rows = mergeMessages([message(10, { read: true })], [message("10"), message(2), message(8, { conversationId: 99 }), null], 12);
+  assert.deepEqual(rows.map(m => m.id), [2, 10]);
+  assert.equal(rows[1].read, true);
+});
+
+test("late initial history merges with an already received live message", async () => {
+  const wait = deferred(); const app = setup({ fetchPage: () => wait.promise });
+  const loading = app.session.initialize();
+  app.session.receive(message(2)); wait.resolve({ content: [message(1)], last: true });
+  await loading;
+  assert.deepEqual(app.state().messages.map(m => m.id), [1, 2]); app.session.dispose();
+});
+
+test("REST acknowledgement updates messages/sidebar and its live echo is deduplicated", async () => {
+  const wait = deferred(); const app = setup({ saveMessage: () => wait.promise });
+  await app.session.initialize(); const send = app.session.send("hello");
+  app.session.receive(message(5)); wait.resolve(message(5)); await send;
+  assert.equal(app.state().messages.length, 1);
+  assert.equal(app.messages.at(-1).id, 5); app.session.dispose();
+});
+
+test("a second send is rejected while the first is pending", async () => {
+  const wait = deferred(); let calls = 0;
+  const app = setup({ saveMessage: () => { calls++; return wait.promise; } });
+  const first = app.session.send("a"); await assert.rejects(app.session.send("a"));
+  wait.resolve(message(1)); await first; assert.equal(calls, 1); app.session.dispose();
+});
+
+test("failed send does not fabricate a delivered message and allows explicit retry", async () => {
+  let fail = true;
+  const app = setup({ saveMessage: async () => { if (fail) throw new Error("offline"); return message(1); } });
+  await app.session.initialize(); await assert.rejects(app.session.send("a"));
+  assert.equal(app.state().messages.length, 0); assert.match(app.state().sendError, /Check recent messages/);
+  fail = false; await app.session.send("a"); assert.equal(app.state().messages.length, 1); app.session.dispose();
+});
+
+test("reconnect scans several pages to the last synchronized anchor, not a newer live arrival", async () => {
+  let rows = [message(1)]; const pages = [];
+  const app = setup({ fetchPage: async (page, size) => { pages.push(page); return pageOf(rows, page, size); } });
+  await app.session.initialize(); rows = Array.from({ length: 36 }, (_, i) => message(i + 1));
+  app.session.receive(message(36)); await app.session.recover();
+  assert.equal(app.state().messages.length, 36); assert.deepEqual(pages, [0, 0, 1, 2, 3]); app.session.dispose();
+});
+
+test("older history tolerates page offsets shifted by a burst of new messages", async () => {
+  let rows = Array.from({ length: 30 }, (_, i) => message(i + 1));
+  const app = setup({ fetchPage: async (page, size) => pageOf(rows, page, size) });
+  await app.session.initialize(); rows = Array.from({ length: 55 }, (_, i) => message(i + 1));
+  await app.session.loadOlder();
+  assert.ok(app.state().messages.some(m => m.id === 20));
+  while (app.state().hasOlder) await app.session.loadOlder();
+  assert.deepEqual(app.state().messages.map(m => m.id), rows.map(m => m.id)); app.session.dispose();
+});
+
+test("disposed session ignores late history/send responses and aborts history", async () => {
+  const history = deferred(), send = deferred(); let signal;
+  const app = setup({ fetchPage: (_page, _size, value) => { signal = value; return history.promise; }, saveMessage: () => send.promise });
+  const pending = app.session.initialize(), saving = app.session.send("a");
+  const updates = app.updates.length; app.session.dispose();
+  history.resolve({ content: [message(1)], last: true }); send.resolve(message(2));
+  await Promise.all([pending, saving]); assert.equal(signal.aborted, true);
+  assert.equal(app.updates.length, updates); assert.equal(app.messages.length, 0);
+});
+
+test("history error remains separate from a successful send and can be retried", async () => {
+  let fail = true;
+  const app = setup({ fetchPage: async () => { if (fail) throw new Error("history unavailable"); return { content: [message(1)], last: true }; } });
+  await app.session.initialize(); await app.session.send("a");
+  assert.equal(app.state().historyError, "history unavailable");
+  fail = false; await app.session.recover(); assert.equal(app.state().historyError, ""); app.session.dispose();
+});
+
+test("read marking waits for history, is visibility-gated and batches arrivals", async () => {
+  let visible = false, reads = 0;
+  const app = setup({ isVisible: () => visible, markRead: async () => { reads++; } });
+  await app.session.initialize(); app.session.receive(message(1));
+  await new Promise(resolve => setTimeout(resolve, 120)); assert.equal(reads, 0);
+  visible = true; app.session.requestRead(); app.session.receive(message(2)); app.session.receive(message(3));
+  await new Promise(resolve => setTimeout(resolve, 120)); assert.equal(reads, 1); app.session.dispose();
+});
```

