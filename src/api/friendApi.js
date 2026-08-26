import axiosClient from "./axiosClient";

// ==================================================
// FRIEND REQUESTS
// ==================================================

export const sendFriendRequest = async (receiverId) => {
  const response = await axiosClient.post("/api/friends/requests", {
    receiverId,
  });

  return response.data;
};

export const getReceivedFriendRequests = async () => {
  const response = await axiosClient.get("/api/friends/requests/received");

  return response.data;
};

export const getSentFriendRequests = async () => {
  const response = await axiosClient.get("/api/friends/requests/sent");

  return response.data;
};

export const acceptFriendRequest = async (requestId) => {
  const response = await axiosClient.patch(
    `/api/friends/requests/${requestId}/accept`,
  );

  return response.data;
};

export const rejectFriendRequest = async (requestId) => {
  await axiosClient.patch(`/api/friends/requests/${requestId}/reject`);
};

// ==================================================
// FRIENDS
// ==================================================

export const getFriends = async () => {
  const response = await axiosClient.get("/api/friends");

  return response.data;
};

export const removeFriend = async (friendId) => {
  await axiosClient.delete(`/api/friends/${friendId}`);
};
