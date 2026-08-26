import axiosClient from "./axiosClient";

// ==================================================
// GET MESSAGE HISTORY
// ==================================================

export const getMessages = async (conversationId, page = 0, size = 20) => {
  const response = await axiosClient.get(
    `/api/conversations/${conversationId}/messages`,
    {
      params: {
        page,
        size,
      },
    },
  );

  return response.data;
};

// ==================================================
// SEND MESSAGE THROUGH REST
// ==================================================

export const sendMessage = async (conversationId, content) => {
  const response = await axiosClient.post(
    `/api/conversations/${conversationId}/messages`,
    {
      content,
    },
  );

  return response.data;
};

// ==================================================
// MARK CONVERSATION MESSAGES AS READ
// ==================================================

export const markMessagesAsRead = async (conversationId) => {
  const response = await axiosClient.patch(
    `/api/conversations/${conversationId}/messages/read`,
  );

  return response.data;
};
