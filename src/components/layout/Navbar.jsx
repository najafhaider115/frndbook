import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";
import { useNotifications } from "../../context/NotificationContext";

const Navbar = () => {
  const navigate = useNavigate();

  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    closeMenu();

    await logout();

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          FrndBook
        </Link>
      </div>

      {/* Desktop navigation */}
      <div className="navbar-right">
        <Link to="/" className="navbar-link">
          Home
        </Link>

        <Link to="/friends" className="navbar-link">
          Friends
        </Link>

        <Link to="/messages" className="navbar-link">
          Messages
        </Link>

        <Link to="/friend-requests" className="navbar-link">
          Requests
        </Link>

        <Link to="/notifications" className="navbar-link">
          Notifications
          {unreadCount > 0 && (
            <span className="notification-badge">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        <Link to="/profile" className="navbar-link">
          Profile
        </Link>

        <div className="navbar-user">
          <span>{user?.name}</span>
        </div>

        <button type="button" className="navbar-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Mobile menu button */}
      <button
        type="button"
        className="navbar-menu-toggle"
        onClick={() => setMenuOpen((current) => !current)}
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
      >
        <span />
        <span />
        <span />
      </button>

      {/* Mobile navigation */}
      <div className={`navbar-mobile-menu ${menuOpen ? "open" : ""}`}>
        <div className="navbar-mobile-user">
          <span className="navbar-mobile-user-name">
            {user?.name || "Account"}
          </span>

          {user?.email && (
            <span className="navbar-mobile-user-email">{user.email}</span>
          )}
        </div>

        <Link to="/" className="navbar-mobile-link" onClick={closeMenu}>
          Home
        </Link>

        <Link to="/friends" className="navbar-mobile-link" onClick={closeMenu}>
          Friends
        </Link>

        <Link to="/messages" className="navbar-mobile-link" onClick={closeMenu}>
          Messages
        </Link>

        <Link
          to="/friend-requests"
          className="navbar-mobile-link"
          onClick={closeMenu}
        >
          Requests
        </Link>

        <Link
          to="/notifications"
          className="navbar-mobile-link"
          onClick={closeMenu}
        >
          <span>Notifications</span>

          {unreadCount > 0 && (
            <span className="notification-badge">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        <Link to="/profile" className="navbar-mobile-link" onClick={closeMenu}>
          Profile
        </Link>

        <button
          type="button"
          className="navbar-mobile-logout"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
