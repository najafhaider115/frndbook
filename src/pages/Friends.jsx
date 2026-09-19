import { apiErrorMessage } from "../utils/apiError.js";
import friendsStyles from "../styles/friends.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import { useEffect, useState } from "react";

import Navbar from "../components/layout/Navbar";

import FriendCard from "../components/users/FriendCard";

import { getFriends, removeFriend } from "../api/friendApi";

const css = bindStyles(friendsStyles);

const Friends = () => {
  const [friends, setFriends] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [removingFriendId, setRemovingFriendId] = useState(null);

  // ==================================================
  // LOAD FRIENDS
  // ==================================================

  const loadFriends = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getFriends();

      setFriends(data || []);
    } catch (error) {
      console.error("Failed to load friends:", error);

      setError(apiErrorMessage(error, "Unable to load friends"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  // ==================================================
  // REMOVE FRIEND
  // ==================================================

  const handleRemoveFriend = async (friend) => {
    if (!friend) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove ${friend.name} from your friends?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setRemovingFriendId(friend.id);

      await removeFriend(friend.id);

      setFriends((currentFriends) =>
        currentFriends.filter(
          (currentFriend) => currentFriend.id !== friend.id,
        ),
      );
    } catch (error) {
      console.error("Failed to remove friend:", error);

      setError(apiErrorMessage(error, "Unable to remove friend"));
    } finally {
      setRemovingFriendId(null);
    }
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <>
        <Navbar />

        <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Loading friends...</div>
      </>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <>
      <Navbar />

      <PageContainer className={css("friends-page")}>
        <Card className={css("friends-card")}>
          <div className={css("friends-header")}>
            <div>
              <h1>Friends</h1>

              <p>
                {friends.length} {friends.length === 1 ? "friend" : "friends"}
              </p>
            </div>
          </div>

          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}

          {!error && friends.length === 0 && (
            <div className={css("friends-empty")}>
              <h2>No friends yet</h2>

              <p>Search for people and send them a friend request.</p>
            </div>
          )}

          {friends.length > 0 && (
            <div className={css("friends-list")}>
              {friends.map((friend) => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  onRemove={handleRemoveFriend}
                  removing={removingFriendId === friend.id}
                />
              ))}
            </div>
          )}
        </Card>
      </PageContainer>
    </>
  );
};

export default Friends;
