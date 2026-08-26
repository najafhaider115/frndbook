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
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
};

// ==================================================
// SEARCH USERS
// ==================================================

export const searchUsers = async (name, page = 0, size = 10) => {
  const response = await axiosClient.get("/api/users/search", {
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
