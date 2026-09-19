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
