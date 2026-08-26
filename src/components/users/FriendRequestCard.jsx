import { Link } from "react-router-dom";

import UserAvatar from "./UserAvatar";

const FriendRequestCard = ({
  request,
  type,
  onAccept,
  onReject,
  actionLoading = false,
}) => {
  if (!request) {
    return null;
  }

  const isReceived = type === "received";

  const person = isReceived ? request.sender : request.receiver;

  if (!person) {
    return null;
  }

  return (
    <div className="friend-request-card">
      <Link to={`/users/${person.id}`} className="friend-request-main">
        <UserAvatar
          name={person.name}
          image={person.profileImage}
          userId={person.id}
          size="medium"
        />

        <div className="friend-request-info">
          <h3>{person.name || "Unknown User"}</h3>

          <p>{person.bio || "No bio available"}</p>

          <span>
            {request.createdAt
              ? new Date(request.createdAt).toLocaleString()
              : "—"}
          </span>
        </div>
      </Link>

      {isReceived ? (
        <div className="friend-request-actions">
          <button
            type="button"
            className="friend-action-button primary"
            onClick={() => onAccept(request.id)}
            disabled={actionLoading}
          >
            {actionLoading ? "Accepting..." : "Accept"}
          </button>

          <button
            type="button"
            className="friend-action-button secondary"
            onClick={() => onReject(request.id)}
            disabled={actionLoading}
          >
            Reject
          </button>
        </div>
      ) : (
        <span className="friend-request-sent-label">Request Sent</span>
      )}
    </div>
  );
};

export default FriendRequestCard;
