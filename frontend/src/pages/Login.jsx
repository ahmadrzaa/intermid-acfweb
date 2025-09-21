import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, setSession, whoami, getUser } from "../services/auth";
import { FiEye, FiEyeOff, FiUser, FiLock } from "react-icons/fi";
import "./Login.css";

export default function Login() {
  const nav = useNavigate();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const me = await whoami();
        if (me?.user || getUser()) nav("/", { replace: true });
      } catch {}
    })();
  }, [nav]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setErr("");
    setLoading(true);
    try {
      const data = await login(username.trim(), password);
      setSession(data);
      nav("/", { replace: true });
    } catch (e) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function quickFill(u, p) { setU(u); setP(p); }

  const cardClass = useMemo(() => `login-card ${err ? "shake" : ""}`, [err]);

  return (
    <div className="login-page">
      {/* soft aurora background */}
      <div className="bg-aurora" aria-hidden="true" />

      <div className={cardClass}>
        {/* VISUAL SIDE */}
        <aside className="login-visual">
          <div className="visual-inner">
            <img className="brand" src="/image/intermid-logo.png" alt="INTERMID" />
            <h3>Action Cycle Framework</h3>
            <p className="lp-tagline">
              Plan → Decide → Execute. Keep momentum with a clear cycle and a focused workspace.
            </p>
            <ul className="bullets">
              <li>Fast, distraction-free workflow</li>
              <li>Real-time status & reporting</li>
              <li>Export to CSV/PDF in one click</li>
            </ul>
          </div>
        </aside>

        {/* FORM SIDE */}
        <section className="login-pane">
          <header className="login-head">
            <h2>Welcome back</h2>
            <p className="sub">Sign in to your workspace</p>
          </header>

          {err ? <div className="alert error" role="alert">{err}</div> : null}

          <form onSubmit={onSubmit} className="login-form" autoComplete="on">
            {/* Username */}
            <label className="field-label">Username</label>
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true"><FiUser size={18} /></span>
              <input
                className="field-input with-icon"
                placeholder="admin / manager / team"
                value={username}
                onChange={(e) => setU(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                autoFocus
              />
            </div>

            {/* Password */}
            <label className="field-label">Password</label>
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true"><FiLock size={18} /></span>
              <input
                className="field-input with-icon"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setP(e.target.value)}
              />
              <button
                type="button"
                className="pw-toggle icon-btn"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                title={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="demo-cta">
            <span>Quick demo:</span>
            <div className="demo-buttons">
              <button onClick={() => quickFill("admin", "admin123")}>Admin</button>
              <button onClick={() => quickFill("manager", "manager123")}>Manager</button>
              <button onClick={() => quickFill("team", "team123")}>Team</button>
            </div>
          </div>

          <div className="foot-note">By continuing you agree to the internal usage guidelines.</div>
        </section>
      </div>
    </div>
  );
}
