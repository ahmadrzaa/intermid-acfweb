import React, { useEffect, useRef, useState, useMemo } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { getUser, logout } from "../services/auth";
import "./Header.css";

function RoleAvatar({ user }) {
  const letter =
    user?.role === "admin"   ? "A" :
    user?.role === "manager" ? "M" :
    user?.role === "team"    ? "T" :
    (user?.username?.[0]?.toUpperCase() || "?");
  return <div className="avatar">{letter}</div>;
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(() => getUser());
  useEffect(() => { setUser(getUser()); }, [location.pathname]);
  useEffect(() => {
    const onChange = () => setUser(getUser());
    window.addEventListener("session-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("session-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }
  function onSwitchUser() { navigate("/login"); }

  const activeIndex = useMemo(
    () => (location.pathname === "/dashboard" ? 1 : 0),
    [location.pathname]
  );

  return (
    <header className="site-header" role="banner">
      <div className="hdr-glow" aria-hidden="true" />
      <div className="header-inner">

        {/* LEFT — brand (image only) */}
        <button className="brand" onClick={() => navigate("/")} title="INTERMID">
          <img src="/image/intermid-logo.png" alt="INTERMID" className="brand-logo" />
          {/* no brand text */}
          <span className="brand-acf">ACF</span>
        </button>

        {/* CENTER — segmented nav (desktop) */}
        <nav className="nav-center" aria-label="Primary">
          <span
            className="nav-indicator"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
            aria-hidden="true"
          />
          <NavLink to="/" end className={({isActive}) => "nav-link" + (isActive ? " active" : "")}>
            Workspace
          </NavLink>
          <NavLink to="/dashboard" className={({isActive}) => "nav-link" + (isActive ? " active" : "")}>
            Dashboard
          </NavLink>
        </nav>

        {/* RIGHT — user/menu */}
        <div className="user" ref={menuRef}>
          <button
            className="user-btn"
            onClick={() => setOpen(v => !v)}
            title={user ? `${user.username} (${user.role})` : "Not signed in"}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <RoleAvatar user={user} />
          </button>

          {open && (
            <div className="menu" role="menu">
              <div className="menu-hdr">
                <div className="hdr-row">
                  <RoleAvatar user={user} />
                  <div className="info">
                    <div className="menu-name">{user?.username || "Guest"}</div>
                    <div className="menu-role">{user?.role || "—"}</div>
                  </div>
                </div>
              </div>

              <div className="menu-body">
                <button className="menu-item" onClick={() => { setOpen(false); navigate("/dashboard"); }} role="menuitem">
                  Dashboard
                </button>
                <button className="menu-item" onClick={onSwitchUser} role="menuitem">
                  Switch user
                </button>
              </div>

              <div className="menu-ft">
                <button className="logout-btn" onClick={onLogout}>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
