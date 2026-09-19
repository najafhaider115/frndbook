import { apiErrorMessage } from "../utils/apiError.js";
import friendsStyles from "../styles/friends.module.css";
import { bindStyles } from "../utils/bindStyles";
import StatusMessage from "../components/ui/StatusMessage";
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import { useEffect, useState } from "react";

import Navbar from "../components/layout/Navbar";

import FriendRequestCard from "../components/users/FriendRequestCard";

import {
  getReceivedFriendRequests,
  getSentFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
} from "../api/friendApi";

const css = bindStyles(friendsStyles);

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
        apiErrorMessage(error, "Unable to load friend requests"),
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
        apiErrorMessage(error, "Unable to accept friend request"),
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
        apiErrorMessage(error, "Unable to reject friend request"),
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

        <div id="main-content" tabIndex={-1} role="status" className={css("loading-screen")}>Loading friend requests...</div>
      </>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <>
      <Navbar />

      <PageContainer className={css("friend-requests-page")}>
        <Card className={css("friend-requests-card")}>
          <div className={css("friends-header")}>
            <div>
              <h1>Friend Requests</h1>

              <p>Manage your incoming and outgoing requests.</p>
            </div>
          </div>

          {error && <StatusMessage tone="error" className={css("error")}>{error}</StatusMessage>}

          {/* ========================================
              RECEIVED
              ======================================== */}

          <section className={css("request-section")}>
            <div className={css("request-section-header")}>
              <h2>Received</h2>

              <span>{receivedRequests.length}</span>
            </div>

            {receivedRequests.length === 0 ? (
              <p className={css("request-empty")}>No pending friend requests.</p>
            ) : (
              <div className={css("friend-request-list")}>
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

          <section className={css("request-section")}>
            <div className={css("request-section-header")}>
              <h2>Sent</h2>

              <span>{sentRequests.length}</span>
            </div>

            {sentRequests.length === 0 ? (
              <p className={css("request-empty")}>No pending sent requests.</p>
            ) : (
              <div className={css("friend-request-list")}>
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
        </Card>
      </PageContainer>
    </>
  );
};

export default FriendRequests;
