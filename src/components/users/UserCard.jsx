import { Link } from "react-router-dom";

import UserAvatar from "./UserAvatar";

const UserCard = ({ user, onClick }) => {
  if (!user) {
    return null;
  }

  const handleClick = () => {
    if (onClick) {
      onClick(user);
    }
  };

  return (
    <Link to={`/users/${user.id}`} className="user-card" onClick={handleClick}>
      <UserAvatar
        name={user.name}
        image={user.profileImage}
        userId={user.id}
        size="medium"
      />

      <div className="user-card-info">
        <h3>{user.name || "Unknown User"}</h3>

        {user.bio ? <p>{user.bio}</p> : <p>No bio available</p>}
      </div>
    </Link>
  );
};

export default UserCard;
