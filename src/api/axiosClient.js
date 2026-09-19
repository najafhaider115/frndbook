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
