import { useEffect, useRef, useState } from "react";

import Navbar from "../components/layout/Navbar";

import UserAvatar from "../components/users/UserAvatar";

import { updateProfile, updateProfileImage } from "../api/userApi";

import { useAuth } from "../auth/AuthContext";

const Profile = () => {
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState(user);

  const [name, setName] = useState(user?.name || "");

  const [bio, setBio] = useState(user?.bio || "");

  const [loading, setLoading] = useState(false);

  const [imageLoading, setImageLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [previewImage, setPreviewImage] = useState(null);

  const fileInputRef = useRef(null);

  // ==================================================
  // SYNC USER
  // ==================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfile(user);
    setName(user.name || "");
    setBio(user.bio || "");
  }, [user]);

  // ==================================================
  // CLEANUP PREVIEW
  // ==================================================

  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  // ==================================================
  // UPDATE PROFILE
  // ==================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const updatedUser = await updateProfile(name.trim(), bio.trim());

      setProfile(updatedUser);
      setName(updatedUser.name || "");
      setBio(updatedUser.bio || "");

      setSuccess("Profile updated successfully.");
    } catch (error) {
      console.error("Profile update failed:", error);

      setError(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // IMAGE SELECTION
  // ==================================================

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    setError("");
    setSuccess("");

    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }

    const previewUrl = URL.createObjectURL(file);

    setPreviewImage(previewUrl);

    handleImageUpload(file);
  };

  // ==================================================
  // IMAGE UPLOAD
  // ==================================================

  const handleImageUpload = async (file) => {
    setImageLoading(true);

    setError("");
    setSuccess("");

    try {
      const updatedUser = await updateProfileImage(file);

      setProfile(updatedUser);

      setSuccess("Profile image updated successfully.");

      /*
       * Keep the local preview visible until
       * the profile page is refreshed.
       */
    } catch (error) {
      console.error("Profile image upload failed:", error);

      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }

      setPreviewImage(null);

      setError(
        error.response?.data?.message || "Failed to upload profile image",
      );
    } finally {
      setImageLoading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (authLoading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!profile) {
    return <div className="loading-screen">Unable to load profile.</div>;
  }

  return (
    <>
      <Navbar />

      <main className="profile-page">
        <div className="profile-card">
          <h1>My Profile</h1>

          {error && <p className="error">{error}</p>}

          {success && <p className="success">{success}</p>}

          <div className="profile-image-section">
            <UserAvatar
              name={profile.name}
              image={previewImage || profile.profileImage}
              userId={profile.id}
              size="large"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageLoading}
            >
              {imageLoading ? "Uploading..." : "Change Photo"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              hidden
            />
          </div>

          <form className="profile-form" onSubmit={handleSubmit}>
            <label>Name</label>

            <input
              type="text"
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              required
            />

            <label>Email</label>

            <input type="email" value={profile.email} disabled />

            <label>Bio</label>

            <textarea
              value={bio}
              maxLength={500}
              rows={5}
              onChange={(event) => setBio(event.target.value)}
            />

            <div className="character-count">{bio.length}/500</div>

            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>

          <div className="profile-details">
            <p>
              <strong>Status:</strong> {profile.status || "—"}
            </p>

            <p>
              <strong>Last seen:</strong>{" "}
              {profile.lastSeen
                ? new Date(profile.lastSeen).toLocaleString()
                : "—"}
            </p>
          </div>
        </div>
      </main>
    </>
  );
};

export default Profile;
