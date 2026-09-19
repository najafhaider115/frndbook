import friendsStyles from "../../styles/friends.module.css";
import { bindStyles } from "../../utils/bindStyles";
import { Link, useNavigate } from "react-router-dom";

import UserAvatar from "./UserAvatar";

const css = bindStyles(friendsStyles);

const FriendCard = ({ friend, onRemove, removing = false }) => {
  const navigate = useNavigate();

  if (!friend) {
    return null;
  }

  const handleMessage = () => {
    navigate(`/messages?userId=${friend.id}`);
  };

  return (
    <div className={css("friend-card")}>
      <Link to={`/users/${friend.id}`} className={css("friend-card-main")}>
        <UserAvatar
          name={friend.name}
          image={friend.profileImage}
          userId={friend.id}
          size="medium"
        />

        <div className={css("friend-card-info")}>
          <h3>{friend.name || "Unknown User"}</h3>

          <p>{friend.bio || "No bio available"}</p>

          <span className={css("friend-card-status")}>{friend.status || "—"}</span>
        </div>
      </Link>

      <div className={css("friend-card-actions")}>
        <button
          type="button"
          className={css("friend-message-button")}
          onClick={handleMessage}
        >
          Message
        </button>

        <button
          type="button"
          className={css("friend-remove-button")}
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
