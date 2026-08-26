import axiosClient from "./axiosClient";

// ==================================================
// GET NOTIFICATIONS
// ==================================================

export const getNotifications = async (page = 0, size = 10) => {
  const response = await axiosClient.get("/api/notifications", {
    params: {
      page,
      size,
    },
  });

  return response.data;
};

// ==================================================
// GET UNREAD NOTIFICATIONS
// ==================================================

export const getUnreadNotifications = async (page = 0, size = 10) => {
  const response = await axiosClient.get("/api/notifications/unread", {
    params: {
      page,
      size,
    },
  });

  return response.data;
};

// ==================================================
// GET UNREAD COUNT
// ==================================================

export const getUnreadNotificationCount = async () => {
  const response = await axiosClient.get("/api/notifications/unread-count");

  return response.data;
};

// ==================================================
// MARK ONE AS READ
// ==================================================

export const markNotificationAsRead = async (notificationId) => {
  const response = await axiosClient.patch(
    `/api/notifications/${notificationId}/read`,
  );

  return response.data;
};

// ==================================================
// MARK ALL AS READ
// ==================================================

export const markAllNotificationsAsRead = async () => {
  const response = await axiosClient.patch("/api/notifications/read-all");

  return response.data;
};
