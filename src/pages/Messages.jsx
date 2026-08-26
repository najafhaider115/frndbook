import { useCallback, useEffect, useState } from "react";

import { useSearchParams } from "react-router-dom";

import Navbar from "../components/layout/Navbar";

import ConversationList from "../components/chat/ConversationList";
import ChatWindow from "../components/chat/ChatWindow";

import {
  getConversations,
  getOrCreateConversation,
} from "../api/conversationApi";

import { useAuth } from "../auth/AuthContext";

import "../styles/chat.css";

const Messages = () => {
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);

  const [selectedConversation, setSelectedConversation] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

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

      setConversations(data || []);

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
          setSelectedConversation(data[0]);
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

  const handleMessageReceived = useCallback((message) => {
    if (!message?.conversationId) {
      return;
    }

    setConversations((currentConversations) => {
      const updated = currentConversations.map((conversation) => {
        if (String(conversation.id) !== String(message.conversationId)) {
          return conversation;
        }

        return {
          ...conversation,
          lastMessage: message,
          updatedAt: message.createdAt || conversation.updatedAt,
        };
      });

      updated.sort((first, second) => {
        const firstTime = first.updatedAt
          ? new Date(first.updatedAt).getTime()
          : 0;

        const secondTime = second.updatedAt
          ? new Date(second.updatedAt).getTime()
          : 0;

        return secondTime - firstTime;
      });

      return updated;
    });

    setSelectedConversation((currentConversation) => {
      if (
        !currentConversation ||
        String(currentConversation.id) !== String(message.conversationId)
      ) {
        return currentConversation;
      }

      return {
        ...currentConversation,
        lastMessage: message,
        updatedAt: message.createdAt || currentConversation.updatedAt,
      };
    });
  }, []);

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
