import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthContext";

const PublicRoute = ({ children }) => {
  const { user, loading, authError, retryAuth } = useAuth();

  if (loading) {
    return <div role="status" className="loading-screen">Loading...</div>;
  }

  if (authError) {
    return <main className="loading-screen"><p role="alert">{authError}</p>
      <button type="button" onClick={retryAuth}>Retry session check</button></main>;
  }

  /*
   * User is already authenticated.
   *
   * Therefore:
   *
   * /login  → /
   * /signup → /
   */

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PublicRoute;
