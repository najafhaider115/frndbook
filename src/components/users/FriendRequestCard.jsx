import { formatTimestamp } from "../../utils/displayText.js";
import friendsStyles from "../../styles/friends.module.css";
import { bindStyles } from "../../utils/bindStyles";
import { Link } from "react-router-dom";

import UserAvatar from "./UserAvatar";

const css = bindStyles(friendsStyles);

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
    <div className={css("friend-request-card")}>
      <Link to={`/users/${person.id}`} className={css("friend-request-main")}>
        <UserAvatar
          name={person.name}
          image={person.profileImage}
          userId={person.id}
          size="medium"
        />

        <div className={css("friend-request-info")}>
          <h3>{person.name || "Unknown User"}</h3>

          <p>{person.bio || "No bio available"}</p>

          <span>
            {request.createdAt
              ? formatTimestamp(request.createdAt)
              : "—"}
          </span>
        </div>
      </Link>

      {isReceived ? (
        <div className={css("friend-request-actions")}>
          <button
            type="button"
            className={css("friend-action-button primary")}
            onClick={() => onAccept(request.id)}
            disabled={actionLoading}
          >
            {actionLoading ? "Accepting..." : "Accept"}
          </button>

          <button
            type="button"
            className={css("friend-action-button secondary")}
            onClick={() => onReject(request.id)}
            disabled={actionLoading}
          >
            Reject
          </button>
        </div>
      ) : (
        <span className={css("friend-request-sent-label")}>Request Sent</span>
      )}
    </div>
  );
};

export default FriendRequestCard;
