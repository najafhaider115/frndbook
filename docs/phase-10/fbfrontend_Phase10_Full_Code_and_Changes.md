# fbfrontend - Phase 10: Full code and changes

Paths are relative to the frontend root. Every changed current file is provided in full. Completed Phases 9.1-9.3 are the baseline. New files have an empty before-version.

## index.html

Updated. Use FrndBook as the browser title and add a concise page description.

### Full current content

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="FrndBook — connect with friends and keep your conversations together." />
    <title>FrndBook</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### Changes (+ added / - removed)

```diff
--- before/index.html
+++ after/index.html
@@ -4,7 +4,8 @@
     <meta charset="UTF-8" />
     <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
-    <title>fbfrontend</title>
+    <meta name="description" content="FrndBook — connect with friends and keep your conversations together." />
+    <title>FrndBook</title>
   </head>
   <body>
     <div id="root"></div>
```

## src/api/userApi.js

Updated. Allow cancellation of search requests without changing endpoint parameters.

### Full current content

```javascript
import axiosClient from "./axiosClient";

// ==================================================
// CURRENT USER
// ==================================================

export const getCurrentUser = async () => {
  const response = await axiosClient.get("/api/users/me");

  return response.data;
};

// ==================================================
// GET USER BY ID
// ==================================================

export const getUserById = async (userId) => {
  const response = await axiosClient.get(`/api/users/${userId}`);

  return response.data;
};

// ==================================================
// UPDATE PROFILE
// ==================================================

export const updateProfile = async (name, bio) => {
  const response = await axiosClient.patch("/api/users/me", {
    name,
    bio,
  });

  return response.data;
};

// ==================================================
// UPDATE PROFILE IMAGE
// ==================================================

export const updateProfileImage = async (file) => {
  const formData = new FormData();

  formData.append("file", file);

  const response = await axiosClient.post(
    "/api/users/me/profile-image",
    formData,
  );

  return response.data;
};

// ==================================================
// SEARCH USERS
// ==================================================

export const searchUsers = async (name, page = 0, size = 10, signal) => {
  const response = await axiosClient.get("/api/users/search", {
    signal,
    params: {
      name,
      page,
      size,
    },
  });

  return response.data;
};

// ==================================================
// RECENT SEARCHES
// ==================================================

export const getRecentSearches = async () => {
  const response = await axiosClient.get("/api/users/recent-searches");

  return response.data;
};

// ==================================================
// ADD RECENT SEARCH
// ==================================================

export const addRecentSearch = async (userId) => {
  const response = await axiosClient.post(
    `/api/users/recent-searches/${userId}`,
  );

  return response.data;
};

// ==================================================
// CLEAR RECENT SEARCHES
// ==================================================

export const clearRecentSearches = async () => {
  const response = await axiosClient.delete("/api/users/recent-searches");

  return response.data;
};
```

### Changes (+ added / - removed)

```diff
--- before/src/api/userApi.js
+++ after/src/api/userApi.js
@@ -54,8 +54,9 @@
 // SEARCH USERS
 // ==================================================
 
-export const searchUsers = async (name, page = 0, size = 10) => {
+export const searchUsers = async (name, page = 0, size = 10, signal) => {
   const response = await axiosClient.get("/api/users/search", {
+    signal,
     params: {
       name,
       page,
```

## src/components/chat/ConversationList.jsx

Updated. Use the same safe timestamp formatter instead of repeated inline date construction.

### Full current content

```jsx
import { formatTimestamp } from "../../utils/displayText.js";
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
                  ? formatTimestamp(conversation.updatedAt, true)
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
@@ -1,3 +1,4 @@
+import { formatTimestamp } from "../../utils/displayText.js";
 import chatStyles from "../../styles/chat.module.css";
 import { bindStyles } from "../../utils/bindStyles";
 import UserAvatar from "../users/UserAvatar";
@@ -61,10 +62,7 @@
 
               <div className={css("conversation-item-time")}>
                 {conversation.updatedAt
-                  ? new Date(conversation.updatedAt).toLocaleTimeString([], {
-                      hour: "2-digit",
-                      minute: "2-digit",
-                    })
+                  ? formatTimestamp(conversation.updatedAt, true)
                   : ""}
               </div>
             </button>
```

## src/components/chat/MessageList.jsx

Updated. Use the same safe timestamp formatter instead of repeated inline date construction.

### Full current content

```jsx
import { formatTimestamp } from "../../utils/displayText.js";
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
                    ? formatTimestamp(message.createdAt, true)
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
@@ -1,3 +1,4 @@
+import { formatTimestamp } from "../../utils/displayText.js";
 import chatStyles from "../../styles/chat.module.css";
 import { bindStyles } from "../../utils/bindStyles";
 import { useEffect, useLayoutEffect, useRef } from "react";
@@ -230,10 +231,7 @@
 
                 <span>
                   {message.createdAt
-                    ? new Date(message.createdAt).toLocaleTimeString([], {
-                        hour: "2-digit",
-                        minute: "2-digit",
-                      })
+                    ? formatTimestamp(message.createdAt, true)
                     : ""}
                 </span>
               </div>
```

## src/components/users/FriendRequestCard.jsx

Updated. Use the same safe timestamp formatter instead of repeated inline date construction.

### Full current content

```jsx
import { formatTimestamp } from "../../utils/displayText.js";
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
              ? formatTimestamp(request.createdAt)
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
@@ -1,3 +1,4 @@
+import { formatTimestamp } from "../../utils/displayText.js";
 import friendsStyles from "../../styles/friends.module.css";
 import { bindStyles } from "../../utils/bindStyles";
 import { Link } from "react-router-dom";
@@ -42,7 +43,7 @@
 
           <span>
             {request.createdAt
-              ? new Date(request.createdAt).toLocaleString()
+              ? formatTimestamp(request.createdAt)
               : "—"}
           </span>
         </div>
```

## src/components/users/UserSearch.jsx

Updated. Immediate pending feedback, stale-request cancellation, recoverable paging and recent-search errors.

### Full current content

```jsx
import { apiErrorMessage } from "../../utils/apiError.js";
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
  const [requestedPage, setRequestedPage] = useState(0);
  const [requestVersion, setRequestVersion] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [recentError, setRecentError] = useState("");

  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(false);

  const [recentLoading, setRecentLoading] = useState(true);

  const [error, setError] = useState("");

  // ==================================================
  // LOAD RECENT SEARCHES
  // ==================================================

  useEffect(() => {
    let active = true;
    const loadRecentSearches = async () => {
      try {
        setRecentLoading(true);

        const data = await getRecentSearches();

        if (active) setRecentSearches(data || []);
      } catch (error) {
        if (active) setRecentError(apiErrorMessage(error, "Unable to load recent searches"));
      } finally {
        if (active) setRecentLoading(false);
      }
    };

    loadRecentSearches();
    return () => { active = false; };
  }, []);

  // One effect owns debouncing, paging and cancellation for each search.
  useEffect(() => {
    const query = searchTerm.trim();
    if (!query) return;
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await searchUsers(query, requestedPage, 10, abort.signal);
        if (abort.signal.aborted) return;
        setResults((data?.content || []).filter(item => String(item.id) !== String(currentUser?.id)));
        setPage(data?.number ?? requestedPage);
        setTotalPages(data?.totalPages ?? 0);
      } catch (error) {
        if (!abort.signal.aborted) {
          setError(apiErrorMessage(error, "Unable to search users"));
          setResults([]);
        }
      } finally { if (!abort.signal.aborted) setLoading(false); }
    }, requestedPage === 0 ? 400 : 0);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [searchTerm, requestedPage, requestVersion, currentUser?.id]);

  const changeSearch = value => {
    setSearchTerm(value); setRequestedPage(0); setPage(0); setTotalPages(0);
    setResults([]); setError(""); setLoading(Boolean(value.trim()));
  };
  const loadPage = nextPage => {
    if (loading || nextPage === page) return;
    setError(""); setLoading(true); setRequestedPage(nextPage); setRequestVersion(version => version + 1);
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
    if (clearing) return;
    setClearing(true); setRecentError("");
    try {
      await clearRecentSearches();

      setRecentSearches([]);
    } catch (error) {
      setRecentError(apiErrorMessage(error, "Unable to clear recent searches"));
    } finally { setClearing(false); }
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
        onChange={(event) => changeSearch(event.target.value)}
      />

      {error && <StatusMessage tone="error" className={css("error")}>{error}
        <button type="button" onClick={() => { setError(""); setLoading(true); setRequestVersion(version => version + 1); }}>Retry search</button>
      </StatusMessage>}

      {loading && <p role="status" className={css("search-status")}>Searching...</p>}

      {!loading && searchTerm.trim() && results.length === 0 && !error && (
        <p className={css("search-status")}>No users found.</p>
      )}

      <div aria-busy={loading} className={css("user-results")}>
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
                disabled={clearing}
              >
                {clearing ? "Clearing..." : "Clear"}
              </button>
            )}
          </div>

          {recentError && <StatusMessage tone="error">{recentError}</StatusMessage>}

          {recentLoading && (
            <p className={css("search-status")}>Loading recent searches...</p>
          )}

          {!recentLoading && !recentError && recentSearches.length === 0 && (
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
@@ -27,6 +27,10 @@
   const [recentSearches, setRecentSearches] = useState([]);
 
   const [page, setPage] = useState(0);
+  const [requestedPage, setRequestedPage] = useState(0);
+  const [requestVersion, setRequestVersion] = useState(0);
+  const [clearing, setClearing] = useState(false);
+  const [recentError, setRecentError] = useState("");
 
   const [totalPages, setTotalPages] = useState(0);
 
@@ -41,116 +45,54 @@
   // ==================================================
 
   useEffect(() => {
+    let active = true;
     const loadRecentSearches = async () => {
       try {
         setRecentLoading(true);
 
         const data = await getRecentSearches();
 
-        setRecentSearches(data || []);
+        if (active) setRecentSearches(data || []);
       } catch (error) {
-        console.error("Failed to load recent searches:", error);
+        if (active) setRecentError(apiErrorMessage(error, "Unable to load recent searches"));
       } finally {
-        setRecentLoading(false);
+        if (active) setRecentLoading(false);
       }
     };
 
     loadRecentSearches();
+    return () => { active = false; };
   }, []);
 
-  // ==================================================
-  // SEARCH
-  // ==================================================
-
+  // One effect owns debouncing, paging and cancellation for each search.
   useEffect(() => {
-    const trimmedSearch = searchTerm.trim();
-
-    if (!trimmedSearch) {
-      setResults([]);
-
-      setPage(0);
-
-      setTotalPages(0);
-
-      setError("");
-
-      return;
-    }
-
+    const query = searchTerm.trim();
+    if (!query) return;
+    const abort = new AbortController();
     const timer = setTimeout(async () => {
       try {
-        setLoading(true);
-
-        setError("");
-
-        const data = await searchUsers(trimmedSearch, 0, 10);
-
-        const users = data?.content || [];
-
-        /*
-         * Don't show the currently logged-in
-         * user in user search.
-         */
-
-        const filteredUsers = users.filter(
-          (searchedUser) => searchedUser.id !== currentUser?.id,
-        );
-
-        setResults(filteredUsers);
-
-        setPage(data?.number ?? 0);
-
+        const data = await searchUsers(query, requestedPage, 10, abort.signal);
+        if (abort.signal.aborted) return;
+        setResults((data?.content || []).filter(item => String(item.id) !== String(currentUser?.id)));
+        setPage(data?.number ?? requestedPage);
         setTotalPages(data?.totalPages ?? 0);
       } catch (error) {
-        console.error("User search failed:", error);
-
-        setError(apiErrorMessage(error, "Unable to search users"));
-
-        setResults([]);
-      } finally {
-        setLoading(false);
-      }
-    }, 400);
-
-    return () => {
-      clearTimeout(timer);
-    };
-  }, [searchTerm, currentUser?.id]);
-
-  // ==================================================
-  // LOAD PAGE
-  // ==================================================
-
-  const loadPage = async (nextPage) => {
-    if (!searchTerm.trim()) {
-      return;
-    }
-
-    try {
-      setLoading(true);
-
-      setError("");
-
-      const data = await searchUsers(searchTerm.trim(), nextPage, 10);
-
-      const users = data?.content || [];
-
-      const filteredUsers = users.filter(
-        (searchedUser) => searchedUser.id !== currentUser?.id,
-      );
-
-      setResults(filteredUsers);
-
-      setPage(data?.number ?? nextPage);
-
-      setTotalPages(data?.totalPages ?? 0);
-    } catch (error) {
-      console.error("Failed to load search page:", error);
-
-      setError(apiErrorMessage(error, "Unable to load results"));
-    } finally {
-      setLoading(false);
-    }
+        if (!abort.signal.aborted) {
+          setError(apiErrorMessage(error, "Unable to search users"));
+          setResults([]);
+        }
+      } finally { if (!abort.signal.aborted) setLoading(false); }
+    }, requestedPage === 0 ? 400 : 0);
+    return () => { clearTimeout(timer); abort.abort(); };
+  }, [searchTerm, requestedPage, requestVersion, currentUser?.id]);
+
+  const changeSearch = value => {
+    setSearchTerm(value); setRequestedPage(0); setPage(0); setTotalPages(0);
+    setResults([]); setError(""); setLoading(Boolean(value.trim()));
+  };
+  const loadPage = nextPage => {
+    if (loading || nextPage === page) return;
+    setError(""); setLoading(true); setRequestedPage(nextPage); setRequestVersion(version => version + 1);
   };
 
   // ==================================================
@@ -179,13 +121,15 @@
   // ==================================================
 
   const handleClearRecentSearches = async () => {
+    if (clearing) return;
+    setClearing(true); setRecentError("");
     try {
       await clearRecentSearches();
 
       setRecentSearches([]);
     } catch (error) {
-      console.error("Failed to clear recent searches:", error);
-    }
+      setRecentError(apiErrorMessage(error, "Unable to clear recent searches"));
+    } finally { setClearing(false); }
   };
 
   return (
@@ -200,18 +144,20 @@
         aria-label="Search people by name"
         placeholder="Search users by name..."
         value={searchTerm}
-        onChange={(event) => setSearchTerm(event.target.value)}
+        onChange={(event) => changeSearch(event.target.value)}
       />
 
-      {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}
-
-      {loading && <p className={css("search-status")}>Searching...</p>}
+      {error && <StatusMessage tone="error" className={css("error")}>{error}
+        <button type="button" onClick={() => { setError(""); setLoading(true); setRequestVersion(version => version + 1); }}>Retry search</button>
+      </StatusMessage>}
+
+      {loading && <p role="status" className={css("search-status")}>Searching...</p>}
 
       {!loading && searchTerm.trim() && results.length === 0 && !error && (
         <p className={css("search-status")}>No users found.</p>
       )}
 
-      <div className={css("user-results")}>
+      <div aria-busy={loading} className={css("user-results")}>
         {results.map((searchedUser) => (
           <UserCard
             key={searchedUser.id}
@@ -252,17 +198,20 @@
               <button
                 className={css("text-button")}
                 onClick={handleClearRecentSearches}
+                disabled={clearing}
               >
-                Clear
+                {clearing ? "Clearing..." : "Clear"}
               </button>
             )}
           </div>
 
+          {recentError && <StatusMessage tone="error">{recentError}</StatusMessage>}
+
           {recentLoading && (
             <p className={css("search-status")}>Loading recent searches...</p>
           )}
 
-          {!recentLoading && recentSearches.length === 0 && (
+          {!recentLoading && !recentError && recentSearches.length === 0 && (
             <p className={css("search-status")}>No recent searches.</p>
           )}
 
```

## src/hooks/useChatViewport.js

Added. Size mobile chat against the visible viewport and clean up listeners on unmount.

### Full current content

```javascript
import { useEffect, useState } from "react";

/** Fit the mobile chat to the visible area when an on-screen keyboard overlays the layout. */
export function useChatViewport() {
  const [element, setElement] = useState(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!element || !viewport) return;
    let frame;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (window.innerWidth > 800 || viewport.scale !== 1) {
          element.style.removeProperty("--chat-available-height");
          return;
        }
        const available = Math.max(0, viewport.height + viewport.offsetTop - element.getBoundingClientRect().top);
        element.style.setProperty("--chat-available-height", `${available}px`);
      });
    };
    measure();
    viewport.addEventListener("resize", measure);
    viewport.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", measure);
      viewport.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      element.style.removeProperty("--chat-available-height");
    };
  }, [element]);
  return setElement;
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/hooks/useChatViewport.js
@@ -0,0 +1,36 @@
+import { useEffect, useState } from "react";
+
+/** Fit the mobile chat to the visible area when an on-screen keyboard overlays the layout. */
+export function useChatViewport() {
+  const [element, setElement] = useState(null);
+  useEffect(() => {
+    const viewport = window.visualViewport;
+    if (!element || !viewport) return;
+    let frame;
+    const measure = () => {
+      cancelAnimationFrame(frame);
+      frame = requestAnimationFrame(() => {
+        if (window.innerWidth > 800 || viewport.scale !== 1) {
+          element.style.removeProperty("--chat-available-height");
+          return;
+        }
+        const available = Math.max(0, viewport.height + viewport.offsetTop - element.getBoundingClientRect().top);
+        element.style.setProperty("--chat-available-height", `${available}px`);
+      });
+    };
+    measure();
+    viewport.addEventListener("resize", measure);
+    viewport.addEventListener("scroll", measure);
+    window.addEventListener("resize", measure);
+    window.addEventListener("scroll", measure);
+    return () => {
+      cancelAnimationFrame(frame);
+      viewport.removeEventListener("resize", measure);
+      viewport.removeEventListener("scroll", measure);
+      window.removeEventListener("resize", measure);
+      window.removeEventListener("scroll", measure);
+      element.style.removeProperty("--chat-available-height");
+    };
+  }, [element]);
+  return setElement;
+}
```

## src/pages/Messages.jsx

Updated. Attach the viewport sizing hook to the existing chat page.

### Full current content

```jsx
import { apiErrorMessage } from "../utils/apiError.js";
import { useChatViewport } from "../hooks/useChatViewport";
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
  const viewportRef = useChatViewport();
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

      setError(apiErrorMessage(error, "Unable to load conversations"));

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
            apiErrorMessage(error, "Unable to start conversation"),
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

      <main ref={viewportRef} id="main-content" tabIndex={-1} className={css("messages-page")}>
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
@@ -1,4 +1,5 @@
 import { apiErrorMessage } from "../utils/apiError.js";
+import { useChatViewport } from "../hooks/useChatViewport";
 import chatStyles from "../styles/chat.module.css";
 import { bindStyles } from "../utils/bindStyles";
 import StatusMessage from "../components/ui/StatusMessage";
@@ -26,6 +27,7 @@
 const css = bindStyles(chatStyles);
 
 const Messages = () => {
+  const viewportRef = useChatViewport();
   const { user } = useAuth();
 
   const [searchParams, setSearchParams] = useSearchParams();
@@ -242,7 +244,7 @@
     <>
       <Navbar />
 
-      <main id="main-content" tabIndex={-1} className={css("messages-page")}>
+      <main ref={viewportRef} id="main-content" tabIndex={-1} className={css("messages-page")}>
         <div className={css("messages-card")}>
           {error && <StatusMessage tone="error" className={css("error chat-page-error")}>{error}</StatusMessage>}
 
```

## src/pages/Notifications.jsx

Updated. Present human-readable notification types and safe timestamp text.

### Full current content

```jsx
import { formatTimestamp, notificationLabel } from "../utils/displayText.js";
import { apiErrorMessage } from "../utils/apiError.js";
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
        apiErrorMessage(error, "Unable to mark notification as read"),
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
        apiErrorMessage(error, "Unable to mark all notifications as read"),
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
                          ? formatTimestamp(notification.createdAt)
                          : ""}
                      </span>

                      {notification.type && (
                        <span className={css("notification-type")}>
                          {notificationLabel(notification.type)}
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
@@ -1,3 +1,4 @@
+import { formatTimestamp, notificationLabel } from "../utils/displayText.js";
 import { apiErrorMessage } from "../utils/apiError.js";
 import notificationsStyles from "../styles/notifications.module.css";
 import { bindStyles } from "../utils/bindStyles";
@@ -184,13 +185,13 @@
                     <div className={css("notification-meta")}>
                       <span>
                         {notification.createdAt
-                          ? new Date(notification.createdAt).toLocaleString()
+                          ? formatTimestamp(notification.createdAt)
                           : ""}
                       </span>
 
                       {notification.type && (
                         <span className={css("notification-type")}>
-                          {notification.type}
+                          {notificationLabel(notification.type)}
                         </span>
                       )}
                     </div>
```

## src/pages/Profile.jsx

Updated. Use the same safe timestamp formatter instead of repeated inline date construction.

### Full current content

```jsx
import { formatTimestamp } from "../utils/displayText.js";
import { apiError } from "../utils/apiError";
import { apiErrorMessage } from "../utils/apiError.js";
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

const ProfileForm = () => {
  const { user, loading: authLoading, updateUser, sessionKey } = useAuth();
  const profile = user;
  const busy = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const [nameDraft, setName] = useState(null);
  const name = nameDraft ?? user?.name ?? "";

  const [bioDraft, setBio] = useState(null);
  const bio = bioDraft ?? user?.bio ?? "";

  const [loading, setLoading] = useState(false);

  const [imageLoading, setImageLoading] = useState(false);

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [success, setSuccess] = useState("");

  const [previewImage, setPreviewImage] = useState(null);

  const fileInputRef = useRef(null);

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
    if (busy.current) return;
    busy.current = true;

    setError("");
    setFieldErrors({});
    setSuccess("");
    setLoading(true);

    try {
      const updatedUser = await updateProfile(name.trim(), bio.trim());

      if (!mounted.current || !updateUser(updatedUser, sessionKey)) return;
      setName(null);
      setBio(null);

      setSuccess("Profile updated successfully.");
    } catch (error) {
      if (!mounted.current) return;
      setFieldErrors(apiError(error).fieldErrors);
      console.error("Profile update failed:", error);

      setError(apiErrorMessage(error, "Failed to update profile"));
    } finally {
      busy.current = false;
      if (mounted.current) setLoading(false);
    }
  };

  // ==================================================
  // IMAGE SELECTION
  // ==================================================

  const handleImageChange = (event) => {
    if (busy.current) return;
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please select a JPEG, PNG or WebP image.");
      return;
    }

    setError("");
    setFieldErrors({});
    setSuccess("");

    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }

    const previewUrl = URL.createObjectURL(file);

    setPreviewImage(previewUrl);

    void handleImageUpload(file);
  };

  // ==================================================
  // IMAGE UPLOAD
  // ==================================================

  const handleImageUpload = async (file) => {
    busy.current = true;
    setImageLoading(true);

    setError("");
    setFieldErrors({});
    setSuccess("");

    try {
      const updatedUser = await updateProfileImage(file);

      if (!mounted.current || !updateUser(updatedUser, sessionKey)) return;

      setSuccess("Profile image updated successfully.");

      setPreviewImage(null);
    } catch (error) {
      if (!mounted.current) return;
      setFieldErrors(apiError(error).fieldErrors);
      console.error("Profile image upload failed:", error);

      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }

      setPreviewImage(null);

      setError(
        apiErrorMessage(error, "Failed to upload profile image"),
      );
    } finally {
      busy.current = false;
      if (mounted.current) setImageLoading(false);

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
              disabled={imageLoading || loading}
            >
              {imageLoading ? "Uploading..." : "Change Photo"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              hidden
            />
          </div>

          <form className={css("profile-form")} onSubmit={handleSubmit}>

            <FormField label="Name" error={fieldErrors.name} autoComplete="name"
              type="text"
              disabled={loading || imageLoading}
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              required
            />

            <FormField label="Email" type="email" autoComplete="email" value={profile.email} disabled />

            <FormField as="textarea" label="Bio" error={fieldErrors.bio}
              disabled={loading || imageLoading}
              value={bio}
              maxLength={500}
              rows={5}
              onChange={(event) => setBio(event.target.value)}
            />

            <div className={css("character-count")}>{bio.length}/500</div>

            <button type="submit" disabled={loading || imageLoading}>
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
                ? formatTimestamp(profile.lastSeen)
                : "—"}
            </p>
          </div>
        </Card>
      </PageContainer>
    </>
  );
};

export default function Profile() {
  const { user, sessionKey } = useAuth();
  return <ProfileForm key={`${sessionKey}:${user?.id}`} />;
}
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/Profile.jsx
+++ after/src/pages/Profile.jsx
@@ -1,3 +1,4 @@
+import { formatTimestamp } from "../utils/displayText.js";
 import { apiError } from "../utils/apiError";
 import { apiErrorMessage } from "../utils/apiError.js";
 import profileStyles from "../styles/profile.module.css";
@@ -251,7 +252,7 @@
             <p>
               <strong>Last seen:</strong>{" "}
               {profile.lastSeen
-                ? new Date(profile.lastSeen).toLocaleString()
+                ? formatTimestamp(profile.lastSeen)
                 : "—"}
             </p>
           </div>
```

## src/pages/UserProfile.jsx

Updated. Use the same safe timestamp formatter instead of repeated inline date construction.

### Full current content

```jsx
import { formatTimestamp } from "../utils/displayText.js";
import { apiErrorMessage } from "../utils/apiError.js";
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
          apiErrorMessage(error, "Unable to load user profile"),
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
          apiErrorMessage(error, "Unable to load friendship status"),
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
        apiErrorMessage(error, "Unable to send friend request"),
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
        apiErrorMessage(error, "Unable to accept friend request"),
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
        apiErrorMessage(error, "Unable to reject friend request"),
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
        apiErrorMessage(error, "Unable to remove friend"),
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
                {user.lastSeen ? formatTimestamp(user.lastSeen) : "—"}
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
@@ -1,3 +1,4 @@
+import { formatTimestamp } from "../utils/displayText.js";
 import { apiErrorMessage } from "../utils/apiError.js";
 import friendsStyles from "../styles/friends.module.css";
 import profileStyles from "../styles/profile.module.css";
@@ -350,7 +351,7 @@
 
               <p>
                 <strong>Last seen:</strong>{" "}
-                {user.lastSeen ? new Date(user.lastSeen).toLocaleString() : "—"}
+                {user.lastSeen ? formatTimestamp(user.lastSeen) : "—"}
               </p>
             </div>
           </div>
```

## src/styles/chat.module.css

Updated. Use measured mobile chat height, retain safe-area padding and avoid small-text input zoom.

### Full current content

```css
.messages-page {
  width: 100%;
  max-width: 1200px;
  height: var(--chat-available-height, calc(100dvh - var(--navbar-height)));
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
    height: var(--chat-available-height, calc(100dvh - var(--navbar-height)));
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
    height: var(--chat-available-height, calc(100dvh - var(--navbar-height)));
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

@media (max-width: 800px) {
  .message-composer textarea { font-size: 16px; resize: none; }
}
```

### Changes (+ added / - removed)

```diff
--- before/src/styles/chat.module.css
+++ after/src/styles/chat.module.css
@@ -1,7 +1,7 @@
 .messages-page {
   width: 100%;
   max-width: 1200px;
-  height: calc(100dvh - var(--navbar-height));
+  height: var(--chat-available-height, calc(100dvh - var(--navbar-height)));
   margin: 0 auto;
   padding: 24px 20px;
   box-sizing: border-box;
@@ -396,7 +396,7 @@
 
 @media (max-width: 800px) {
   .messages-page {
-    height: calc(100dvh - var(--navbar-height));
+    height: var(--chat-available-height, calc(100dvh - var(--navbar-height)));
     padding: 10px;
   }
 
@@ -433,7 +433,7 @@
 
 @media (max-width: 600px) {
   .messages-page {
-    height: calc(100dvh - var(--navbar-height));
+    height: var(--chat-available-height, calc(100dvh - var(--navbar-height)));
     padding: 0;
   }
 
@@ -542,3 +542,7 @@
   padding: 8px 12px;
   flex-shrink: 0;
 }
+
+@media (max-width: 800px) {
+  .message-composer textarea { font-size: 16px; resize: none; }
+}
```

## src/utils/displayText.js

Added. Readable notification labels and explicit handling of offset-free versus zoned timestamps.

### Full current content

```javascript
const notificationLabels = {
  NEW_MESSAGE: "New message", CHAT_MESSAGE: "New message",
  FRIEND_REQUEST: "Friend request", FRIEND_REQUEST_ACCEPTED: "Friend request accepted",
};
export function notificationLabel(type) {
  return notificationLabels[type] || "Activity";
}

/** Offset-free backend LocalDateTime is a wall clock, not a known UTC instant. */
export function formatTimestamp(value, timeOnly = false, locale) {
  if (typeof value !== "string" || !value.trim()) return "—";
  const wallClock = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value);
  const zoned = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  if (!wallClock && !zoned) return "—";
  // UTC formatting here preserves the supplied clock fields; it does not infer UTC storage.
  const date = new Date(wallClock ? `${value}Z` : value);
  if (Number.isNaN(date.getTime())) return "—";
  if (wallClock && date.toISOString().slice(0, 16) !== value.slice(0, 16)) return "—";
  const options = timeOnly ? { hour: "2-digit", minute: "2-digit" }
    : { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
  if (wallClock) options.timeZone = "UTC";
  return new Intl.DateTimeFormat(locale, options).format(date);
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/utils/displayText.js
@@ -0,0 +1,23 @@
+const notificationLabels = {
+  NEW_MESSAGE: "New message", CHAT_MESSAGE: "New message",
+  FRIEND_REQUEST: "Friend request", FRIEND_REQUEST_ACCEPTED: "Friend request accepted",
+};
+export function notificationLabel(type) {
+  return notificationLabels[type] || "Activity";
+}
+
+/** Offset-free backend LocalDateTime is a wall clock, not a known UTC instant. */
+export function formatTimestamp(value, timeOnly = false, locale) {
+  if (typeof value !== "string" || !value.trim()) return "—";
+  const wallClock = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value);
+  const zoned = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
+  if (!wallClock && !zoned) return "—";
+  // UTC formatting here preserves the supplied clock fields; it does not infer UTC storage.
+  const date = new Date(wallClock ? `${value}Z` : value);
+  if (Number.isNaN(date.getTime())) return "—";
+  if (wallClock && date.toISOString().slice(0, 16) !== value.slice(0, 16)) return "—";
+  const options = timeOnly ? { hour: "2-digit", minute: "2-digit" }
+    : { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
+  if (wallClock) options.timeZone = "UTC";
+  return new Intl.DateTimeFormat(locale, options).format(date);
+}
```

## tests/displayText.test.js

Added. Unit and browser release checks for the phase-specific behaviours.

### Full current content

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { formatTimestamp, notificationLabel } from "../src/utils/displayText.js";

test("known notification types have readable labels and unknown types stay generic",()=>{
  assert.equal(notificationLabel("NEW_MESSAGE"),"New message");
  assert.equal(notificationLabel("FRIEND_REQUEST_ACCEPTED"),"Friend request accepted");
  assert.equal(notificationLabel("PRIVATE_INTERNAL_NAME"),"Activity");
});
test("invalid or missing timestamps never render Invalid Date",()=>{
  for(const value of [undefined,null,"","nonsense","2026-02-31T10:00:00"]) assert.equal(formatTimestamp(value),"—");
});
test("offset-free clock fields are preserved across viewer timezones",()=>{
  const previous=process.env.TZ;
  try {
    process.env.TZ="America/New_York";
    const us=formatTimestamp("2026-09-19T10:15:00",true,"en-GB");
    process.env.TZ="Asia/Kolkata";
    assert.equal(formatTimestamp("2026-09-19T10:15:00",true,"en-GB"),us);
    assert.equal(us,"10:15");
    assert.equal(formatTimestamp("2026-09-19T10:15:00Z",true,"en-GB"),"15:45");
  } finally { if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous; }
});
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/tests/displayText.test.js
@@ -0,0 +1,23 @@
+import test from "node:test";
+import assert from "node:assert/strict";
+import { formatTimestamp, notificationLabel } from "../src/utils/displayText.js";
+
+test("known notification types have readable labels and unknown types stay generic",()=>{
+  assert.equal(notificationLabel("NEW_MESSAGE"),"New message");
+  assert.equal(notificationLabel("FRIEND_REQUEST_ACCEPTED"),"Friend request accepted");
+  assert.equal(notificationLabel("PRIVATE_INTERNAL_NAME"),"Activity");
+});
+test("invalid or missing timestamps never render Invalid Date",()=>{
+  for(const value of [undefined,null,"","nonsense","2026-02-31T10:00:00"]) assert.equal(formatTimestamp(value),"—");
+});
+test("offset-free clock fields are preserved across viewer timezones",()=>{
+  const previous=process.env.TZ;
+  try {
+    process.env.TZ="America/New_York";
+    const us=formatTimestamp("2026-09-19T10:15:00",true,"en-GB");
+    process.env.TZ="Asia/Kolkata";
+    assert.equal(formatTimestamp("2026-09-19T10:15:00",true,"en-GB"),us);
+    assert.equal(us,"10:15");
+    assert.equal(formatTimestamp("2026-09-19T10:15:00Z",true,"en-GB"),"15:45");
+  } finally { if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous; }
+});
```

## tests/release.browser.mjs

Added. Unit and browser release checks for the phase-specific behaviours.

### Full current content

```javascript
import { createServer } from "../node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin="http://127.0.0.1:41818";
process.env.VITE_API_BASE_URL=origin;process.env.VITE_WS_URL=origin.replace("http","ws")+"/ws";
const server=await createServer({root:fileURLToPath(new URL("..",import.meta.url)),server:{host:"127.0.0.1",port:41818,strictPort:true}});
const user={id:1,name:"Review",email:"review@example.invalid"},friend={id:2,name:"Friend"};
let browser,oldRoute,failPage=true;
const errors=[];
try {
  await server.listen();browser=await chromium.launch({channel:"msedge",headless:true});
  const page=await browser.newPage({viewport:{width:390,height:900}});
  page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(user=>{
    localStorage.setItem("frndbook_access_token","x."+btoa(JSON.stringify({exp:9999999999}))+".x");
    localStorage.setItem("frndbook_refresh_token","fixture");localStorage.setItem("frndbook_user",JSON.stringify(user));
  },user);
  await page.route("**/*",route=>{
    const url=new URL(route.request().url());assert.equal(url.origin,origin);
    if(!url.pathname.startsWith("/api/"))return route.continue();
    let body=[];
    if(url.pathname==="/api/users/me")body=user;
    else if(url.pathname==="/api/users/search") {
      const query=url.searchParams.get("name"),number=Number(url.searchParams.get("page"));
      if(query==="old"){oldRoute=route;return;}
      if(number===1&&failPage)return route.fulfill({status:503,json:{message:"Search temporarily unavailable"}});
      body={content:[{...friend,name:number===1?"Page two":"Latest result"}],number,totalPages:2};
    } else if(url.pathname.endsWith("unread-count"))body=1;
    else if(url.pathname==="/api/notifications")body={content:[{id:1,type:"NEW_MESSAGE",message:"Example message",createdAt:"invalid",read:false}],number:0,totalPages:1};
    else if(url.pathname==="/api/conversations")body=[{id:12,otherUser:friend,updatedAt:"2026-09-19T10:15:00"}];
    else if(url.pathname.endsWith("/messages"))body={content:[{id:1,conversationId:12,sender:friend,content:"Example chat",createdAt:"2026-09-19T10:15:00"}],last:true,totalPages:1};
    return route.fulfill({json:body});
  });
  await page.routeWebSocket("**/*",socket=>socket.onMessage(frame=>{
    if(/^(CONNECT|STOMP)/.test(String(frame)))socket.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
    if(String(frame).startsWith("DISCONNECT"))socket.close();
  }));
  await page.goto(origin+"/");assert.equal(await page.title(),"FrndBook");
  const search=page.getByRole("textbox",{name:"Search people by name"});
  await search.fill("old");await page.getByRole("status").filter({hasText:"Searching..."}).waitFor();
  assert.equal(await page.getByText("No users found.",{exact:true}).count(),0);
  for(let i=0;!oldRoute&&i<100;i++)await new Promise(r=>setTimeout(r,10));assert.ok(oldRoute);
  await search.fill("new");await page.getByText("Latest result",{exact:true}).waitFor();
  await oldRoute.fulfill({json:{content:[{...friend,name:"Obsolete result"}],number:0,totalPages:1}}).catch(()=>{});
  assert.equal(await page.getByText("Obsolete result",{exact:true}).count(),0);
  await page.getByRole("button",{name:"Next",exact:true}).click();
  await page.getByRole("button",{name:"Retry search"}).waitFor();
  failPage=false;await page.getByRole("button",{name:"Retry search"}).click();await page.getByText("Page two",{exact:true}).waitFor();
  await search.fill("");assert.equal(await page.getByText("Page two",{exact:true}).count(),0);
  assert.equal(await page.getByText("Searching...",{exact:true}).count(),0);
  await page.goto(origin+"/notifications");await page.getByText("New message",{exact:true}).waitFor();
  assert.equal(await page.getByText("NEW_MESSAGE",{exact:true}).count(),0);
  assert.equal(await page.getByText("Invalid Date",{exact:true}).count(),0);
  await page.goto(origin+"/messages");await page.locator(".conversation-item").first().click();
  await page.getByRole("textbox",{name:"Message",exact:true}).waitFor();
  // Simulate an overlay keyboard: visual viewport shrinks while layout viewport stays tall.
  await page.evaluate(()=>{
    Object.defineProperty(window.visualViewport,"height",{configurable:true,get:()=>400});
    window.visualViewport.dispatchEvent(new Event("resize"));
  });
  await page.waitForFunction(()=>{
    const composer=document.querySelector(".message-composer");
    return composer && composer.getBoundingClientRect().bottom<=401;
  });
  const bounds=await page.locator(".message-composer").boundingBox();assert.ok(bounds.y>=0&&bounds.y+bounds.height<=401);
  assert.equal(await page.getByRole("textbox",{name:"Message",exact:true}).evaluate(el=>getComputedStyle(el).fontSize),"16px");
  if(process.env.RELEASE_SCREENSHOT_DIR){await mkdir(process.env.RELEASE_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:process.env.RELEASE_SCREENSHOT_DIR+"/mobile-keyboard-layout.png",fullPage:true});}
  await page.evaluate(()=>{delete window.visualViewport.height;window.visualViewport.dispatchEvent(new Event("resize"));});
  await page.setViewportSize({width:1280,height:900});
  await page.waitForFunction(()=>!document.querySelector(".messages-page").style.getPropertyValue("--chat-available-height"));
  await page.getByRole("textbox",{name:"Message",exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log("PASS: title, pending search and stale-response isolation, failed-page retry, empty query cleanup, readable notifications, invalid dates, simulated keyboard viewport and desktop restoration.");
} finally {await browser?.close();await server.close();}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/tests/release.browser.mjs
@@ -0,0 +1,76 @@
+import { createServer } from "../node_modules/vite/dist/node/index.js";
+import { fileURLToPath } from "node:url";
+import assert from "node:assert/strict";
+import { mkdir } from "node:fs/promises";
+const { chromium }=await import(process.env.PLAYWRIGHT_MODULE || "playwright");
+const origin="http://127.0.0.1:41818";
+process.env.VITE_API_BASE_URL=origin;process.env.VITE_WS_URL=origin.replace("http","ws")+"/ws";
+const server=await createServer({root:fileURLToPath(new URL("..",import.meta.url)),server:{host:"127.0.0.1",port:41818,strictPort:true}});
+const user={id:1,name:"Review",email:"review@example.invalid"},friend={id:2,name:"Friend"};
+let browser,oldRoute,failPage=true;
+const errors=[];
+try {
+  await server.listen();browser=await chromium.launch({channel:"msedge",headless:true});
+  const page=await browser.newPage({viewport:{width:390,height:900}});
+  page.on("pageerror",e=>errors.push(e.message));
+  await page.addInitScript(user=>{
+    localStorage.setItem("frndbook_access_token","x."+btoa(JSON.stringify({exp:9999999999}))+".x");
+    localStorage.setItem("frndbook_refresh_token","fixture");localStorage.setItem("frndbook_user",JSON.stringify(user));
+  },user);
+  await page.route("**/*",route=>{
+    const url=new URL(route.request().url());assert.equal(url.origin,origin);
+    if(!url.pathname.startsWith("/api/"))return route.continue();
+    let body=[];
+    if(url.pathname==="/api/users/me")body=user;
+    else if(url.pathname==="/api/users/search") {
+      const query=url.searchParams.get("name"),number=Number(url.searchParams.get("page"));
+      if(query==="old"){oldRoute=route;return;}
+      if(number===1&&failPage)return route.fulfill({status:503,json:{message:"Search temporarily unavailable"}});
+      body={content:[{...friend,name:number===1?"Page two":"Latest result"}],number,totalPages:2};
+    } else if(url.pathname.endsWith("unread-count"))body=1;
+    else if(url.pathname==="/api/notifications")body={content:[{id:1,type:"NEW_MESSAGE",message:"Example message",createdAt:"invalid",read:false}],number:0,totalPages:1};
+    else if(url.pathname==="/api/conversations")body=[{id:12,otherUser:friend,updatedAt:"2026-09-19T10:15:00"}];
+    else if(url.pathname.endsWith("/messages"))body={content:[{id:1,conversationId:12,sender:friend,content:"Example chat",createdAt:"2026-09-19T10:15:00"}],last:true,totalPages:1};
+    return route.fulfill({json:body});
+  });
+  await page.routeWebSocket("**/*",socket=>socket.onMessage(frame=>{
+    if(/^(CONNECT|STOMP)/.test(String(frame)))socket.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
+    if(String(frame).startsWith("DISCONNECT"))socket.close();
+  }));
+  await page.goto(origin+"/");assert.equal(await page.title(),"FrndBook");
+  const search=page.getByRole("textbox",{name:"Search people by name"});
+  await search.fill("old");await page.getByRole("status").filter({hasText:"Searching..."}).waitFor();
+  assert.equal(await page.getByText("No users found.",{exact:true}).count(),0);
+  for(let i=0;!oldRoute&&i<100;i++)await new Promise(r=>setTimeout(r,10));assert.ok(oldRoute);
+  await search.fill("new");await page.getByText("Latest result",{exact:true}).waitFor();
+  await oldRoute.fulfill({json:{content:[{...friend,name:"Obsolete result"}],number:0,totalPages:1}}).catch(()=>{});
+  assert.equal(await page.getByText("Obsolete result",{exact:true}).count(),0);
+  await page.getByRole("button",{name:"Next",exact:true}).click();
+  await page.getByRole("button",{name:"Retry search"}).waitFor();
+  failPage=false;await page.getByRole("button",{name:"Retry search"}).click();await page.getByText("Page two",{exact:true}).waitFor();
+  await search.fill("");assert.equal(await page.getByText("Page two",{exact:true}).count(),0);
+  assert.equal(await page.getByText("Searching...",{exact:true}).count(),0);
+  await page.goto(origin+"/notifications");await page.getByText("New message",{exact:true}).waitFor();
+  assert.equal(await page.getByText("NEW_MESSAGE",{exact:true}).count(),0);
+  assert.equal(await page.getByText("Invalid Date",{exact:true}).count(),0);
+  await page.goto(origin+"/messages");await page.locator(".conversation-item").first().click();
+  await page.getByRole("textbox",{name:"Message",exact:true}).waitFor();
+  // Simulate an overlay keyboard: visual viewport shrinks while layout viewport stays tall.
+  await page.evaluate(()=>{
+    Object.defineProperty(window.visualViewport,"height",{configurable:true,get:()=>400});
+    window.visualViewport.dispatchEvent(new Event("resize"));
+  });
+  await page.waitForFunction(()=>{
+    const composer=document.querySelector(".message-composer");
+    return composer && composer.getBoundingClientRect().bottom<=401;
+  });
+  const bounds=await page.locator(".message-composer").boundingBox();assert.ok(bounds.y>=0&&bounds.y+bounds.height<=401);
+  assert.equal(await page.getByRole("textbox",{name:"Message",exact:true}).evaluate(el=>getComputedStyle(el).fontSize),"16px");
+  if(process.env.RELEASE_SCREENSHOT_DIR){await mkdir(process.env.RELEASE_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:process.env.RELEASE_SCREENSHOT_DIR+"/mobile-keyboard-layout.png",fullPage:true});}
+  await page.evaluate(()=>{delete window.visualViewport.height;window.visualViewport.dispatchEvent(new Event("resize"));});
+  await page.setViewportSize({width:1280,height:900});
+  await page.waitForFunction(()=>!document.querySelector(".messages-page").style.getPropertyValue("--chat-available-height"));
+  await page.getByRole("textbox",{name:"Message",exact:true}).waitFor();
+  assert.deepEqual(errors,[]);
+  console.log("PASS: title, pending search and stale-response isolation, failed-page retry, empty query cleanup, readable notifications, invalid dates, simulated keyboard viewport and desktop restoration.");
+} finally {await browser?.close();await server.close();}
```

