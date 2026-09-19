import { apiErrorMessage } from "../../utils/apiError.js";
import usersStyles from "../../styles/users.module.css";
import { bindStyles } from "../../utils/bindStyles";
import StatusMessage from "../ui/StatusMessage";
import { useEffect, useState } from "react";

import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  searchUsers,
} from "../../api/userApi";

import { useAuth } from "../../auth/AuthContext";

import UserCard from "./UserCard";

const css = bindStyles(usersStyles);

const UserSearch = () => {
  const { user: currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");

  const [results, setResults] = useState([]);

  const [recentSearches, setRecentSearches] = useState([]);

  const [page, setPage] = useState(0);
  const [requestedPage, setRequestedPage] = useState(0);
  const [requestVersion, setRequestVersion] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [recentError, setRecentError] = useState("");

  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(false);

  const [recentLoading, setRecentLoading] = useState(true);

  const [error, setError] = useState("");

  // ==================================================
  // LOAD RECENT SEARCHES
  // ==================================================

  useEffect(() => {
    let active = true;
    const loadRecentSearches = async () => {
      try {
        setRecentLoading(true);

        const data = await getRecentSearches();

        if (active) setRecentSearches(data || []);
      } catch (error) {
        if (active) setRecentError(apiErrorMessage(error, "Unable to load recent searches"));
      } finally {
        if (active) setRecentLoading(false);
      }
    };

    loadRecentSearches();
    return () => { active = false; };
  }, []);

  // One effect owns debouncing, paging and cancellation for each search.
  useEffect(() => {
    const query = searchTerm.trim();
    if (!query) return;
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await searchUsers(query, requestedPage, 10, abort.signal);
        if (abort.signal.aborted) return;
        setResults((data?.content || []).filter(item => String(item.id) !== String(currentUser?.id)));
        setPage(data?.number ?? requestedPage);
        setTotalPages(data?.totalPages ?? 0);
      } catch (error) {
        if (!abort.signal.aborted) {
          setError(apiErrorMessage(error, "Unable to search users"));
          setResults([]);
        }
      } finally { if (!abort.signal.aborted) setLoading(false); }
    }, requestedPage === 0 ? 400 : 0);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [searchTerm, requestedPage, requestVersion, currentUser?.id]);

  const changeSearch = value => {
    setSearchTerm(value); setRequestedPage(0); setPage(0); setTotalPages(0);
    setResults([]); setError(""); setLoading(Boolean(value.trim()));
  };
  const loadPage = nextPage => {
    if (loading || nextPage === page) return;
    setError(""); setLoading(true); setRequestedPage(nextPage); setRequestVersion(version => version + 1);
  };

  // ==================================================
  // USER CLICK
  // ==================================================

  const handleUserClick = async (selectedUser) => {
    try {
      await addRecentSearch(selectedUser.id);

      /*
       * Refresh recent searches so the UI
       * immediately reflects the backend state.
       */

      const updatedRecentSearches = await getRecentSearches();

      setRecentSearches(updatedRecentSearches || []);
    } catch (error) {
      console.error("Failed to save recent search:", error);
    }
  };

  // ==================================================
  // CLEAR RECENT SEARCHES
  // ==================================================

  const handleClearRecentSearches = async () => {
    if (clearing) return;
    setClearing(true); setRecentError("");
    try {
      await clearRecentSearches();

      setRecentSearches([]);
    } catch (error) {
      setRecentError(apiErrorMessage(error, "Unable to clear recent searches"));
    } finally { setClearing(false); }
  };

  return (
    <section className={css("user-search")}>
      <div className={css("section-header")}>
        <h2>Find People</h2>
      </div>

      <input
        type="text"
        className={css("search-input")}
        aria-label="Search people by name"
        placeholder="Search users by name..."
        value={searchTerm}
        onChange={(event) => changeSearch(event.target.value)}
      />

      {error && <StatusMessage tone="error" className={css("error")}>{error}
        <button type="button" onClick={() => { setError(""); setLoading(true); setRequestVersion(version => version + 1); }}>Retry search</button>
      </StatusMessage>}

      {loading && <p role="status" className={css("search-status")}>Searching...</p>}

      {!loading && searchTerm.trim() && results.length === 0 && !error && (
        <p className={css("search-status")}>No users found.</p>
      )}

      <div aria-busy={loading} className={css("user-results")}>
        {results.map((searchedUser) => (
          <UserCard
            key={searchedUser.id}
            user={searchedUser}
            onClick={handleUserClick}
          />
        ))}
      </div>

      {totalPages > 1 && searchTerm.trim() && (
        <div className={css("pagination")}>
          <button
            disabled={loading || page === 0}
            onClick={() => loadPage(page - 1)}
          >
            Previous
          </button>

          <span>
            Page {page + 1} of {totalPages}
          </span>

          <button
            disabled={loading || page >= totalPages - 1}
            onClick={() => loadPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {!searchTerm.trim() && (
        <section className={css("recent-searches")}>
          <div className={css("section-header")}>
            <h3>Recent Searches</h3>

            {recentSearches.length > 0 && (
              <button
                className={css("text-button")}
                onClick={handleClearRecentSearches}
                disabled={clearing}
              >
                {clearing ? "Clearing..." : "Clear"}
              </button>
            )}
          </div>

          {recentError && <StatusMessage tone="error">{recentError}</StatusMessage>}

          {recentLoading && (
            <p className={css("search-status")}>Loading recent searches...</p>
          )}

          {!recentLoading && !recentError && recentSearches.length === 0 && (
            <p className={css("search-status")}>No recent searches.</p>
          )}

          <div className={css("user-results")}>
            {recentSearches.map((recentUser) => (
              <UserCard
                key={recentUser.id}
                user={recentUser}
                onClick={handleUserClick}
              />
            ))}
          </div>
        </section>
      )}
    </section>
  );
};

export default UserSearch;
