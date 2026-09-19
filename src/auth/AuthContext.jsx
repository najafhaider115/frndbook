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
