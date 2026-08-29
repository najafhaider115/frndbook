import axiosClient from "./axiosClient";

// ==================================================
// SIGNUP
// ==================================================

export const signup = async (data) => {
  const response = await axiosClient.post("/api/auth/signup", data);

  return response.data;
};

// ==================================================
// VERIFY EMAIL
// ==================================================

export const verifyEmail = async (data) => {
  const response = await axiosClient.post("/api/auth/verify-email", data);

  return response.data;
};

// ==================================================
// RESEND EMAIL VERIFICATION
// ==================================================

export const resendVerification = async (data) => {
  const response = await axiosClient.post(
    "/api/auth/resend-verification",
    data,
  );

  return response.data;
};

// ==================================================
// LOGIN
// ==================================================

export const login = async (data) => {
  const response = await axiosClient.post("/api/auth/login", data);

  return response.data;
};

// ==================================================
// REFRESH TOKEN
// ==================================================

export const refreshToken = async (refreshToken) => {
  const response = await axiosClient.post("/api/auth/refresh", {
    refreshToken,
  });

  return response.data;
};

// ==================================================
// LOGOUT
// ==================================================

export const logout = async () => {
  const response = await axiosClient.post("/api/auth/logout");

  return response.data;
};

// ==================================================
// FORGOT PASSWORD
// ==================================================

export const forgotPassword = async (email) => {
  const response = await axiosClient.post("/api/auth/forgot-password", {
    email,
  });

  return response.data;
};

// ==================================================
// RESET PASSWORD
// ==================================================

export const resetPassword = async (data) => {
  const response = await axiosClient.post("/api/auth/reset-password", data);

  return response.data;
};
