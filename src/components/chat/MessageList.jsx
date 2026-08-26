import { useEffect, useLayoutEffect, useRef } from "react";

import UserAvatar from "../users/UserAvatar";

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
      <div className="message-list-container">
        <div className="message-list message-list-loading">
          Loading messages...
        </div>
      </div>
    );
  }

  return (
    <div className="message-list-container">
      {hasOlderMessages && (
        <div className="older-messages-bar">
          <button
            type="button"
            className="chat-secondary-button"
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
        className="message-list"
        onScroll={handleScroll}
      >
        {messages.length === 0 && (
          <div className="message-empty">
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
              className={`message-row ${
                isOwnMessage ? "message-row-own" : "message-row-other"
              }`}
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
                className={`message-bubble ${
                  isOwnMessage ? "message-bubble-own" : "message-bubble-other"
                }`}
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
