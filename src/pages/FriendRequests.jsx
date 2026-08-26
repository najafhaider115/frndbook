import { useEffect, useState } from "react";

import Navbar from "../components/layout/Navbar";

import FriendRequestCard from "../components/users/FriendRequestCard";

import {
  getReceivedFriendRequests,
  getSentFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
} from "../api/friendApi";

const FriendRequests = () => {
  const [receivedRequests, setReceivedRequests] = useState([]);

  const [sentRequests, setSentRequests] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [actionRequestId, setActionRequestId] = useState(null);

  // ==================================================
  // LOAD REQUESTS
  // ==================================================

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const [received, sent] = await Promise.all([
        getReceivedFriendRequests(),
        getSentFriendRequests(),
      ]);

      setReceivedRequests(received || []);
      setSentRequests(sent || []);
    } catch (error) {
      console.error("Failed to load friend requests:", error);

      setError(
        error.response?.data?.message || "Unable to load friend requests",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // ==================================================
  // ACCEPT
  // ==================================================

  const handleAccept = async (requestId) => {
    try {
      setError("");
      setActionRequestId(requestId);

      await acceptFriendRequest(requestId);

      setReceivedRequests((requests) =>
        requests.filter((request) => request.id !== requestId),
      );
    } catch (error) {
      console.error("Failed to accept friend request:", error);

      setError(
        error.response?.data?.message || "Unable to accept friend request",
      );
    } finally {
      setActionRequestId(null);
    }
  };

  // ==================================================
  // REJECT
  // ==================================================

  const handleReject = async (requestId) => {
    try {
      setError("");
      setActionRequestId(requestId);

      await rejectFriendRequest(requestId);

      setReceivedRequests((requests) =>
        requests.filter((request) => request.id !== requestId),
      );
    } catch (error) {
      console.error("Failed to reject friend request:", error);

      setError(
        error.response?.data?.message || "Unable to reject friend request",
      );
    } finally {
      setActionRequestId(null);
    }
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <>
        <Navbar />

        <div className="loading-screen">Loading friend requests...</div>
      </>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <>
      <Navbar />

      <main className="friend-requests-page">
        <div className="friend-requests-card">
          <div className="friends-header">
            <div>
              <h1>Friend Requests</h1>

              <p>Manage your incoming and outgoing requests.</p>
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          {/* ========================================
              RECEIVED
              ======================================== */}

          <section className="request-section">
            <div className="request-section-header">
              <h2>Received</h2>

              <span>{receivedRequests.length}</span>
            </div>

            {receivedRequests.length === 0 ? (
              <p className="request-empty">No pending friend requests.</p>
            ) : (
              <div className="friend-request-list">
                {receivedRequests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    type="received"
                    onAccept={handleAccept}
                    onReject={handleReject}
                    actionLoading={actionRequestId === request.id}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ========================================
              SENT
              ======================================== */}

          <section className="request-section">
            <div className="request-section-header">
              <h2>Sent</h2>

              <span>{sentRequests.length}</span>
            </div>

            {sentRequests.length === 0 ? (
              <p className="request-empty">No pending sent requests.</p>
            ) : (
              <div className="friend-request-list">
                {sentRequests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    type="sent"
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
};

export default FriendRequests;
