export const FRIENDSHIP_STATUS = {
  NONE: "NONE",
  REQUEST_SENT: "REQUEST_SENT",
  REQUEST_RECEIVED: "REQUEST_RECEIVED",
  FRIENDS: "FRIENDS",
};

const sameUserId = (firstId, secondId) => String(firstId) === String(secondId);

export const getFriendshipState = (
  userId,
  friends = [],
  receivedRequests = [],
  sentRequests = [],
) => {
  const isFriend = friends.some((friend) => sameUserId(friend.id, userId));

  if (isFriend) {
    return {
      status: FRIENDSHIP_STATUS.FRIENDS,
      requestId: null,
    };
  }

  const receivedRequest = receivedRequests.find((request) =>
    sameUserId(request.sender?.id, userId),
  );

  if (receivedRequest) {
    return {
      status: FRIENDSHIP_STATUS.REQUEST_RECEIVED,
      requestId: receivedRequest.id,
    };
  }

  const sentRequest = sentRequests.find((request) =>
    sameUserId(request.receiver?.id, userId),
  );

  if (sentRequest) {
    return {
      status: FRIENDSHIP_STATUS.REQUEST_SENT,
      requestId: sentRequest.id,
    };
  }

  return {
    status: FRIENDSHIP_STATUS.NONE,
    requestId: null,
  };
};
