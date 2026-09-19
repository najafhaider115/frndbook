# fbfrontend - Phase 9.1-9.3: Full code and changes

Paths are relative to the frontend root. Every changed current file is provided in full. Phase 8.4 is the baseline. New files have an empty before-version.

## src/api/axiosClient.js

Updated. Scope requests and refresh flights to the local login; discard stale work and retain credentials on transient refresh failures.

### Full current content

```javascript
import axios from "axios";

import { tokenStorage } from "../utils/tokenStorage";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,

  // ISSUE FIX:
  // Do not set Content-Type globally.
  // Profile image uploads use FormData and must be sent as
  // multipart/form-data with the boundary generated automatically.
});

// ==================================================
// REFRESH STATE
// ==================================================

let refreshFlight = null;

export const refreshAccessToken = () => {
  const refreshToken = tokenStorage.getRefreshToken();
  const session = tokenStorage.getSessionId();
  if (!refreshToken) return Promise.reject(new Error("Refresh token is not available"));
  if (refreshFlight?.token === refreshToken && refreshFlight.session === session) return refreshFlight.promise;
  const flight = { token: refreshToken, session };
  const stillCurrent = () => tokenStorage.getRefreshToken() === refreshToken && tokenStorage.getSessionId() === session;
  flight.promise = axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh`, { refreshToken })
    .then(response => {
      if (!stillCurrent()) throw new Error("Authentication changed while refreshing");
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      if (!accessToken) throw new Error("Invalid refresh response");
      tokenStorage.updateTokens(accessToken, newRefreshToken);
      return accessToken;
    })
    .catch(error => {
      // A temporary outage is not evidence that a session has been revoked.
      if (stillCurrent() && [401, 403].includes(error.response?.status)) tokenStorage.clear();
      throw error;
    })
    .finally(() => { if (refreshFlight === flight) refreshFlight = null; });
  refreshFlight = flight;
  return flight.promise;
};

// ==================================================
// REQUEST INTERCEPTOR
// ==================================================

axiosClient.interceptors.request.use(
  (config) => {
    const session = tokenStorage.getSessionId();
    if (config._sessionCaptured && config._authSession !== session) {
      return Promise.reject(new axios.CanceledError("Session changed"));
    }
    config._sessionCaptured = true;
    config._authSession = session;
    const accessToken = tokenStorage.getAccessToken();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  },
);

// ==================================================
// RESPONSE INTERCEPTOR
// ==================================================

axiosClient.interceptors.response.use(
  (response) => {
    if (response.config._authSession !== tokenStorage.getSessionId()) throw new axios.CanceledError("Session changed");
    return response;
  },

  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest || (originalRequest._sessionCaptured && originalRequest._authSession !== tokenStorage.getSessionId())) return Promise.reject(error);

    // ------------------------------------------
    // Only handle 401
    // ------------------------------------------

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // ------------------------------------------
    // Prevent infinite retry
    // ------------------------------------------

    if (originalRequest?._retry) {
      return Promise.reject(error);
    }

    // ------------------------------------------
    // Never refresh these endpoints
    // ------------------------------------------

    const requestUrl = originalRequest?.url || "";

    /*
     * ISSUE FIX:
     * All public authentication endpoints must bypass
     * the access-token refresh flow.
     */
    if (
      requestUrl.includes("/api/auth/login") ||
      requestUrl.includes("/api/auth/signup") ||
      requestUrl.includes("/api/auth/verify-email") ||
      requestUrl.includes("/api/auth/resend-verification") ||
      requestUrl.includes("/api/auth/refresh") ||
      requestUrl.includes("/api/auth/forgot-password") ||
      requestUrl.includes("/api/auth/reset-password")
    ) {
      return Promise.reject(error);
    }

    // ------------------------------------------
    // Mark request
    // ------------------------------------------

    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return axiosClient(originalRequest);
    } catch (refreshError) {
      /*
       * Refresh failed completely.
       * The shared refresh function has already
       * cleared authentication.
       */

      // AuthContext reacts to auth-cleared; transient failures stay retryable.

      return Promise.reject(refreshError);
    }
  },
);

export default axiosClient;
```

### Changes (+ added / - removed)

```diff
--- before/src/api/axiosClient.js
+++ after/src/api/axiosClient.js
@@ -15,51 +15,31 @@
 // REFRESH STATE
 // ==================================================
 
-let refreshPromise = null;
+let refreshFlight = null;
 
-// ==================================================
-// REFRESH ACCESS TOKEN
-// ==================================================
-
-export const refreshAccessToken = async () => {
-  /*
-   * If another refresh is already running,
-   * everyone waits for that same request.
-   */
-  if (refreshPromise) {
-    return refreshPromise;
-  }
-
+export const refreshAccessToken = () => {
   const refreshToken = tokenStorage.getRefreshToken();
-
-  if (!refreshToken) {
-    throw new Error("Refresh token is not available");
-  }
-
-  refreshPromise = axios
-    .post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh`, {
-      refreshToken,
-    })
-    .then((response) => {
-      if (tokenStorage.getRefreshToken() !== refreshToken) {
-        throw new Error("Authentication changed while refreshing");
-      }
+  const session = tokenStorage.getSessionId();
+  if (!refreshToken) return Promise.reject(new Error("Refresh token is not available"));
+  if (refreshFlight?.token === refreshToken && refreshFlight.session === session) return refreshFlight.promise;
+  const flight = { token: refreshToken, session };
+  const stillCurrent = () => tokenStorage.getRefreshToken() === refreshToken && tokenStorage.getSessionId() === session;
+  flight.promise = axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh`, { refreshToken })
+    .then(response => {
+      if (!stillCurrent()) throw new Error("Authentication changed while refreshing");
       const { accessToken, refreshToken: newRefreshToken } = response.data;
-
+      if (!accessToken) throw new Error("Invalid refresh response");
       tokenStorage.updateTokens(accessToken, newRefreshToken);
-
       return accessToken;
     })
-    .catch((error) => {
-      if (tokenStorage.getRefreshToken() === refreshToken) tokenStorage.clear();
-
+    .catch(error => {
+      // A temporary outage is not evidence that a session has been revoked.
+      if (stillCurrent() && [401, 403].includes(error.response?.status)) tokenStorage.clear();
       throw error;
     })
-    .finally(() => {
-      refreshPromise = null;
-    });
-
-  return refreshPromise;
+    .finally(() => { if (refreshFlight === flight) refreshFlight = null; });
+  refreshFlight = flight;
+  return flight.promise;
 };
 
 // ==================================================
@@ -68,6 +48,12 @@
 
 axiosClient.interceptors.request.use(
   (config) => {
+    const session = tokenStorage.getSessionId();
+    if (config._sessionCaptured && config._authSession !== session) {
+      return Promise.reject(new axios.CanceledError("Session changed"));
+    }
+    config._sessionCaptured = true;
+    config._authSession = session;
     const accessToken = tokenStorage.getAccessToken();
 
     if (accessToken) {
@@ -88,11 +74,13 @@
 
 axiosClient.interceptors.response.use(
   (response) => {
+    if (response.config._authSession !== tokenStorage.getSessionId()) throw new axios.CanceledError("Session changed");
     return response;
   },
 
   async (error) => {
     const originalRequest = error.config;
+    if (!originalRequest || (originalRequest._sessionCaptured && originalRequest._authSession !== tokenStorage.getSessionId())) return Promise.reject(error);
 
     // ------------------------------------------
     // Only handle 401
@@ -152,7 +140,7 @@
        * cleared authentication.
        */
 
-      window.location.href = "/login";
+      // AuthContext reacts to auth-cleared; transient failures stay retryable.
 
       return Promise.reject(refreshError);
     }
```

## src/auth/AuthContext.jsx

Updated. Shared profile updater, server-validated session initialization, lifecycle guards and same-tab/cross-tab authentication events.

### Full current content

```jsx
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { login as loginApi, signup as signupApi, logout as logoutApi } from "../api/authApi";
import { getCurrentUser } from "../api/userApi";
import { tokenStorage, AUTH_CLEARED_EVENT } from "../utils/tokenStorage";
import { apiErrorMessage } from "../utils/apiError";

const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const request = useRef(0);
  const mounted = useRef(false);
  const currentUser = useRef(null);
  const replaceUser = useCallback(value => { currentUser.current = value; setUser(value); }, []);
  const retryAuth = useCallback(async () => {
    const version = ++request.current;
    const session = tokenStorage.getSessionId();
    const current = () => mounted.current && version === request.current && session === tokenStorage.getSessionId();
    setAuthError("");
    if (!tokenStorage.getAccessToken()) { replaceUser(null); setLoading(false); return; }
    if (!currentUser.current) setLoading(true);
    try {
      const account = await getCurrentUser();
      if (!current() || !tokenStorage.getAccessToken()) return;
      replaceUser(account);
      tokenStorage.updateUser(account);
    } catch (error) {
      if (!current()) return;
      replaceUser(null);
      if ([401,403].includes(error.response?.status)) tokenStorage.clear();
      else setAuthError(apiErrorMessage(error, "Unable to verify your session. Please retry."));
    } finally { if (current()) setLoading(false); }
  }, [replaceUser]);

  useEffect(() => {
    mounted.current = true;
    const cleared = () => { ++request.current; replaceUser(null); setAuthError(""); setLoading(false); };
    let storageTimer;
    const storageChanged = event => {
      if (event.storageArea !== localStorage) return;
      if (event.key === null || (event.key === "frndbook_access_token" && !tokenStorage.getAccessToken())) {
        // Notify every local subscriber, including the live connections.
        window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
      } else if (["frndbook_session", "frndbook_user"].includes(event.key)) {
        if (event.key === "frndbook_session") window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
        clearTimeout(storageTimer);
        storageTimer = setTimeout(() => {
          if (tokenStorage.getAccessToken()) void retryAuth();
        }, 0);
      }
    };
    window.addEventListener(AUTH_CLEARED_EVENT, cleared);
    window.addEventListener("storage", storageChanged);
    // Bootstrap synchronizes external credentials with React state.
    void retryAuth();
    const invalidate = () => { mounted.current = false; ++request.current; };
    return () => {
      invalidate(); clearTimeout(storageTimer);
      window.removeEventListener(AUTH_CLEARED_EVENT, cleared);
      window.removeEventListener("storage", storageChanged);
    };
  }, [replaceUser, retryAuth]);

  const login = async (email, password) => {
    const version = ++request.current;
    const response = await loginApi({ email, password });
    if (!mounted.current || version !== request.current) throw new Error("Login was superseded");
    tokenStorage.saveAuth(response.accessToken, response.refreshToken, response.user);
    replaceUser(response.user); setAuthError(""); setLoading(false);
    return response;
  };
  const signup = (name, email, password) => signupApi({ name, email, password });
  const logout = async () => {
    const session = tokenStorage.getSessionId();
    ++request.current;
    try { await logoutApi(); }
    catch { /* Local logout still completes when the request fails. */ }
    finally { if (session === tokenStorage.getSessionId()) tokenStorage.clear(); }
  };
  const updateUser = useCallback((account, expectedSession) => {
    if (!mounted.current || !tokenStorage.getAccessToken() || expectedSession !== tokenStorage.getSessionId() ||
      String(account?.id) !== String(currentUser.current?.id)) return false;
    ++request.current; // An older /me response must not undo a saved profile.
    replaceUser(account); tokenStorage.updateUser(account);
    return true;
  }, [replaceUser]);

  return <AuthContext.Provider value={{ user, loading, authError, retryAuth,
    sessionKey: tokenStorage.getSessionId(), isAuthenticated: !!user, login, signup, logout, updateUser }}>
    {children}
  </AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
```

### Changes (+ added / - removed)

```diff
--- before/src/auth/AuthContext.jsx
+++ after/src/auth/AuthContext.jsx
@@ -1,156 +1,98 @@
-import { createContext, useContext, useEffect, useState } from "react";
-
-import {
-  login as loginApi,
-  signup as signupApi,
-  logout as logoutApi,
-} from "../api/authApi";
-
+import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
+import { login as loginApi, signup as signupApi, logout as logoutApi } from "../api/authApi";
 import { getCurrentUser } from "../api/userApi";
-
-import { tokenStorage } from "../utils/tokenStorage";
+import { tokenStorage, AUTH_CLEARED_EVENT } from "../utils/tokenStorage";
+import { apiErrorMessage } from "../utils/apiError";
 
 const AuthContext = createContext(null);
-
 export const AuthProvider = ({ children }) => {
   const [user, setUser] = useState(null);
-
   const [loading, setLoading] = useState(true);
-
-  // ==================================================
-  // INITIALIZE AUTHENTICATION
-  // ==================================================
+  const [authError, setAuthError] = useState("");
+  const request = useRef(0);
+  const mounted = useRef(false);
+  const currentUser = useRef(null);
+  const replaceUser = useCallback(value => { currentUser.current = value; setUser(value); }, []);
+  const retryAuth = useCallback(async () => {
+    const version = ++request.current;
+    const session = tokenStorage.getSessionId();
+    const current = () => mounted.current && version === request.current && session === tokenStorage.getSessionId();
+    setAuthError("");
+    if (!tokenStorage.getAccessToken()) { replaceUser(null); setLoading(false); return; }
+    if (!currentUser.current) setLoading(true);
+    try {
+      const account = await getCurrentUser();
+      if (!current() || !tokenStorage.getAccessToken()) return;
+      replaceUser(account);
+      tokenStorage.updateUser(account);
+    } catch (error) {
+      if (!current()) return;
+      replaceUser(null);
+      if ([401,403].includes(error.response?.status)) tokenStorage.clear();
+      else setAuthError(apiErrorMessage(error, "Unable to verify your session. Please retry."));
+    } finally { if (current()) setLoading(false); }
+  }, [replaceUser]);
 
   useEffect(() => {
-    const initializeAuth = async () => {
-      const accessToken = tokenStorage.getAccessToken();
-
-      // --------------------------------------
-      // No token = not authenticated
-      // --------------------------------------
-
-      if (!accessToken) {
-        setUser(null);
-
-        setLoading(false);
-
-        return;
-      }
-
-      try {
-        /*
-         * Backend is the source of truth.
-         *
-         * We do NOT simply trust
-         * frndbook_user from localStorage.
-         *
-         * If access token is expired,
-         * axiosClient automatically attempts
-         * refresh and retries this request.
-         */
-
-        const currentUser = await getCurrentUser();
-
-        setUser(currentUser);
-
-        tokenStorage.updateUser(currentUser);
-      } catch (error) {
-        console.error("Authentication initialization failed:", error);
-
-        tokenStorage.clear();
-
-        setUser(null);
-      } finally {
-        setLoading(false);
+    mounted.current = true;
+    const cleared = () => { ++request.current; replaceUser(null); setAuthError(""); setLoading(false); };
+    let storageTimer;
+    const storageChanged = event => {
+      if (event.storageArea !== localStorage) return;
+      if (event.key === null || (event.key === "frndbook_access_token" && !tokenStorage.getAccessToken())) {
+        // Notify every local subscriber, including the live connections.
+        window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
+      } else if (["frndbook_session", "frndbook_user"].includes(event.key)) {
+        if (event.key === "frndbook_session") window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
+        clearTimeout(storageTimer);
+        storageTimer = setTimeout(() => {
+          if (tokenStorage.getAccessToken()) void retryAuth();
+        }, 0);
       }
     };
-
-    initializeAuth();
-  }, []);
-
-  // ==================================================
-  // LOGIN
-  // ==================================================
+    window.addEventListener(AUTH_CLEARED_EVENT, cleared);
+    window.addEventListener("storage", storageChanged);
+    // Bootstrap synchronizes external credentials with React state.
+    void retryAuth();
+    const invalidate = () => { mounted.current = false; ++request.current; };
+    return () => {
+      invalidate(); clearTimeout(storageTimer);
+      window.removeEventListener(AUTH_CLEARED_EVENT, cleared);
+      window.removeEventListener("storage", storageChanged);
+    };
+  }, [replaceUser, retryAuth]);
 
   const login = async (email, password) => {
-    const response = await loginApi({
-      email,
-      password,
-    });
-
-    tokenStorage.saveAuth(
-      response.accessToken,
-      response.refreshToken,
-      response.user,
-    );
-
-    setUser(response.user);
-
+    const version = ++request.current;
+    const response = await loginApi({ email, password });
+    if (!mounted.current || version !== request.current) throw new Error("Login was superseded");
+    tokenStorage.saveAuth(response.accessToken, response.refreshToken, response.user);
+    replaceUser(response.user); setAuthError(""); setLoading(false);
     return response;
   };
+  const signup = (name, email, password) => signupApi({ name, email, password });
+  const logout = async () => {
+    const session = tokenStorage.getSessionId();
+    ++request.current;
+    try { await logoutApi(); }
+    catch { /* Local logout still completes when the request fails. */ }
+    finally { if (session === tokenStorage.getSessionId()) tokenStorage.clear(); }
+  };
+  const updateUser = useCallback((account, expectedSession) => {
+    if (!mounted.current || !tokenStorage.getAccessToken() || expectedSession !== tokenStorage.getSessionId() ||
+      String(account?.id) !== String(currentUser.current?.id)) return false;
+    ++request.current; // An older /me response must not undo a saved profile.
+    replaceUser(account); tokenStorage.updateUser(account);
+    return true;
+  }, [replaceUser]);
 
-  // ==================================================
-  // SIGNUP
-  // ==================================================
-
-  const signup = async (name, email, password) => {
-    const response = await signupApi({
-      name,
-      email,
-      password,
-    });
-
-    return response;
-  };
-
-  // ==================================================
-  // LOGOUT
-  // ==================================================
-
-  const logout = async () => {
-    try {
-      await logoutApi();
-    } catch (error) {
-      /*
-       * Even if the backend logout request
-       * fails, remove local authentication.
-       */
-
-      console.error("Logout API failed:", error);
-    } finally {
-      tokenStorage.clear();
-
-      setUser(null);
-    }
-  };
-
-  // ==================================================
-  // CONTEXT VALUE
-  // ==================================================
-
-  const value = {
-    user,
-
-    loading,
-
-    isAuthenticated: !!user,
-
-    login,
-
-    signup,
-
-    logout,
-  };
-
-  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
+  return <AuthContext.Provider value={{ user, loading, authError, retryAuth,
+    sessionKey: tokenStorage.getSessionId(), isAuthenticated: !!user, login, signup, logout, updateUser }}>
+    {children}
+  </AuthContext.Provider>;
 };
-
 export const useAuth = () => {
   const context = useContext(AuthContext);
-
-  if (!context) {
-    throw new Error("useAuth must be used inside AuthProvider");
-  }
-
+  if (!context) throw new Error("useAuth must be used inside AuthProvider");
   return context;
 };
```

## src/auth/ProtectedRoute.jsx

Updated. Expose retryable session-check failures instead of silently removing credentials.

### Full current content

```jsx
import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading, authError, retryAuth } = useAuth();

  if (loading) {
    return <div role="status" className="loading-screen">Loading...</div>;
  }

  if (authError) {
    return <main className="loading-screen"><p role="alert">{authError}</p>
      <button type="button" onClick={retryAuth}>Retry session check</button></main>;
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
@@ -3,10 +3,15 @@
 import { useAuth } from "./AuthContext";
 
 const ProtectedRoute = ({ children }) => {
-  const { user, loading } = useAuth();
+  const { user, loading, authError, retryAuth } = useAuth();
 
   if (loading) {
     return <div role="status" className="loading-screen">Loading...</div>;
+  }
+
+  if (authError) {
+    return <main className="loading-screen"><p role="alert">{authError}</p>
+      <button type="button" onClick={retryAuth}>Retry session check</button></main>;
   }
 
   if (!user) {
```

## src/auth/PublicRoute.jsx

Updated. Expose retryable session-check failures instead of silently removing credentials.

### Full current content

```jsx
import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthContext";

const PublicRoute = ({ children }) => {
  const { user, loading, authError, retryAuth } = useAuth();

  if (loading) {
    return <div role="status" className="loading-screen">Loading...</div>;
  }

  if (authError) {
    return <main className="loading-screen"><p role="alert">{authError}</p>
      <button type="button" onClick={retryAuth}>Retry session check</button></main>;
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
@@ -3,10 +3,15 @@
 import { useAuth } from "./AuthContext";
 
 const PublicRoute = ({ children }) => {
-  const { user, loading } = useAuth();
+  const { user, loading, authError, retryAuth } = useAuth();
 
   if (loading) {
     return <div role="status" className="loading-screen">Loading...</div>;
+  }
+
+  if (authError) {
+    return <main className="loading-screen"><p role="alert">{authError}</p>
+      <button type="button" onClick={retryAuth}>Retry session check</button></main>;
   }
 
   /*
```

## src/components/users/UserSearch.jsx

Updated. Use the shared backend error formatter while retaining existing operation logic.

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

        setError(apiErrorMessage(error, "Unable to search users"));

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

      setError(apiErrorMessage(error, "Unable to load results"));
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
@@ -1,3 +1,4 @@
+import { apiErrorMessage } from "../../utils/apiError.js";
 import usersStyles from "../../styles/users.module.css";
 import { bindStyles } from "../../utils/bindStyles";
 import StatusMessage from "../ui/StatusMessage";
@@ -103,7 +104,7 @@
       } catch (error) {
         console.error("User search failed:", error);
 
-        setError(error.response?.data?.message || "Unable to search users");
+        setError(apiErrorMessage(error, "Unable to search users"));
 
         setResults([]);
       } finally {
@@ -146,7 +147,7 @@
     } catch (error) {
       console.error("Failed to load search page:", error);
 
-      setError(error.response?.data?.message || "Unable to load results");
+      setError(apiErrorMessage(error, "Unable to load results"));
     } finally {
       setLoading(false);
     }
```

## src/context/NotificationContext.jsx

Updated. Use consistent error feedback and remount notification state for each account/session.

### Full current content

```jsx
import { apiErrorMessage } from "../utils/apiError.js";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import { useAuth } from "../auth/AuthContext";

import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../api/notificationApi";

import { createNotificationWebSocket } from "../services/webSocketService";

const NotificationContext = createContext(null);

const NotificationState = ({ children }) => {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const webSocketRef = useRef(null);

  /*
   * Keep track of notification IDs already processed
   * by this client.
   */
  const notificationIdsRef = useRef(new Set());

  // ==================================================
  // RESET WHEN LOGGED OUT
  // ==================================================

  useEffect(() => {
    if (user) {
      return;
    }

    setNotifications([]);
    setUnreadCount(0);
    setError("");
    setLoading(false);

    notificationIdsRef.current.clear();
  }, [user]);

  // ==================================================
  // LOAD INITIAL UNREAD COUNT
  // ==================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    const loadInitialUnreadCount = async () => {
      try {
        setError("");

        const count = await getUnreadNotificationCount();

        if (!cancelled) {
          setUnreadCount(Number(count) || 0);
        }
      } catch (error) {
        console.error("Failed to load notification count:", error);

        if (!cancelled) {
          setUnreadCount(0);
        }
      }
    };

    loadInitialUnreadCount();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // ==================================================
  // WEBSOCKET
  // ==================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    const handleNotification = (notification) => {
      if (cancelled || !notification?.id) {
        return;
      }

      const notificationId = String(notification.id);

      /*
       * Ignore duplicate WebSocket deliveries.
       */
      if (notificationIdsRef.current.has(notificationId)) {
        return;
      }

      /*
       * Mark the notification as processed BEFORE
       * updating React state.
       */
      notificationIdsRef.current.add(notificationId);

      setNotifications((currentNotifications) => {
        /*
         * Extra protection against duplicates already
         * present in the current state.
         */
        const alreadyExists = currentNotifications.some(
          (item) => String(item.id) === notificationId,
        );

        if (alreadyExists) {
          return currentNotifications;
        }

        return [notification, ...currentNotifications];
      });

      /*
       * The notification is known to be new at this
       * point, so updating the unread count is safe.
       */
      if (!notification.read) {
        setUnreadCount((currentCount) => currentCount + 1);
      }
    };

    const handleConnect = () => {
      if (cancelled) {
        return;
      }
    };

    const handleDisconnect = () => {
      if (cancelled) {
        return;
      }
    };

    const handleError = (error) => {
      if (cancelled) {
        return;
      }

      console.error("Notification WebSocket error:", error);
    };

    const webSocket = createNotificationWebSocket({
      onNotification: handleNotification,
      onConnect: handleConnect,
      onDisconnect: handleDisconnect,
      onError: handleError,
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
          console.error("Failed to disconnect notification WebSocket:", error);
        });
      }
    };
  }, [user?.id]);

  // ==================================================
  // LOAD NOTIFICATIONS
  // ==================================================

  const loadNotifications = async (page = 0, size = 10) => {
    try {
      setLoading(true);
      setError("");

      const data = await getNotifications(page, size);

      const loadedNotifications = data?.content || [];

      /*
       * Keep the local ID set synchronized with
       * notifications loaded from the backend.
       */
      notificationIdsRef.current = new Set(
        loadedNotifications
          .filter((notification) => notification?.id)
          .map((notification) => String(notification.id)),
      );

      setNotifications(loadedNotifications);

      return data;
    } catch (error) {
      console.error("Failed to load notifications:", error);

      setError(apiErrorMessage(error, "Unable to load notifications"));

      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // REFRESH UNREAD COUNT
  // ==================================================

  const refreshUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationCount();

      setUnreadCount(Number(count) || 0);

      return Number(count) || 0;
    } catch (error) {
      console.error("Failed to refresh notification count:", error);

      throw error;
    }
  };

  // ==================================================
  // MARK ONE AS READ
  // ==================================================

  const markAsRead = async (notificationId) => {
    if (!notificationId) {
      return;
    }

    const notification = notifications.find(
      (item) => item.id === notificationId,
    );

    if (notification?.read) {
      return;
    }

    try {
      await markNotificationAsRead(notificationId);

      setNotifications((currentNotifications) =>
        currentNotifications.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                read: true,
              }
            : item,
        ),
      );

      setUnreadCount((currentCount) => Math.max(0, currentCount - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);

      throw error;
    }
  };

  // ==================================================
  // MARK ALL AS READ
  // ==================================================

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          read: true,
        })),
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);

      throw error;
    }
  };

  // ==================================================
  // CONTEXT VALUE
  // ==================================================

  const value = {
    notifications,
    unreadCount,

    loading,
    error,

    loadNotifications,
    refreshUnreadCount,

    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// ==================================================
// HOOK
// ==================================================

// Account changes dispose all notification requests/state with their provider lifetime.
export const NotificationProvider = ({ children }) => {
  const { user, sessionKey } = useAuth();
  return <NotificationState key={`${sessionKey}:${user?.id}`}>{children}</NotificationState>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider",
    );
  }

  return context;
};
```

### Changes (+ added / - removed)

```diff
--- before/src/context/NotificationContext.jsx
+++ after/src/context/NotificationContext.jsx
@@ -1,3 +1,4 @@
+import { apiErrorMessage } from "../utils/apiError.js";
 import { createContext, useContext, useEffect, useRef, useState } from "react";
 
 import { useAuth } from "../auth/AuthContext";
@@ -13,7 +14,7 @@
 
 const NotificationContext = createContext(null);
 
-export const NotificationProvider = ({ children }) => {
+const NotificationState = ({ children }) => {
   const { user } = useAuth();
 
   const [notifications, setNotifications] = useState([]);
@@ -218,7 +219,7 @@
     } catch (error) {
       console.error("Failed to load notifications:", error);
 
-      setError(error.response?.data?.message || "Unable to load notifications");
+      setError(apiErrorMessage(error, "Unable to load notifications"));
 
       throw error;
     } finally {
@@ -335,6 +336,12 @@
 // HOOK
 // ==================================================
 
+// Account changes dispose all notification requests/state with their provider lifetime.
+export const NotificationProvider = ({ children }) => {
+  const { user, sessionKey } = useAuth();
+  return <NotificationState key={`${sessionKey}:${user?.id}`}>{children}</NotificationState>;
+};
+
 export const useNotifications = () => {
   const context = useContext(NotificationContext);
 
```

## src/pages/ForgotPassword.jsx

Updated. Present backend field validation beside labelled controls as well as the operation summary.

### Full current content

```jsx
import { apiError } from "../utils/apiError";
import { apiErrorMessage } from "../utils/apiError.js";
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setFieldErrors({});
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
      setFieldErrors(apiError(error).fieldErrors);
      console.error(error);

      setError(
        apiErrorMessage(error, "Unable to process your request"),
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
          <FormField label="Email" error={fieldErrors.email} autoComplete="email"
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
@@ -1,3 +1,5 @@
+import { apiError } from "../utils/apiError";
+import { apiErrorMessage } from "../utils/apiError.js";
 import authStyles from "../styles/auth.module.css";
 import { bindStyles } from "../utils/bindStyles";
 import StatusMessage from "../components/ui/StatusMessage";
@@ -14,6 +16,7 @@
   const [email, setEmail] = useState("");
 
   const [error, setError] = useState("");
+  const [fieldErrors, setFieldErrors] = useState({});
   const [success, setSuccess] = useState("");
 
   const [loading, setLoading] = useState(false);
@@ -22,6 +25,7 @@
     event.preventDefault();
 
     setError("");
+    setFieldErrors({});
     setSuccess("");
     setLoading(true);
 
@@ -38,10 +42,11 @@
         "If an account exists for this email, a password reset link has been sent.",
       );
     } catch (error) {
+      setFieldErrors(apiError(error).fieldErrors);
       console.error(error);
 
       setError(
-        error.response?.data?.message || "Unable to process your request",
+        apiErrorMessage(error, "Unable to process your request"),
       );
     } finally {
       setLoading(false);
@@ -61,7 +66,7 @@
         </p>
 
         <form onSubmit={handleSubmit}>
-          <FormField label="Email" autoComplete="email"
+          <FormField label="Email" error={fieldErrors.email} autoComplete="email"
             type="email"
             placeholder="Email"
             value={email}
```

## src/pages/FriendRequests.jsx

Updated. Use the shared backend error formatter while retaining existing operation logic.

### Full current content

```jsx
import { apiErrorMessage } from "../utils/apiError.js";
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
        apiErrorMessage(error, "Unable to load friend requests"),
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
        apiErrorMessage(error, "Unable to accept friend request"),
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
        apiErrorMessage(error, "Unable to reject friend request"),
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
@@ -1,3 +1,4 @@
+import { apiErrorMessage } from "../utils/apiError.js";
 import friendsStyles from "../styles/friends.module.css";
 import { bindStyles } from "../utils/bindStyles";
 import StatusMessage from "../components/ui/StatusMessage";
@@ -49,7 +50,7 @@
       console.error("Failed to load friend requests:", error);
 
       setError(
-        error.response?.data?.message || "Unable to load friend requests",
+        apiErrorMessage(error, "Unable to load friend requests"),
       );
     } finally {
       setLoading(false);
@@ -78,7 +79,7 @@
       console.error("Failed to accept friend request:", error);
 
       setError(
-        error.response?.data?.message || "Unable to accept friend request",
+        apiErrorMessage(error, "Unable to accept friend request"),
       );
     } finally {
       setActionRequestId(null);
@@ -103,7 +104,7 @@
       console.error("Failed to reject friend request:", error);
 
       setError(
-        error.response?.data?.message || "Unable to reject friend request",
+        apiErrorMessage(error, "Unable to reject friend request"),
       );
     } finally {
       setActionRequestId(null);
```

## src/pages/Friends.jsx

Updated. Use the shared backend error formatter while retaining existing operation logic.

### Full current content

```jsx
import { apiErrorMessage } from "../utils/apiError.js";
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

      setError(apiErrorMessage(error, "Unable to load friends"));
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

      setError(apiErrorMessage(error, "Unable to remove friend"));
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
@@ -1,3 +1,4 @@
+import { apiErrorMessage } from "../utils/apiError.js";
 import friendsStyles from "../styles/friends.module.css";
 import { bindStyles } from "../utils/bindStyles";
 import StatusMessage from "../components/ui/StatusMessage";
@@ -37,7 +38,7 @@
     } catch (error) {
       console.error("Failed to load friends:", error);
 
-      setError(error.response?.data?.message || "Unable to load friends");
+      setError(apiErrorMessage(error, "Unable to load friends"));
     } finally {
       setLoading(false);
     }
@@ -78,7 +79,7 @@
     } catch (error) {
       console.error("Failed to remove friend:", error);
 
-      setError(error.response?.data?.message || "Unable to remove friend");
+      setError(apiErrorMessage(error, "Unable to remove friend"));
     } finally {
       setRemovingFriendId(null);
     }
```

## src/pages/Login.jsx

Updated. Present backend field validation beside labelled controls as well as the operation summary.

### Full current content

```jsx
import { apiError } from "../utils/apiError";
import { apiErrorMessage } from "../utils/apiError.js";
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
  const [fieldErrors, setFieldErrors] = useState({});

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      await login(email, password);

      navigate("/");
    } catch (error) {
      setFieldErrors(apiError(error).fieldErrors);
      console.error(error);

      setError(apiErrorMessage(error, "Login failed"));
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
          <FormField label="Email" error={fieldErrors.email} autoComplete="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <FormField label="Password" error={fieldErrors.password} autoComplete="current-password"
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
@@ -1,3 +1,5 @@
+import { apiError } from "../utils/apiError";
+import { apiErrorMessage } from "../utils/apiError.js";
 import authStyles from "../styles/auth.module.css";
 import { bindStyles } from "../utils/bindStyles";
 import StatusMessage from "../components/ui/StatusMessage";
@@ -20,6 +22,7 @@
   const [password, setPassword] = useState("");
 
   const [error, setError] = useState("");
+  const [fieldErrors, setFieldErrors] = useState({});
 
   const [loading, setLoading] = useState(false);
 
@@ -27,6 +30,7 @@
     event.preventDefault();
 
     setError("");
+    setFieldErrors({});
     setLoading(true);
 
     try {
@@ -34,9 +38,10 @@
 
       navigate("/");
     } catch (error) {
+      setFieldErrors(apiError(error).fieldErrors);
       console.error(error);
 
-      setError(error.response?.data?.message || "Login failed");
+      setError(apiErrorMessage(error, "Login failed"));
     } finally {
       setLoading(false);
     }
@@ -50,7 +55,7 @@
         <h2>Login</h2>
 
         <form onSubmit={handleSubmit}>
-          <FormField label="Email" autoComplete="email"
+          <FormField label="Email" error={fieldErrors.email} autoComplete="email"
             type="email"
             placeholder="Email"
             value={email}
@@ -58,7 +63,7 @@
             required
           />
 
-          <FormField label="Password" autoComplete="current-password"
+          <FormField label="Password" error={fieldErrors.password} autoComplete="current-password"
             type="password"
             placeholder="Password"
             value={password}
```

## src/pages/Messages.jsx

Updated. Use the shared backend error formatter while retaining existing operation logic.

### Full current content

```jsx
import { apiErrorMessage } from "../utils/apiError.js";
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
@@ -1,3 +1,4 @@
+import { apiErrorMessage } from "../utils/apiError.js";
 import chatStyles from "../styles/chat.module.css";
 import { bindStyles } from "../utils/bindStyles";
 import StatusMessage from "../components/ui/StatusMessage";
@@ -66,7 +67,7 @@
     } catch (error) {
       console.error("Failed to load conversations:", error);
 
-      setError(error.response?.data?.message || "Unable to load conversations");
+      setError(apiErrorMessage(error, "Unable to load conversations"));
 
       return [];
     } finally {
@@ -137,7 +138,7 @@
           console.error("Failed to open conversation:", error);
 
           setError(
-            error.response?.data?.message || "Unable to start conversation",
+            apiErrorMessage(error, "Unable to start conversation"),
           );
         }
       }
```

## src/pages/Notifications.jsx

Updated. Use the shared backend error formatter while retaining existing operation logic.

### Full current content

```jsx
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
@@ -1,3 +1,4 @@
+import { apiErrorMessage } from "../utils/apiError.js";
 import notificationsStyles from "../styles/notifications.module.css";
 import { bindStyles } from "../utils/bindStyles";
 import StatusMessage from "../components/ui/StatusMessage";
@@ -72,7 +73,7 @@
       console.error("Failed to mark notification as read:", error);
 
       setActionError(
-        error.response?.data?.message || "Unable to mark notification as read",
+        apiErrorMessage(error, "Unable to mark notification as read"),
       );
     } finally {
       setActionLoadingId(null);
@@ -93,8 +94,7 @@
       console.error("Failed to mark all notifications as read:", error);
 
       setActionError(
-        error.response?.data?.message ||
-          "Unable to mark all notifications as read",
+        apiErrorMessage(error, "Unable to mark all notifications as read"),
       );
     } finally {
       setMarkAllLoading(false);
```

## src/pages/Profile.jsx

Updated. Publish saved profile/image responses to shared state, retain drafts, serialize mutations and discard disposed responses.

### Full current content

```jsx
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
                ? new Date(profile.lastSeen).toLocaleString()
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
@@ -1,3 +1,5 @@
+import { apiError } from "../utils/apiError";
+import { apiErrorMessage } from "../utils/apiError.js";
 import profileStyles from "../styles/profile.module.css";
 import { bindStyles } from "../utils/bindStyles";
 import StatusMessage from "../components/ui/StatusMessage";
@@ -16,40 +18,31 @@
 
 const css = bindStyles(profileStyles);
 
-const Profile = () => {
-  const { user, loading: authLoading } = useAuth();
-
-  const [profile, setProfile] = useState(user);
-
-  const [name, setName] = useState(user?.name || "");
-
-  const [bio, setBio] = useState(user?.bio || "");
+const ProfileForm = () => {
+  const { user, loading: authLoading, updateUser, sessionKey } = useAuth();
+  const profile = user;
+  const busy = useRef(false);
+  const mounted = useRef(false);
+  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
+
+  const [nameDraft, setName] = useState(null);
+  const name = nameDraft ?? user?.name ?? "";
+
+  const [bioDraft, setBio] = useState(null);
+  const bio = bioDraft ?? user?.bio ?? "";
 
   const [loading, setLoading] = useState(false);
 
   const [imageLoading, setImageLoading] = useState(false);
 
   const [error, setError] = useState("");
+  const [fieldErrors, setFieldErrors] = useState({});
 
   const [success, setSuccess] = useState("");
 
   const [previewImage, setPreviewImage] = useState(null);
 
   const fileInputRef = useRef(null);
-
-  // ==================================================
-  // SYNC USER
-  // ==================================================
-
-  useEffect(() => {
-    if (!user) {
-      return;
-    }
-
-    setProfile(user);
-    setName(user.name || "");
-    setBio(user.bio || "");
-  }, [user]);
 
   // ==================================================
   // CLEANUP PREVIEW
@@ -69,25 +62,31 @@
 
   const handleSubmit = async (event) => {
     event.preventDefault();
+    if (busy.current) return;
+    busy.current = true;
 
     setError("");
+    setFieldErrors({});
     setSuccess("");
     setLoading(true);
 
     try {
       const updatedUser = await updateProfile(name.trim(), bio.trim());
 
-      setProfile(updatedUser);
-      setName(updatedUser.name || "");
-      setBio(updatedUser.bio || "");
+      if (!mounted.current || !updateUser(updatedUser, sessionKey)) return;
+      setName(null);
+      setBio(null);
 
       setSuccess("Profile updated successfully.");
     } catch (error) {
+      if (!mounted.current) return;
+      setFieldErrors(apiError(error).fieldErrors);
       console.error("Profile update failed:", error);
 
-      setError(error.response?.data?.message || "Failed to update profile");
+      setError(apiErrorMessage(error, "Failed to update profile"));
     } finally {
-      setLoading(false);
+      busy.current = false;
+      if (mounted.current) setLoading(false);
     }
   };
 
@@ -96,18 +95,20 @@
   // ==================================================
 
   const handleImageChange = (event) => {
+    if (busy.current) return;
     const file = event.target.files?.[0];
 
     if (!file) {
       return;
     }
 
-    if (!file.type.startsWith("image/")) {
-      setError("Please select an image file.");
+    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
+      setError("Please select a JPEG, PNG or WebP image.");
       return;
     }
 
     setError("");
+    setFieldErrors({});
     setSuccess("");
 
     if (previewImage) {
@@ -118,7 +119,7 @@
 
     setPreviewImage(previewUrl);
 
-    handleImageUpload(file);
+    void handleImageUpload(file);
   };
 
   // ==================================================
@@ -126,23 +127,24 @@
   // ==================================================
 
   const handleImageUpload = async (file) => {
+    busy.current = true;
     setImageLoading(true);
 
     setError("");
+    setFieldErrors({});
     setSuccess("");
 
     try {
       const updatedUser = await updateProfileImage(file);
 
-      setProfile(updatedUser);
+      if (!mounted.current || !updateUser(updatedUser, sessionKey)) return;
 
       setSuccess("Profile image updated successfully.");
 
-      /*
-       * Keep the local preview visible until
-       * the profile page is refreshed.
-       */
+      setPreviewImage(null);
     } catch (error) {
+      if (!mounted.current) return;
+      setFieldErrors(apiError(error).fieldErrors);
       console.error("Profile image upload failed:", error);
 
       if (previewImage) {
@@ -152,10 +154,11 @@
       setPreviewImage(null);
 
       setError(
-        error.response?.data?.message || "Failed to upload profile image",
+        apiErrorMessage(error, "Failed to upload profile image"),
       );
     } finally {
-      setImageLoading(false);
+      busy.current = false;
+      if (mounted.current) setImageLoading(false);
 
       if (fileInputRef.current) {
         fileInputRef.current.value = "";
@@ -198,7 +201,7 @@
             <button
               type="button"
               onClick={() => fileInputRef.current?.click()}
-              disabled={imageLoading}
+              disabled={imageLoading || loading}
             >
               {imageLoading ? "Uploading..." : "Change Photo"}
             </button>
@@ -206,7 +209,7 @@
             <input
               ref={fileInputRef}
               type="file"
-              accept="image/*"
+              accept="image/jpeg,image/png,image/webp"
               onChange={handleImageChange}
               hidden
             />
@@ -214,8 +217,9 @@
 
           <form className={css("profile-form")} onSubmit={handleSubmit}>
 
-            <FormField label="Name" autoComplete="name"
+            <FormField label="Name" error={fieldErrors.name} autoComplete="name"
               type="text"
+              disabled={loading || imageLoading}
               value={name}
               maxLength={100}
               onChange={(event) => setName(event.target.value)}
@@ -224,7 +228,8 @@
 
             <FormField label="Email" type="email" autoComplete="email" value={profile.email} disabled />
 
-            <FormField as="textarea" label="Bio"
+            <FormField as="textarea" label="Bio" error={fieldErrors.bio}
+              disabled={loading || imageLoading}
               value={bio}
               maxLength={500}
               rows={5}
@@ -233,7 +238,7 @@
 
             <div className={css("character-count")}>{bio.length}/500</div>
 
-            <button type="submit" disabled={loading}>
+            <button type="submit" disabled={loading || imageLoading}>
               {loading ? "Saving..." : "Save Changes"}
             </button>
           </form>
@@ -256,4 +261,7 @@
   );
 };
 
-export default Profile;
+export default function Profile() {
+  const { user, sessionKey } = useAuth();
+  return <ProfileForm key={`${sessionKey}:${user?.id}`} />;
+}
```

## src/pages/ResetPassword.jsx

Updated. Present backend field validation beside labelled controls as well as the operation summary.

### Full current content

```jsx
import { apiError } from "../utils/apiError";
import { apiErrorMessage } from "../utils/apiError.js";
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
  const [fieldErrors, setFieldErrors] = useState({});

  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setFieldErrors({});
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
      setFieldErrors(apiError(error).fieldErrors);
      console.error(error);

      setError(apiErrorMessage(error, "Unable to reset password"));
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
          <FormField label="New password" error={fieldErrors.newPassword} autoComplete="new-password"
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
@@ -1,3 +1,5 @@
+import { apiError } from "../utils/apiError";
+import { apiErrorMessage } from "../utils/apiError.js";
 import authStyles from "../styles/auth.module.css";
 import { bindStyles } from "../utils/bindStyles";
 import StatusMessage from "../components/ui/StatusMessage";
@@ -22,6 +24,7 @@
   const [confirmPassword, setConfirmPassword] = useState("");
 
   const [error, setError] = useState("");
+  const [fieldErrors, setFieldErrors] = useState({});
 
   const [success, setSuccess] = useState("");
 
@@ -31,6 +34,7 @@
     event.preventDefault();
 
     setError("");
+    setFieldErrors({});
     setSuccess("");
 
     if (!token) {
@@ -65,9 +69,10 @@
         navigate("/login");
       }, 1200);
     } catch (error) {
+      setFieldErrors(apiError(error).fieldErrors);
       console.error(error);
 
-      setError(error.response?.data?.message || "Unable to reset password");
+      setError(apiErrorMessage(error, "Unable to reset password"));
     } finally {
       setLoading(false);
     }
@@ -81,7 +86,7 @@
         <h2>Reset Password</h2>
 
         <form onSubmit={handleSubmit}>
-          <FormField label="New password" autoComplete="new-password"
+          <FormField label="New password" error={fieldErrors.newPassword} autoComplete="new-password"
             type="password"
             placeholder="New password"
             value={password}
```

## src/pages/Signup.jsx

Updated. Present backend field validation beside labelled controls as well as the operation summary.

### Full current content

```jsx
import { apiError } from "../utils/apiError";
import { apiErrorMessage } from "../utils/apiError.js";
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      await signup(name, email, password);

      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      setFieldErrors(apiError(error).fieldErrors);
      console.error(error);

      setError(
        apiErrorMessage(error, "Unable to send verification code"),
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
          <FormField label="Name" error={fieldErrors.name} autoComplete="name"
            type="text"
            placeholder="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <FormField label="Email" error={fieldErrors.email} autoComplete="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <FormField label="Password" error={fieldErrors.password} autoComplete="new-password"
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
@@ -1,3 +1,5 @@
+import { apiError } from "../utils/apiError";
+import { apiErrorMessage } from "../utils/apiError.js";
 import authStyles from "../styles/auth.module.css";
 import { bindStyles } from "../utils/bindStyles";
 import StatusMessage from "../components/ui/StatusMessage";
@@ -20,12 +22,14 @@
   const [password, setPassword] = useState("");
 
   const [error, setError] = useState("");
+  const [fieldErrors, setFieldErrors] = useState({});
   const [loading, setLoading] = useState(false);
 
   const handleSubmit = async (event) => {
     event.preventDefault();
 
     setError("");
+    setFieldErrors({});
     setLoading(true);
 
     try {
@@ -33,10 +37,11 @@
 
       navigate(`/verify-email?email=${encodeURIComponent(email)}`);
     } catch (error) {
+      setFieldErrors(apiError(error).fieldErrors);
       console.error(error);
 
       setError(
-        error.response?.data?.message || "Unable to send verification code",
+        apiErrorMessage(error, "Unable to send verification code"),
       );
     } finally {
       setLoading(false);
@@ -51,7 +56,7 @@
         <h2>Create Account</h2>
 
         <form onSubmit={handleSubmit}>
-          <FormField label="Name" autoComplete="name"
+          <FormField label="Name" error={fieldErrors.name} autoComplete="name"
             type="text"
             placeholder="Name"
             value={name}
@@ -59,7 +64,7 @@
             required
           />
 
-          <FormField label="Email" autoComplete="email"
+          <FormField label="Email" error={fieldErrors.email} autoComplete="email"
             type="email"
             placeholder="Email"
             value={email}
@@ -67,7 +72,7 @@
             required
           />
 
-          <FormField label="Password" autoComplete="new-password"
+          <FormField label="Password" error={fieldErrors.password} autoComplete="new-password"
             type="password"
             placeholder="Password"
             value={password}
```

## src/pages/UserProfile.jsx

Updated. Use the shared backend error formatter while retaining existing operation logic.

### Full current content

```jsx
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
@@ -1,3 +1,4 @@
+import { apiErrorMessage } from "../utils/apiError.js";
 import friendsStyles from "../styles/friends.module.css";
 import profileStyles from "../styles/profile.module.css";
 import { bindStyles } from "../utils/bindStyles";
@@ -72,7 +73,7 @@
         console.error("Failed to load user profile:", error);
 
         setError(
-          error.response?.data?.message || "Unable to load user profile",
+          apiErrorMessage(error, "Unable to load user profile"),
         );
       } finally {
         setLoading(false);
@@ -122,7 +123,7 @@
         console.error("Failed to load friendship state:", error);
 
         setFriendshipError(
-          error.response?.data?.message || "Unable to load friendship status",
+          apiErrorMessage(error, "Unable to load friendship status"),
         );
       } finally {
         setFriendshipLoaded(true);
@@ -154,7 +155,7 @@
       console.error("Failed to send friend request:", error);
 
       setFriendshipError(
-        error.response?.data?.message || "Unable to send friend request",
+        apiErrorMessage(error, "Unable to send friend request"),
       );
     } finally {
       setFriendshipLoading(false);
@@ -183,7 +184,7 @@
       console.error("Failed to accept friend request:", error);
 
       setFriendshipError(
-        error.response?.data?.message || "Unable to accept friend request",
+        apiErrorMessage(error, "Unable to accept friend request"),
       );
     } finally {
       setFriendshipLoading(false);
@@ -212,7 +213,7 @@
       console.error("Failed to reject friend request:", error);
 
       setFriendshipError(
-        error.response?.data?.message || "Unable to reject friend request",
+        apiErrorMessage(error, "Unable to reject friend request"),
       );
     } finally {
       setFriendshipLoading(false);
@@ -247,7 +248,7 @@
       console.error("Failed to remove friend:", error);
 
       setFriendshipError(
-        error.response?.data?.message || "Unable to remove friend",
+        apiErrorMessage(error, "Unable to remove friend"),
       );
     } finally {
       setFriendshipLoading(false);
```

## src/pages/VerifyEmail.jsx

Updated. Present backend field validation beside labelled controls as well as the operation summary.

### Full current content

```jsx
import { apiError } from "../utils/apiError";
import { apiErrorMessage } from "../utils/apiError.js";
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
  const [fieldErrors, setFieldErrors] = useState({});
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
    setFieldErrors({});
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
      setFieldErrors(apiError(error).fieldErrors);
      console.error(error);

      setError(apiErrorMessage(error, "Unable to verify email"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) {
      return;
    }

    setError("");
    setFieldErrors({});
    setSuccess("");
    setResending(true);

    try {
      await resendVerification({
        email,
      });

      setSuccess("A new verification code has been sent.");

      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setFieldErrors(apiError(error).fieldErrors);
      console.error(error);

      setError(
        apiErrorMessage(error, "Unable to resend verification code"),
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
          <FormField label="Email" error={fieldErrors.email} autoComplete="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <FormField label="Verification code" error={fieldErrors.otp} autoComplete="one-time-code"
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
@@ -1,3 +1,5 @@
+import { apiError } from "../utils/apiError";
+import { apiErrorMessage } from "../utils/apiError.js";
 import authStyles from "../styles/auth.module.css";
 import { bindStyles } from "../utils/bindStyles";
 import StatusMessage from "../components/ui/StatusMessage";
@@ -22,6 +24,7 @@
   const [otp, setOtp] = useState("");
 
   const [error, setError] = useState("");
+  const [fieldErrors, setFieldErrors] = useState({});
   const [success, setSuccess] = useState("");
 
   const [loading, setLoading] = useState(false);
@@ -49,6 +52,7 @@
     event.preventDefault();
 
     setError("");
+    setFieldErrors({});
     setSuccess("");
     setLoading(true);
 
@@ -64,9 +68,10 @@
         navigate("/login");
       }, 1200);
     } catch (error) {
+      setFieldErrors(apiError(error).fieldErrors);
       console.error(error);
 
-      setError(error.response?.data?.message || "Unable to verify email");
+      setError(apiErrorMessage(error, "Unable to verify email"));
     } finally {
       setLoading(false);
     }
@@ -78,6 +83,7 @@
     }
 
     setError("");
+    setFieldErrors({});
     setSuccess("");
     setResending(true);
 
@@ -90,10 +96,11 @@
 
       setResendCountdown(RESEND_COOLDOWN_SECONDS);
     } catch (error) {
+      setFieldErrors(apiError(error).fieldErrors);
       console.error(error);
 
       setError(
-        error.response?.data?.message || "Unable to resend verification code",
+        apiErrorMessage(error, "Unable to resend verification code"),
       );
     } finally {
       setResending(false);
@@ -110,7 +117,7 @@
         <p>Enter the 6-digit verification code sent to your email.</p>
 
         <form onSubmit={handleVerify}>
-          <FormField label="Email" autoComplete="email"
+          <FormField label="Email" error={fieldErrors.email} autoComplete="email"
             type="email"
             placeholder="Email"
             value={email}
@@ -118,7 +125,7 @@
             required
           />
 
-          <FormField label="Verification code" autoComplete="one-time-code"
+          <FormField label="Verification code" error={fieldErrors.otp} autoComplete="one-time-code"
             type="text"
             inputMode="numeric"
             maxLength={6}
```

## src/services/messageSession.js

Updated. Consistent server-error feedback while preserving the uncertain-send warning.

### Full current content

```javascript
import { apiErrorMessage } from "../utils/apiError.js";
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
        const uncertain = "Send could not be confirmed. Your text was kept. Check recent messages before retrying.";
        update({ sendError: error.response ? apiErrorMessage(error, uncertain) : uncertain });
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
--- before/src/services/messageSession.js
+++ after/src/services/messageSession.js
@@ -1,3 +1,4 @@
+import { apiErrorMessage } from "../utils/apiError.js";
 import { compareMessages, lastPage, mergeMessages } from "../utils/messageHistory.js";
 
 export const MESSAGE_PAGE_SIZE = 10;
@@ -140,8 +141,8 @@
         if (alive) { accept([saved]); onMessage?.(saved); }
         return saved;
       } catch (error) {
-        update({ sendError: error.response?.data?.message ||
-          "Send could not be confirmed. Your text was kept. Check recent messages before retrying." });
+        const uncertain = "Send could not be confirmed. Your text was kept. Check recent messages before retrying.";
+        update({ sendError: error.response ? apiErrorMessage(error, uncertain) : uncertain });
         throw error;
       } finally { sendFlight = false; }
     },
```

## src/utils/apiError.js

Added. Normalize the public backend error contract, field details, network failures and rate-limit fallback.

### Full current content

```javascript
/** Accept the backend's public error contract, never raw Axios/internal errors. */
export function apiError(error, fallback = "Unable to complete this request.") {
  const data = error?.response?.data;
  const fieldErrors = Object.fromEntries(Object.entries(
    data?.fieldErrors && typeof data.fieldErrors === "object" && !Array.isArray(data.fieldErrors)
      ? data.fieldErrors : {},
  ).filter(([, value]) => typeof value === "string" && value.trim()));
  const status = error?.response?.status;
  const message = typeof data?.message === "string" && data.message.trim()
    ? data.message : error?.code === "ERR_NETWORK"
      ? "Unable to reach the server. Check your connection and try again."
      : status === 429 ? "Too many requests. Please wait before trying again." : fallback;
  return { message, fieldErrors };
}

export function apiErrorMessage(error, fallback) {
  const { message, fieldErrors } = apiError(error, fallback);
  const details = [...new Set(Object.values(fieldErrors))];
  return [message, ...details.filter(detail => detail !== message)].join(" ");
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/utils/apiError.js
@@ -0,0 +1,20 @@
+/** Accept the backend's public error contract, never raw Axios/internal errors. */
+export function apiError(error, fallback = "Unable to complete this request.") {
+  const data = error?.response?.data;
+  const fieldErrors = Object.fromEntries(Object.entries(
+    data?.fieldErrors && typeof data.fieldErrors === "object" && !Array.isArray(data.fieldErrors)
+      ? data.fieldErrors : {},
+  ).filter(([, value]) => typeof value === "string" && value.trim()));
+  const status = error?.response?.status;
+  const message = typeof data?.message === "string" && data.message.trim()
+    ? data.message : error?.code === "ERR_NETWORK"
+      ? "Unable to reach the server. Check your connection and try again."
+      : status === 429 ? "Too many requests. Please wait before trying again." : fallback;
+  return { message, fieldErrors };
+}
+
+export function apiErrorMessage(error, fallback) {
+  const { message, fieldErrors } = apiError(error, fallback);
+  const details = [...new Set(Object.values(fieldErrors))];
+  return [message, ...details.filter(detail => detail !== message)].join(" ");
+}
```

## src/utils/tokenStorage.js

Updated. Local login identifier and change-only profile storage writes for cross-tab synchronization.

### Full current content

```javascript
const ACCESS_TOKEN_KEY = "frndbook_access_token";
const REFRESH_TOKEN_KEY = "frndbook_refresh_token";
const USER_KEY = "frndbook_user";
const SESSION_KEY = "frndbook_session";

export const TOKEN_UPDATED_EVENT = "frndbook:tokens-updated";

export const AUTH_CLEARED_EVENT = "frndbook:auth-cleared";

// ==================================================
// EVENTS
// ==================================================

const dispatchTokenUpdated = () => {
  window.dispatchEvent(new Event(TOKEN_UPDATED_EVENT));
};

const dispatchAuthCleared = () => {
  window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
};

// ==================================================
// TOKEN STORAGE
// ==================================================

export const tokenStorage = {
  getSessionId() { return localStorage.getItem(SESSION_KEY); },
  // ==================================================
  // ACCESS TOKEN
  // ==================================================

  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  // ==================================================
  // REFRESH TOKEN
  // ==================================================

  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  // ==================================================
  // USER
  // ==================================================

  getUser() {
    const user = localStorage.getItem(USER_KEY);

    if (!user) {
      return null;
    }

    try {
      return JSON.parse(user);
    } catch {
      localStorage.removeItem(USER_KEY);

      return null;
    }
  },

  // ==================================================
  // SAVE AUTH
  // ==================================================

  saveAuth(accessToken, refreshToken, user) {
    localStorage.setItem(SESSION_KEY, crypto.randomUUID());
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

    localStorage.setItem(USER_KEY, JSON.stringify(user));

    dispatchTokenUpdated();
  },

  // ==================================================
  // UPDATE ACCESS TOKEN
  // ==================================================

  updateAccessToken(accessToken) {
    if (!accessToken) {
      return;
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

    dispatchTokenUpdated();
  },

  // ==================================================
  // UPDATE ACCESS + REFRESH TOKEN
  // ==================================================

  updateTokens(accessToken, refreshToken) {
    if (!accessToken) {
      return;
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }

    dispatchTokenUpdated();
  },

  // ==================================================
  // UPDATE USER
  // ==================================================

  updateUser(user) {
    const serialized = JSON.stringify(user);
    if (localStorage.getItem(USER_KEY) !== serialized) localStorage.setItem(USER_KEY, serialized);
  },

  // ==================================================
  // CLEAR AUTH
  // ==================================================

  clear() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);

    localStorage.removeItem(REFRESH_TOKEN_KEY);

    localStorage.removeItem(USER_KEY);

    dispatchAuthCleared();
  },
};
```

### Changes (+ added / - removed)

```diff
--- before/src/utils/tokenStorage.js
+++ after/src/utils/tokenStorage.js
@@ -1,6 +1,7 @@
 const ACCESS_TOKEN_KEY = "frndbook_access_token";
 const REFRESH_TOKEN_KEY = "frndbook_refresh_token";
 const USER_KEY = "frndbook_user";
+const SESSION_KEY = "frndbook_session";
 
 export const TOKEN_UPDATED_EVENT = "frndbook:tokens-updated";
 
@@ -23,6 +24,7 @@
 // ==================================================
 
 export const tokenStorage = {
+  getSessionId() { return localStorage.getItem(SESSION_KEY); },
   // ==================================================
   // ACCESS TOKEN
   // ==================================================
@@ -64,6 +66,7 @@
   // ==================================================
 
   saveAuth(accessToken, refreshToken, user) {
+    localStorage.setItem(SESSION_KEY, crypto.randomUUID());
     localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
 
     localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
@@ -110,7 +113,8 @@
   // ==================================================
 
   updateUser(user) {
-    localStorage.setItem(USER_KEY, JSON.stringify(user));
+    const serialized = JSON.stringify(user);
+    if (localStorage.getItem(USER_KEY) !== serialized) localStorage.setItem(USER_KEY, serialized);
   },
 
   // ==================================================
@@ -118,6 +122,7 @@
   // ==================================================
 
   clear() {
+    localStorage.removeItem(SESSION_KEY);
     localStorage.removeItem(ACCESS_TOKEN_KEY);
 
     localStorage.removeItem(REFRESH_TOKEN_KEY);
```

## tests/accountState.browser.mjs

Added. Focused account-state and error-contract regression coverage.

### Full current content

```javascript
import { createServer } from "../node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin="http://127.0.0.1:41817";
process.env.VITE_API_BASE_URL=origin;process.env.VITE_WS_URL=origin.replace("http","ws")+"/ws";
const server=await createServer({root:fileURLToPath(new URL("..",import.meta.url)),server:{host:"127.0.0.1",port:41817,strictPort:true}});
const errors=[];
let account={id:1,name:"Original",email:"person@example.invalid",bio:"Saved bio",profileImage:null};
let unavailable=false,rejectProfile=false,imageFailure=false,holdProfile=false,heldRoute;
let expired=false,refreshStatus=503;
let browser;
try {
  await server.listen();browser=await chromium.launch({channel:"msedge",headless:true});
  const context=await browser.newContext();
  await context.route("**/*",route=>{
    const url=new URL(route.request().url());assert.equal(url.origin,origin);
    if(!url.pathname.startsWith("/api/"))return route.continue();
    if(url.pathname==="/api/users/me") {
      if(route.request().method()==="PATCH") {
        if(holdProfile){heldRoute=route;return;}
        if(rejectProfile)return route.fulfill({status:400,json:{message:"Validation failed",fieldErrors:{name:"Name rejected"}}});
        account={...account,...route.request().postDataJSON()};
      } else if(expired)return route.fulfill({status:401,json:{message:"Expired"}});
      else if(unavailable)return route.fulfill({status:503,json:{message:"Temporary outage"}});
      return route.fulfill({json:account});
    }
    if(url.pathname.endsWith("profile-image")) {
      if(imageFailure)return route.fulfill({status:400,json:{message:"Image rejected"}});
      account={...account,profileImage:origin+"/fixture-avatar.png"};return route.fulfill({json:account});
    }
    if(url.pathname==="/api/auth/signup")return route.fulfill({status:400,json:{message:"Validation failed",fieldErrors:{email:"Email rejected",password:"Password rejected"}}});
    if(url.pathname==="/api/auth/refresh")return route.fulfill({status:refreshStatus,json:{message:"Refresh unavailable"}});
    if(url.pathname.endsWith("unread-count"))return route.fulfill({json:0});
    return route.fulfill({json:[]});
  });
  await context.routeWebSocket("**/*",socket=>socket.onMessage(frame=>{
    if(/^(CONNECT|STOMP)/.test(String(frame)))socket.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
    if(String(frame).startsWith("DISCONNECT"))socket.close();
  }));
  const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));
  await page.goto(origin+"/login");
  await page.evaluate(async account=>{
    const {tokenStorage}=await import("/src/utils/tokenStorage.js");
    tokenStorage.saveAuth("test."+btoa(JSON.stringify({exp:9999999999}))+".test","refresh",account);
  },account);
  await page.goto(origin+"/profile");
  await page.getByLabel("Name",{exact:true}).fill("Updated");
  await page.getByRole("button",{name:"Save Changes",exact:true}).click();
  await page.getByText("Profile updated successfully.",{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("frndbook_user")).name),"Updated");
  await page.getByRole("link",{name:"Home",exact:true}).click();
  await page.getByText("Hello, Updated",{exact:true}).waitFor();
  const second=await context.newPage();second.on("pageerror",e=>errors.push(e.message));
  await second.goto(origin+"/");await second.getByText("Hello, Updated",{exact:true}).waitFor();
  await page.goto(origin+"/profile");await page.getByLabel("Name",{exact:true}).fill("Across tabs");
  await page.getByRole("button",{name:"Save Changes",exact:true}).click();
  await second.getByText("Hello, Across tabs",{exact:true}).waitFor();
  rejectProfile=true;await page.getByLabel("Name",{exact:true}).fill("Invalid name");
  await page.getByRole("button",{name:"Save Changes",exact:true}).click();
  await page.locator('input[aria-invalid="true"]').waitFor();
  assert.equal(await page.getByLabel("Name",{exact:true}).inputValue(),"Invalid name");
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("frndbook_user")).name),"Across tabs");
  rejectProfile=false;
  // Failed image upload retains the saved avatar and unsaved text draft.
  imageFailure=true;
  await page.locator('input[type="file"]').setInputFiles({name:"fixture.png",mimeType:"image/png",buffer:Buffer.from("fixture")});
  await page.getByRole("alert").filter({hasText:"Image rejected"}).waitFor();
  assert.equal(await page.getByLabel("Name",{exact:true}).inputValue(),"Invalid name");
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("frndbook_user")).profileImage),null);
  // Successful image response updates shared state without replacing a text draft.
  imageFailure=false;
  await page.locator('input[type="file"]').setInputFiles({name:"fixture.png",mimeType:"image/png",buffer:Buffer.from("fixture")});
  await page.getByText("Profile image updated successfully.",{exact:true}).waitFor();
  assert.equal(await page.getByLabel("Name",{exact:true}).inputValue(),"Invalid name");
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("frndbook_user")).profileImage),origin+"/fixture-avatar.png");
  // Clear credentials while a profile save is pending; late success cannot restore it.
  holdProfile=true;await page.getByRole("button",{name:"Save Changes",exact:true}).click();
  for(let i=0;!heldRoute&&i<200;i++)await new Promise(r=>setTimeout(r,10));assert.ok(heldRoute);
  await second.evaluate(async()=>{(await import("/src/utils/tokenStorage.js")).tokenStorage.clear();});
  await page.waitForURL("**/login");await second.waitForURL("**/login");
  await heldRoute.fulfill({json:{...account,name:"Stale saved result"}});holdProfile=false;
  assert.equal(await page.evaluate(()=>localStorage.getItem("frndbook_user")),null);
  // Actual signup fields display backend errors with accessible field associations.
  await page.goto(origin+"/signup");await page.getByLabel("Name",{exact:true}).fill("Name");
  await page.getByLabel("Email",{exact:true}).fill("person@example.invalid");await page.getByLabel("Password",{exact:true}).fill("password123");
  await page.getByRole("button",{name:"Create Account",exact:true}).click();
  await page.getByLabel("Email",{exact:true}).locator('xpath=..').getByText("Email rejected",{exact:true}).waitFor();
  assert.equal(await page.getByLabel("Password",{exact:true}).getAttribute("aria-invalid"),"true");
  // Startup outage: keep credentials, expose retry, recover using the same session.
  await page.evaluate(async account=>{(await import("/src/utils/tokenStorage.js")).tokenStorage.saveAuth("token","refresh",account);},account);
  unavailable=true;await page.goto(origin+"/");await page.getByRole("button",{name:"Retry session check"}).waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem("frndbook_access_token")),"token");
  unavailable=false;await page.getByRole("button",{name:"Retry session check"}).click();await page.getByText("Hello, Across tabs",{exact:true}).waitFor();
  expired=true;await page.goto(origin+"/");await page.getByRole("button",{name:"Retry session check"}).waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem("frndbook_access_token")),"token");
  expired=false;await page.getByRole("button",{name:"Retry session check"}).click();await page.getByText("Hello, Across tabs",{exact:true}).waitFor();
  refreshStatus=401;expired=true;await page.goto(origin+"/");await page.waitForURL("**/login");
  assert.equal(await page.evaluate(()=>localStorage.getItem("frndbook_access_token")),null);
  assert.deepEqual(errors,[]);
  console.log("PASS: shared profile/home/storage, cross-tab profile and logout, failed/successful images preserve drafts, inline validation, stale save after logout, transient startup/refresh retry, rejected refresh clears auth.");
} finally {await browser?.close();await server.close();}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/tests/accountState.browser.mjs
@@ -0,0 +1,102 @@
+import { createServer } from "../node_modules/vite/dist/node/index.js";
+import { fileURLToPath } from "node:url";
+import assert from "node:assert/strict";
+const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
+const origin="http://127.0.0.1:41817";
+process.env.VITE_API_BASE_URL=origin;process.env.VITE_WS_URL=origin.replace("http","ws")+"/ws";
+const server=await createServer({root:fileURLToPath(new URL("..",import.meta.url)),server:{host:"127.0.0.1",port:41817,strictPort:true}});
+const errors=[];
+let account={id:1,name:"Original",email:"person@example.invalid",bio:"Saved bio",profileImage:null};
+let unavailable=false,rejectProfile=false,imageFailure=false,holdProfile=false,heldRoute;
+let expired=false,refreshStatus=503;
+let browser;
+try {
+  await server.listen();browser=await chromium.launch({channel:"msedge",headless:true});
+  const context=await browser.newContext();
+  await context.route("**/*",route=>{
+    const url=new URL(route.request().url());assert.equal(url.origin,origin);
+    if(!url.pathname.startsWith("/api/"))return route.continue();
+    if(url.pathname==="/api/users/me") {
+      if(route.request().method()==="PATCH") {
+        if(holdProfile){heldRoute=route;return;}
+        if(rejectProfile)return route.fulfill({status:400,json:{message:"Validation failed",fieldErrors:{name:"Name rejected"}}});
+        account={...account,...route.request().postDataJSON()};
+      } else if(expired)return route.fulfill({status:401,json:{message:"Expired"}});
+      else if(unavailable)return route.fulfill({status:503,json:{message:"Temporary outage"}});
+      return route.fulfill({json:account});
+    }
+    if(url.pathname.endsWith("profile-image")) {
+      if(imageFailure)return route.fulfill({status:400,json:{message:"Image rejected"}});
+      account={...account,profileImage:origin+"/fixture-avatar.png"};return route.fulfill({json:account});
+    }
+    if(url.pathname==="/api/auth/signup")return route.fulfill({status:400,json:{message:"Validation failed",fieldErrors:{email:"Email rejected",password:"Password rejected"}}});
+    if(url.pathname==="/api/auth/refresh")return route.fulfill({status:refreshStatus,json:{message:"Refresh unavailable"}});
+    if(url.pathname.endsWith("unread-count"))return route.fulfill({json:0});
+    return route.fulfill({json:[]});
+  });
+  await context.routeWebSocket("**/*",socket=>socket.onMessage(frame=>{
+    if(/^(CONNECT|STOMP)/.test(String(frame)))socket.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
+    if(String(frame).startsWith("DISCONNECT"))socket.close();
+  }));
+  const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));
+  await page.goto(origin+"/login");
+  await page.evaluate(async account=>{
+    const {tokenStorage}=await import("/src/utils/tokenStorage.js");
+    tokenStorage.saveAuth("test."+btoa(JSON.stringify({exp:9999999999}))+".test","refresh",account);
+  },account);
+  await page.goto(origin+"/profile");
+  await page.getByLabel("Name",{exact:true}).fill("Updated");
+  await page.getByRole("button",{name:"Save Changes",exact:true}).click();
+  await page.getByText("Profile updated successfully.",{exact:true}).waitFor();
+  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("frndbook_user")).name),"Updated");
+  await page.getByRole("link",{name:"Home",exact:true}).click();
+  await page.getByText("Hello, Updated",{exact:true}).waitFor();
+  const second=await context.newPage();second.on("pageerror",e=>errors.push(e.message));
+  await second.goto(origin+"/");await second.getByText("Hello, Updated",{exact:true}).waitFor();
+  await page.goto(origin+"/profile");await page.getByLabel("Name",{exact:true}).fill("Across tabs");
+  await page.getByRole("button",{name:"Save Changes",exact:true}).click();
+  await second.getByText("Hello, Across tabs",{exact:true}).waitFor();
+  rejectProfile=true;await page.getByLabel("Name",{exact:true}).fill("Invalid name");
+  await page.getByRole("button",{name:"Save Changes",exact:true}).click();
+  await page.locator('input[aria-invalid="true"]').waitFor();
+  assert.equal(await page.getByLabel("Name",{exact:true}).inputValue(),"Invalid name");
+  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("frndbook_user")).name),"Across tabs");
+  rejectProfile=false;
+  // Failed image upload retains the saved avatar and unsaved text draft.
+  imageFailure=true;
+  await page.locator('input[type="file"]').setInputFiles({name:"fixture.png",mimeType:"image/png",buffer:Buffer.from("fixture")});
+  await page.getByRole("alert").filter({hasText:"Image rejected"}).waitFor();
+  assert.equal(await page.getByLabel("Name",{exact:true}).inputValue(),"Invalid name");
+  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("frndbook_user")).profileImage),null);
+  // Successful image response updates shared state without replacing a text draft.
+  imageFailure=false;
+  await page.locator('input[type="file"]').setInputFiles({name:"fixture.png",mimeType:"image/png",buffer:Buffer.from("fixture")});
+  await page.getByText("Profile image updated successfully.",{exact:true}).waitFor();
+  assert.equal(await page.getByLabel("Name",{exact:true}).inputValue(),"Invalid name");
+  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("frndbook_user")).profileImage),origin+"/fixture-avatar.png");
+  // Clear credentials while a profile save is pending; late success cannot restore it.
+  holdProfile=true;await page.getByRole("button",{name:"Save Changes",exact:true}).click();
+  for(let i=0;!heldRoute&&i<200;i++)await new Promise(r=>setTimeout(r,10));assert.ok(heldRoute);
+  await second.evaluate(async()=>{(await import("/src/utils/tokenStorage.js")).tokenStorage.clear();});
+  await page.waitForURL("**/login");await second.waitForURL("**/login");
+  await heldRoute.fulfill({json:{...account,name:"Stale saved result"}});holdProfile=false;
+  assert.equal(await page.evaluate(()=>localStorage.getItem("frndbook_user")),null);
+  // Actual signup fields display backend errors with accessible field associations.
+  await page.goto(origin+"/signup");await page.getByLabel("Name",{exact:true}).fill("Name");
+  await page.getByLabel("Email",{exact:true}).fill("person@example.invalid");await page.getByLabel("Password",{exact:true}).fill("password123");
+  await page.getByRole("button",{name:"Create Account",exact:true}).click();
+  await page.getByLabel("Email",{exact:true}).locator('xpath=..').getByText("Email rejected",{exact:true}).waitFor();
+  assert.equal(await page.getByLabel("Password",{exact:true}).getAttribute("aria-invalid"),"true");
+  // Startup outage: keep credentials, expose retry, recover using the same session.
+  await page.evaluate(async account=>{(await import("/src/utils/tokenStorage.js")).tokenStorage.saveAuth("token","refresh",account);},account);
+  unavailable=true;await page.goto(origin+"/");await page.getByRole("button",{name:"Retry session check"}).waitFor();
+  assert.equal(await page.evaluate(()=>localStorage.getItem("frndbook_access_token")),"token");
+  unavailable=false;await page.getByRole("button",{name:"Retry session check"}).click();await page.getByText("Hello, Across tabs",{exact:true}).waitFor();
+  expired=true;await page.goto(origin+"/");await page.getByRole("button",{name:"Retry session check"}).waitFor();
+  assert.equal(await page.evaluate(()=>localStorage.getItem("frndbook_access_token")),"token");
+  expired=false;await page.getByRole("button",{name:"Retry session check"}).click();await page.getByText("Hello, Across tabs",{exact:true}).waitFor();
+  refreshStatus=401;expired=true;await page.goto(origin+"/");await page.waitForURL("**/login");
+  assert.equal(await page.evaluate(()=>localStorage.getItem("frndbook_access_token")),null);
+  assert.deepEqual(errors,[]);
+  console.log("PASS: shared profile/home/storage, cross-tab profile and logout, failed/successful images preserve drafts, inline validation, stale save after logout, transient startup/refresh retry, rejected refresh clears auth.");
+} finally {await browser?.close();await server.close();}
```

## tests/apiError.test.js

Added. Focused account-state and error-contract regression coverage.

### Full current content

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { apiError, apiErrorMessage } from "../src/utils/apiError.js";

test("backend fields remain available and summary includes unmapped fields", () => {
  const error={response:{data:{message:"Validation failed",fieldErrors:{name:"Name required",other:"Invalid selection"}}}};
  assert.equal(apiError(error).fieldErrors.name,"Name required");
  assert.equal(apiErrorMessage(error),"Validation failed Name required Invalid selection");
});
test("malformed responses use fallback and never stringify objects or expose internal errors", () => {
  const error={message:"SQL secret",response:{data:{message:{secret:1},fieldErrors:{a:{secret:1},b:null,c:""}}}};
  assert.deepEqual(apiError(error,"Try again"),{message:"Try again",fieldErrors:{}});
  assert.equal(apiErrorMessage({response:{data:"<html>proxy</html>"}},"Try again"),"Try again");
});
test("network and rate-limit feedback is actionable", () => {
  assert.match(apiErrorMessage({code:"ERR_NETWORK"}),/connection/);
  assert.match(apiErrorMessage({response:{status:429}}),/wait/);
});
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/tests/apiError.test.js
@@ -0,0 +1,18 @@
+import test from "node:test";
+import assert from "node:assert/strict";
+import { apiError, apiErrorMessage } from "../src/utils/apiError.js";
+
+test("backend fields remain available and summary includes unmapped fields", () => {
+  const error={response:{data:{message:"Validation failed",fieldErrors:{name:"Name required",other:"Invalid selection"}}}};
+  assert.equal(apiError(error).fieldErrors.name,"Name required");
+  assert.equal(apiErrorMessage(error),"Validation failed Name required Invalid selection");
+});
+test("malformed responses use fallback and never stringify objects or expose internal errors", () => {
+  const error={message:"SQL secret",response:{data:{message:{secret:1},fieldErrors:{a:{secret:1},b:null,c:""}}}};
+  assert.deepEqual(apiError(error,"Try again"),{message:"Try again",fieldErrors:{}});
+  assert.equal(apiErrorMessage({response:{data:"<html>proxy</html>"}},"Try again"),"Try again");
+});
+test("network and rate-limit feedback is actionable", () => {
+  assert.match(apiErrorMessage({code:"ERR_NETWORK"}),/connection/);
+  assert.match(apiErrorMessage({response:{status:429}}),/wait/);
+});
```

