import { Link, useNavigate } from "react-router-dom";

import UserAvatar from "./UserAvatar";

const FriendCard = ({ friend, onRemove, removing = false }) => {
  const navigate = useNavigate();

  if (!friend) {
    return null;
  }

  const handleMessage = () => {
    navigate(`/messages?userId=${friend.id}`);
  };

  return (
    <div className="friend-card">
      <Link to={`/users/${friend.id}`} className="friend-card-main">
        <UserAvatar
          name={friend.name}
          image={friend.profileImage}
          userId={friend.id}
          size="medium"
        />

        <div className="friend-card-info">
          <h3>{friend.name || "Unknown User"}</h3>

          <p>{friend.bio || "No bio available"}</p>

          <span className="friend-card-status">{friend.status || "—"}</span>
        </div>
      </Link>

      <div className="friend-card-actions">
        <button
          type="button"
          className="friend-message-button"
          onClick={handleMessage}
        >
          Message
        </button>

        <button
          type="button"
          className="friend-remove-button"
          onClick={() => onRemove(friend)}
          disabled={removing}
        >
          {removing ? "Removing..." : "Remove"}
        </button>
      </div>
    </div>
  );
};

export default FriendCard;
