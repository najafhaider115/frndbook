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

import "../styles/chat.css";

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

        <div className="loading-screen">Loading messages...</div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="messages-page">
        <div className="messages-card">
          {error && <p className="error chat-page-error">{error}</p>}

          <div
            className={`messages-layout ${
              mobileView === "chat"
                ? "mobile-chat-active"
                : "mobile-conversations-active"
            }`}
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
