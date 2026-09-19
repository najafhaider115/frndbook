import { formatTimestamp } from "../utils/displayText.js";
import { apiErrorMessage } from "../utils/apiError.js";
import friendsStyles from "../styles/friends.module.css";
import profileStyles from "../styles/profile.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Navbar from "../components/layout/Navbar";

import UserAvatar from "../components/users/UserAvatar";
import FriendAction from "../components/users/FriendAction";

import { getUserById } from "../api/userApi";

import {
  sendFriendRequest,
  getFriends,
  getReceivedFriendRequests,
  getSentFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from "../api/friendApi";

import { useAuth } from "../auth/AuthContext";

import { FRIENDSHIP_STATUS, getFriendshipState } from "../utils/friendship";

const css = bindStyles(friendsStyles, profileStyles);

const UserProfile = () => {
  const { userId } = useParams();

  const navigate = useNavigate();

  const { user: currentUser } = useAuth();

  const [user, setUser] = useState(null);

  const [friendshipStatus, setFriendshipStatus] = useState(
    FRIENDSHIP_STATUS.NONE,
  );

  const [friendRequestId, setFriendRequestId] = useState(null);

  const [loading, setLoading] = useState(true);

  const [friendshipLoading, setFriendshipLoading] = useState(false);

  const [friendshipLoaded, setFriendshipLoaded] = useState(false);

  const [error, setError] = useState("");

  const [friendshipError, setFriendshipError] = useState("");

  // ==================================================
  // LOAD PROFILE
  // ==================================================

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getUserById(userId);

        setUser(data);
      } catch (error) {
        console.error("Failed to load user profile:", error);

        setError(
          apiErrorMessage(error, "Unable to load user profile"),
        );
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  // ==================================================
  // LOAD FRIENDSHIP STATE
  // ==================================================

  useEffect(() => {
    if (!user || !currentUser) {
      return;
    }

    if (String(user.id) === String(currentUser.id)) {
      setFriendshipLoaded(true);

      return;
    }

    const loadFriendshipState = async () => {
      try {
        setFriendshipError("");
        setFriendshipLoaded(false);

        const [friends, receivedRequests, sentRequests] = await Promise.all([
          getFriends(),
          getReceivedFriendRequests(),
          getSentFriendRequests(),
        ]);

        const state = getFriendshipState(
          user.id,
          friends || [],
          receivedRequests || [],
          sentRequests || [],
        );

        setFriendshipStatus(state.status);

        setFriendRequestId(state.requestId);
      } catch (error) {
        console.error("Failed to load friendship state:", error);

        setFriendshipError(
          apiErrorMessage(error, "Unable to load friendship status"),
        );
      } finally {
        setFriendshipLoaded(true);
      }
    };

    loadFriendshipState();
  }, [user, currentUser]);

  // ==================================================
  // ADD FRIEND
  // ==================================================

  const handleAddFriend = async () => {
    if (!user) {
      return;
    }

    try {
      setFriendshipLoading(true);
      setFriendshipError("");

      const request = await sendFriendRequest(user.id);

      setFriendshipStatus(FRIENDSHIP_STATUS.REQUEST_SENT);

      setFriendRequestId(request?.id || null);
    } catch (error) {
      console.error("Failed to send friend request:", error);

      setFriendshipError(
        apiErrorMessage(error, "Unable to send friend request"),
      );
    } finally {
      setFriendshipLoading(false);
    }
  };

  // ==================================================
  // ACCEPT
  // ==================================================

  const handleAcceptFriend = async () => {
    if (!friendRequestId) {
      return;
    }

    try {
      setFriendshipLoading(true);
      setFriendshipError("");

      await acceptFriendRequest(friendRequestId);

      setFriendshipStatus(FRIENDSHIP_STATUS.FRIENDS);

      setFriendRequestId(null);
    } catch (error) {
      console.error("Failed to accept friend request:", error);

      setFriendshipError(
        apiErrorMessage(error, "Unable to accept friend request"),
      );
    } finally {
      setFriendshipLoading(false);
    }
  };

  // ==================================================
  // REJECT
  // ==================================================

  const handleRejectFriend = async () => {
    if (!friendRequestId) {
      return;
    }

    try {
      setFriendshipLoading(true);
      setFriendshipError("");

      await rejectFriendRequest(friendRequestId);

      setFriendshipStatus(FRIENDSHIP_STATUS.NONE);

      setFriendRequestId(null);
    } catch (error) {
      console.error("Failed to reject friend request:", error);

      setFriendshipError(
        apiErrorMessage(error, "Unable to reject friend request"),
      );
    } finally {
      setFriendshipLoading(false);
    }
  };

  // ==================================================
  // REMOVE FRIEND
  // ==================================================

  const handleRemoveFriend = async () => {
    if (!user) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove ${user.name} from your friends?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setFriendshipLoading(true);
      setFriendshipError("");

      await removeFriend(user.id);

      setFriendshipStatus(FRIENDSHIP_STATUS.NONE);
    } catch (error) {
      console.error("Failed to remove friend:", error);

      setFriendshipError(
        apiErrorMessage(error, "Unable to remove friend"),
      );
    } finally {
      setFriendshipLoading(false);
    }
  };

  // ==================================================
  // OPEN MESSAGE
  // ==================================================

  const handleMessage = () => {
    if (!user) {
      return;
    }

    /*
     * Reuse the existing Messages page flow.
     *
     * Messages.jsx already handles:
     *
     * /messages?userId={userId}
     *
     * and resolves/opens the conversation using
     * getOrCreateConversation().
     */
    navigate(`/messages?userId=${user.id}`);
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <>
        <Navbar />

        <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Loading profile...</div>
      </>
    );
  }

  // ==================================================
  // PROFILE ERROR
  // ==================================================

  if (error || !user) {
    return (
      <>
        <Navbar />

        <PageContainer className={css("profile-page")}>
          <Card className={css("profile-card")}>
            <StatusMessage tone="error" className={css("error")}>{error || "User not found."}</StatusMessage>

            <Link to="/" className={css("back-link")}>
              ← Back to Home
            </Link>
          </Card>
        </PageContainer>
      </>
    );
  }

  const isOwnProfile = String(user.id) === String(currentUser?.id);

  // ==================================================
  // UI
  // ==================================================

  return (
    <>
      <Navbar />

      <PageContainer className={css("profile-page")}>
        <Card className={css("profile-card user-profile-card")}>
          <Link to="/" className={css("back-link")}>
            ← Back to Home
          </Link>

          <div className={css("profile-image-section")}>
            <UserAvatar
              name={user.name}
              image={user.profileImage}
              userId={user.id}
              size="large"
            />
          </div>

          <div className={css("user-profile-info")}>
            <h1>{user.name}</h1>

            <p className={css("user-profile-bio")}>{user.bio || "No bio available"}</p>

            <div className={css("profile-details")}>
              <p>
                <strong>Status:</strong> {user.status || "—"}
              </p>

              <p>
                <strong>Last seen:</strong>{" "}
                {user.lastSeen ? formatTimestamp(user.lastSeen) : "—"}
              </p>
            </div>
          </div>

          {!isOwnProfile && (
            <div className={css("friend-action-section")}>
              {friendshipError && <StatusMessage tone="error" className={css("error")}>{friendshipError}</StatusMessage>}

              {!friendshipLoaded ? (
                <p className={css("friendship-loading")}>Checking friendship...</p>
              ) : (
                <FriendAction
                  status={friendshipStatus}
                  onAdd={handleAddFriend}
                  onAccept={handleAcceptFriend}
                  onReject={handleRejectFriend}
                  onRemove={handleRemoveFriend}
                  onMessage={handleMessage}
                  loading={friendshipLoading}
                />
              )}
            </div>
          )}
        </Card>
      </PageContainer>
    </>
  );
};

export default UserProfile;
