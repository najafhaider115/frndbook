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
