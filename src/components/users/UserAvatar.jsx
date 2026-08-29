import { useEffect, useState } from "react";

const UserAvatar = ({ name, image, userId, size = "medium" }) => {
  const firstLetter = name?.trim()?.charAt(0)?.toUpperCase() || "?";

  const [imageError, setImageError] = useState(false);

  // CHANGE: Add the profileImage value as a cache-busting version.
  // This forces the browser to request the new image when the image changes.
  const imageUrl =
    image && userId
      ? `${import.meta.env.VITE_API_BASE_URL}/api/users/${userId}/profile-image?v=${encodeURIComponent(image)}`
      : null;

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  if (!imageUrl || imageError) {
    return (
      <div className={`user-avatar user-avatar-placeholder ${size}`}>
        {firstLetter}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={name || "User"}
      className={`user-avatar ${size}`}
      onError={() => setImageError(true)}
    />
  );
};

export default UserAvatar;
