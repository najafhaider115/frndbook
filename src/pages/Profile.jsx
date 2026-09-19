import { formatTimestamp } from "../utils/displayText.js";
import { apiError } from "../utils/apiError";
import { apiErrorMessage } from "../utils/apiError.js";
import profileStyles from "../styles/profile.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import FormField from "../components/ui/FormField";
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import { useEffect, useRef, useState } from "react";

import Navbar from "../components/layout/Navbar";

import UserAvatar from "../components/users/UserAvatar";

import { updateProfile, updateProfileImage } from "../api/userApi";

import { useAuth } from "../auth/AuthContext";

const css = bindStyles(profileStyles);

const ProfileForm = () => {
  const { user, loading: authLoading, updateUser, sessionKey } = useAuth();
  const profile = user;
  const busy = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const [nameDraft, setName] = useState(null);
  const name = nameDraft ?? user?.name ?? "";

  const [bioDraft, setBio] = useState(null);
  const bio = bioDraft ?? user?.bio ?? "";

  const [loading, setLoading] = useState(false);

  const [imageLoading, setImageLoading] = useState(false);

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [success, setSuccess] = useState("");

  const [previewImage, setPreviewImage] = useState(null);

  const fileInputRef = useRef(null);

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
    if (busy.current) return;
    busy.current = true;

    setError("");
    setFieldErrors({});
    setSuccess("");
    setLoading(true);

    try {
      const updatedUser = await updateProfile(name.trim(), bio.trim());

      if (!mounted.current || !updateUser(updatedUser, sessionKey)) return;
      setName(null);
      setBio(null);

      setSuccess("Profile updated successfully.");
    } catch (error) {
      if (!mounted.current) return;
      setFieldErrors(apiError(error).fieldErrors);
      console.error("Profile update failed:", error);

      setError(apiErrorMessage(error, "Failed to update profile"));
    } finally {
      busy.current = false;
      if (mounted.current) setLoading(false);
    }
  };

  // ==================================================
  // IMAGE SELECTION
  // ==================================================

  const handleImageChange = (event) => {
    if (busy.current) return;
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please select a JPEG, PNG or WebP image.");
      return;
    }

    setError("");
    setFieldErrors({});
    setSuccess("");

    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }

    const previewUrl = URL.createObjectURL(file);

    setPreviewImage(previewUrl);

    void handleImageUpload(file);
  };

  // ==================================================
  // IMAGE UPLOAD
  // ==================================================

  const handleImageUpload = async (file) => {
    busy.current = true;
    setImageLoading(true);

    setError("");
    setFieldErrors({});
    setSuccess("");

    try {
      const updatedUser = await updateProfileImage(file);

      if (!mounted.current || !updateUser(updatedUser, sessionKey)) return;

      setSuccess("Profile image updated successfully.");

      setPreviewImage(null);
    } catch (error) {
      if (!mounted.current) return;
      setFieldErrors(apiError(error).fieldErrors);
      console.error("Profile image upload failed:", error);

      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }

      setPreviewImage(null);

      setError(
        apiErrorMessage(error, "Failed to upload profile image"),
      );
    } finally {
      busy.current = false;
      if (mounted.current) setImageLoading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (authLoading) {
    return <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Loading...</div>;
  }

  if (!profile) {
    return <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Unable to load profile.</div>;
  }

  return (
    <>
      <Navbar />

      <PageContainer className={css("profile-page")}>
        <Card className={css("profile-card")}>
          <h1>My Profile</h1>

          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}

          {success && <StatusMessage tone="success" className={css("success")}>{success}</StatusMessage>}

          <div className={css("profile-image-section")}>
            <UserAvatar
              name={profile.name}
              image={previewImage || profile.profileImage}
              userId={profile.id}
              size="large"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageLoading || loading}
            >
              {imageLoading ? "Uploading..." : "Change Photo"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              hidden
            />
          </div>

          <form className={css("profile-form")} onSubmit={handleSubmit}>

            <FormField label="Name" error={fieldErrors.name} autoComplete="name"
              type="text"
              disabled={loading || imageLoading}
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              required
            />

            <FormField label="Email" type="email" autoComplete="email" value={profile.email} disabled />

            <FormField as="textarea" label="Bio" error={fieldErrors.bio}
              disabled={loading || imageLoading}
              value={bio}
              maxLength={500}
              rows={5}
              onChange={(event) => setBio(event.target.value)}
            />

            <div className={css("character-count")}>{bio.length}/500</div>

            <button type="submit" disabled={loading || imageLoading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>

          <div className={css("profile-details")}>
            <p>
              <strong>Status:</strong> {profile.status || "—"}
            </p>

            <p>
              <strong>Last seen:</strong>{" "}
              {profile.lastSeen
                ? formatTimestamp(profile.lastSeen)
                : "—"}
            </p>
          </div>
        </Card>
      </PageContainer>
    </>
  );
};

export default function Profile() {
  const { user, sessionKey } = useAuth();
  return <ProfileForm key={`${sessionKey}:${user?.id}`} />;
}
