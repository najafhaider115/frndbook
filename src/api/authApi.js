import axiosClient from "./axiosClient";

export const signup = async (data) => {
  const response = await axiosClient.post("/api/auth/signup", data);

  return response.data;
};

export const login = async (data) => {
  const response = await axiosClient.post("/api/auth/login", data);

  return response.data;
};

export const refreshToken = async (refreshToken) => {
  const response = await axiosClient.post("/api/auth/refresh", {
    refreshToken,
  });

  return response.data;
};

export const logout = async () => {
  const response = await axiosClient.post("/api/auth/logout");

  return response.data;
};
