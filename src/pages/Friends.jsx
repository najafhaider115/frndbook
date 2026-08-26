import { useEffect, useState } from "react";

import Navbar from "../components/layout/Navbar";

import FriendCard from "../components/users/FriendCard";

import { getFriends, removeFriend } from "../api/friendApi";

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

      setError(error.response?.data?.message || "Unable to load friends");
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

      setError(error.response?.data?.message || "Unable to remove friend");
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

        <div className="loading-screen">Loading friends...</div>
      </>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <>
      <Navbar />

      <main className="friends-page">
        <div className="friends-card">
          <div className="friends-header">
            <div>
              <h1>Friends</h1>

              <p>
                {friends.length} {friends.length === 1 ? "friend" : "friends"}
              </p>
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          {!error && friends.length === 0 && (
            <div className="friends-empty">
              <h2>No friends yet</h2>

              <p>Search for people and send them a friend request.</p>
            </div>
          )}

          {friends.length > 0 && (
            <div className="friends-list">
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
        </div>
      </main>
    </>
  );
};

export default Friends;
