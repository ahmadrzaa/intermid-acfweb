const express = require("express");
const crypto = require("crypto");
const router = express.Router();

// --- super simple in-memory sessions (OK for local dev) ---
const sessions = new Map(); // token -> { id, username, role }

const USERS = {
  admin:   { password: "admin123",   role: "admin"   },
  manager: { password: "manager123", role: "manager" },
  team:    { password: "team123",    role: "team"    },
};

// middleware: attach req.user if token ok
function requireAuth(req, res, next) {
  const token = req.get("x-session-token");
  if (!token) return res.status(401).json({ error: "not authenticated" });
  const u = sessions.get(token);
  if (!u) return res.status(401).json({ error: "invalid session" });
  req.user = u; // {id, username, role}
  next();
}

// middleware factory: require role among list
function requireRole(allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "not authenticated" });
    if (!allowed.includes(req.user.role))
      return res.status(403).json({ error: "forbidden" });
    next();
  };
}

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  const record = USERS[username];
  if (!record || record.password !== password) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  const token = crypto.randomBytes(24).toString("hex");
  const user = { id: username, username, role: record.role };
  sessions.set(token, user);
  res.json({ token, user });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post("/logout", requireAuth, (req, res) => {
  const token = req.get("x-session-token");
  sessions.delete(token);
  res.json({ ok: true });
});

module.exports = { router, requireAuth, requireRole };
