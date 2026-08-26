import { useEffect, useState } from "react";

import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  searchUsers,
} from "../../api/userApi";

import { useAuth } from "../../auth/AuthContext";

import UserCard from "./UserCard";

const UserSearch = () => {
  const { user: currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");

  const [results, setResults] = useState([]);

  const [recentSearches, setRecentSearches] = useState([]);

  const [page, setPage] = useState(0);

  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(false);

  const [recentLoading, setRecentLoading] = useState(true);

  const [error, setError] = useState("");

  // ==================================================
  // LOAD RECENT SEARCHES
  // ==================================================

  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        setRecentLoading(true);

        const data = await getRecentSearches();

        setRecentSearches(data || []);
      } catch (error) {
        console.error("Failed to load recent searches:", error);
      } finally {
        setRecentLoading(false);
      }
    };

    loadRecentSearches();
  }, []);

  // ==================================================
  // SEARCH
  // ==================================================

  useEffect(() => {
    const trimmedSearch = searchTerm.trim();

    if (!trimmedSearch) {
      setResults([]);

      setPage(0);

      setTotalPages(0);

      setError("");

      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);

        setError("");

        const data = await searchUsers(trimmedSearch, 0, 10);

        const users = data?.content || [];

        /*
         * Don't show the currently logged-in
         * user in user search.
         */

        const filteredUsers = users.filter(
          (searchedUser) => searchedUser.id !== currentUser?.id,
        );

        setResults(filteredUsers);

        setPage(data?.number ?? 0);

        setTotalPages(data?.totalPages ?? 0);
      } catch (error) {
        console.error("User search failed:", error);

        setError(error.response?.data?.message || "Unable to search users");

        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm, currentUser?.id]);

  // ==================================================
  // LOAD PAGE
  // ==================================================

  const loadPage = async (nextPage) => {
    if (!searchTerm.trim()) {
      return;
    }

    try {
      setLoading(true);

      setError("");

      const data = await searchUsers(searchTerm.trim(), nextPage, 10);

      const users = data?.content || [];

      const filteredUsers = users.filter(
        (searchedUser) => searchedUser.id !== currentUser?.id,
      );

      setResults(filteredUsers);

      setPage(data?.number ?? nextPage);

      setTotalPages(data?.totalPages ?? 0);
    } catch (error) {
      console.error("Failed to load search page:", error);

      setError(error.response?.data?.message || "Unable to load results");
    } finally {
      setLoading(false);
    }
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
    try {
      await clearRecentSearches();

      setRecentSearches([]);
    } catch (error) {
      console.error("Failed to clear recent searches:", error);
    }
  };

  return (
    <section className="user-search">
      <div className="section-header">
        <h2>Find People</h2>
      </div>

      <input
        type="text"
        className="search-input"
        placeholder="Search users by name..."
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />

      {error && <p className="error">{error}</p>}

      {loading && <p className="search-status">Searching...</p>}

      {!loading && searchTerm.trim() && results.length === 0 && !error && (
        <p className="search-status">No users found.</p>
      )}

      <div className="user-results">
        {results.map((searchedUser) => (
          <UserCard
            key={searchedUser.id}
            user={searchedUser}
            onClick={handleUserClick}
          />
        ))}
      </div>

      {totalPages > 1 && searchTerm.trim() && (
        <div className="pagination">
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
        <section className="recent-searches">
          <div className="section-header">
            <h3>Recent Searches</h3>

            {recentSearches.length > 0 && (
              <button
                className="text-button"
                onClick={handleClearRecentSearches}
              >
                Clear
              </button>
            )}
          </div>

          {recentLoading && (
            <p className="search-status">Loading recent searches...</p>
          )}

          {!recentLoading && recentSearches.length === 0 && (
            <p className="search-status">No recent searches.</p>
          )}

          <div className="user-results">
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
