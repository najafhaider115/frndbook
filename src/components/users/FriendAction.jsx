import { FRIENDSHIP_STATUS } from "../../utils/friendship";

const FriendAction = ({
  status,
  onAdd,
  onAccept,
  onReject,
  onRemove,
  onMessage,
  loading = false,
}) => {
  // ==================================================
  // NO FRIENDSHIP
  // ==================================================

  if (status === FRIENDSHIP_STATUS.NONE) {
    return (
      <button
        type="button"
        className="friend-action-button primary"
        onClick={onAdd}
        disabled={loading}
      >
        {loading ? "Sending..." : "Add Friend"}
      </button>
    );
  }

  // ==================================================
  // REQUEST SENT
  // ==================================================

  if (status === FRIENDSHIP_STATUS.REQUEST_SENT) {
    return (
      <button type="button" className="friend-action-button secondary" disabled>
        Request Sent
      </button>
    );
  }

  // ==================================================
  // REQUEST RECEIVED
  // ==================================================

  if (status === FRIENDSHIP_STATUS.REQUEST_RECEIVED) {
    return (
      <div className="friend-action-group">
        <button
          type="button"
          className="friend-action-button primary"
          onClick={onAccept}
          disabled={loading}
        >
          {loading ? "Accepting..." : "Accept"}
        </button>

        <button
          type="button"
          className="friend-action-button secondary"
          onClick={onReject}
          disabled={loading}
        >
          Reject
        </button>
      </div>
    );
  }

  // ==================================================
  // FRIENDS
  // ==================================================

  if (status === FRIENDSHIP_STATUS.FRIENDS) {
    return (
      <div className="friend-action-group">
        <span className="friend-status-label">✓ Friends</span>

        <button
          type="button"
          className="friend-action-button primary"
          onClick={onMessage}
          disabled={loading}
        >
          Message
        </button>

        <button
          type="button"
          className="friend-action-button danger"
          onClick={onRemove}
          disabled={loading}
        >
          {loading ? "Removing..." : "Remove Friend"}
        </button>
      </div>
    );
  }

  return null;
};

export default FriendAction;
