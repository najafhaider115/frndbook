import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import styles from "../../styles/navbar.module.css";
import { bindStyles } from "../../utils/bindStyles";

const css = bindStyles(styles);
const links = [
  ["/", "Home"], ["/friends", "Friends"], ["/messages", "Messages"],
  ["/friend-requests", "Requests"], ["/notifications", "Notifications"],
  ["/profile", "Profile"],
];

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const navRef = useRef(null);
  const toggleRef = useRef(null);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointerDown = (event) => {
      if (!navRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 901px)");
    const onResize = (event) => { if (event.matches) setMenuOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    desktop.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      desktop.removeEventListener("change", onResize);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    closeMenu();
    await logout();
    navigate("/login", { replace: true });
  };
  const renderLinks = (mobile = false) => links.map(([to, label]) => (
    <NavLink
      key={to} to={to} end={to === "/"} onClick={closeMenu}
      className={({ isActive }) => css(
        `${mobile ? "navbar-mobile-link" : "navbar-link"} ${isActive ? "active" : ""}`,
      )}
      aria-label={to === "/notifications" && unreadCount > 0
        ? `Notifications, ${unreadCount} unread` : undefined}
    >
      <span>{label}</span>
      {to === "/notifications" && unreadCount > 0 && (
        <span className={css("notification-badge")} aria-hidden="true">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </NavLink>
  ));

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <nav
        ref={navRef} className={css("navbar")} aria-label="Main navigation"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) closeMenu();
        }}
      >
        <div className={css("navbar-left")}>
          <Link to="/" className={css("navbar-brand")} onClick={closeMenu}>FrndBook</Link>
        </div>
        <div className={css("navbar-right")}>
          {renderLinks()}
          <span className={css("navbar-user")}>{user?.name}</span>
          <button type="button" className={css("navbar-logout")} onClick={handleLogout}>Logout</button>
        </div>
        <button
          ref={toggleRef} type="button" className={css("navbar-menu-toggle")}
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen} aria-controls={menuId}
        >
          <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
        </button>
        <div id={menuId} className={css(`navbar-mobile-menu ${menuOpen ? "open" : ""}`)}>
          <div className={css("navbar-mobile-user")}>
            <span className={css("navbar-mobile-user-name")}>{user?.name || "Account"}</span>
            {user?.email && <span className={css("navbar-mobile-user-email")}>{user.email}</span>}
          </div>
          {renderLinks(true)}
          <button type="button" className={css("navbar-mobile-logout")} onClick={handleLogout}>Logout</button>
        </div>
      </nav>
    </>
  );
}
