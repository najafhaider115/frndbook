import { createContext, useContext, useEffect, useState } from "react";

import {
  login as loginApi,
  signup as signupApi,
  logout as logoutApi,
} from "../api/authApi";

import { getCurrentUser } from "../api/userApi";

import { tokenStorage } from "../utils/tokenStorage";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  // ==================================================
  // INITIALIZE AUTHENTICATION
  // ==================================================

  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = tokenStorage.getAccessToken();

      // --------------------------------------
      // No token = not authenticated
      // --------------------------------------

      if (!accessToken) {
        setUser(null);

        setLoading(false);

        return;
      }

      try {
        /*
         * Backend is the source of truth.
         *
         * We do NOT simply trust
         * frndbook_user from localStorage.
         *
         * If access token is expired,
         * axiosClient automatically attempts
         * refresh and retries this request.
         */

        const currentUser = await getCurrentUser();

        setUser(currentUser);

        tokenStorage.updateUser(currentUser);
      } catch (error) {
        console.error("Authentication initialization failed:", error);

        tokenStorage.clear();

        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // ==================================================
  // LOGIN
  // ==================================================

  const login = async (email, password) => {
    const response = await loginApi({
      email,
      password,
    });

    tokenStorage.saveAuth(
      response.accessToken,
      response.refreshToken,
      response.user,
    );

    setUser(response.user);

    return response;
  };

  // ==================================================
  // SIGNUP
  // ==================================================

  const signup = async (name, email, password) => {
    const response = await signupApi({
      name,
      email,
      password,
    });

    return response;
  };

  // ==================================================
  // LOGOUT
  // ==================================================

  const logout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      /*
       * Even if the backend logout request
       * fails, remove local authentication.
       */

      console.error("Logout API failed:", error);
    } finally {
      tokenStorage.clear();

      setUser(null);
    }
  };

  // ==================================================
  // CONTEXT VALUE
  // ==================================================

  const value = {
    user,

    loading,

    isAuthenticated: !!user,

    login,

    signup,

    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
