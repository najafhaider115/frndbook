import axios from "axios";

import { tokenStorage } from "../utils/tokenStorage";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,

  headers: {
    "Content-Type": "application/json",
  },
});

// ==================================================
// REFRESH STATE
// ==================================================

let refreshPromise = null;

// ==================================================
// REFRESH ACCESS TOKEN
// ==================================================

export const refreshAccessToken = async () => {
  /*
   * If another refresh is already running,
   * everyone waits for that same request.
   */
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = tokenStorage.getRefreshToken();

  if (!refreshToken) {
    throw new Error("Refresh token is not available");
  }

  refreshPromise = axios
    .post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh`, {
      refreshToken,
    })
    .then((response) => {
      const { accessToken, refreshToken: newRefreshToken } = response.data;

      tokenStorage.updateTokens(accessToken, newRefreshToken);

      return accessToken;
    })
    .catch((error) => {
      tokenStorage.clear();

      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

// ==================================================
// REQUEST INTERCEPTOR
// ==================================================

axiosClient.interceptors.request.use(
  (config) => {
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
    return response;
  },

  async (error) => {
    const originalRequest = error.config;

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

    if (
      requestUrl.includes("/api/auth/login") ||
      requestUrl.includes("/api/auth/signup") ||
      requestUrl.includes("/api/auth/refresh")
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

      window.location.href = "/login";

      return Promise.reject(refreshError);
    }
  },
);

export default axiosClient;
