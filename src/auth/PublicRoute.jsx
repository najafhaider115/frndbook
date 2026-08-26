import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthContext";

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
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
