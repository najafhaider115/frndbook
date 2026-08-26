import axiosClient from "./axiosClient";

// ==================================================
// GET ALL CONVERSATIONS
// ==================================================

export const getConversations = async () => {
  const response = await axiosClient.get("/api/conversations");

  return response.data;
};

// ==================================================
// GET SINGLE CONVERSATION
// ==================================================

export const getConversation = async (conversationId) => {
  const response = await axiosClient.get(
    `/api/conversations/${conversationId}`,
  );

  return response.data;
};

// ==================================================
// GET OR CREATE CONVERSATION
// ==================================================

export const getOrCreateConversation = async (userId) => {
  const response = await axiosClient.post(`/api/conversations/${userId}`);

  return response.data;
};
