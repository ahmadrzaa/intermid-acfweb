// very small session helper (localStorage)
const KEY_TOKEN = "sessionToken";
const KEY_USER  = "sessionUser";

function notifySessionChange() {
  // lets the header (and others) know to refresh the user
  window.dispatchEvent(new Event("session-changed"));
}

export function setSession({ token, user }) {
  localStorage.setItem(KEY_TOKEN, token);
  localStorage.setItem(KEY_USER, JSON.stringify(user || null));
  notifySessionChange();
}

export function getToken() {
  return localStorage.getItem(KEY_TOKEN) || "";
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem(KEY_USER) || "null"); }
  catch { return null; }
}

export function clearSession() {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_USER);
  notifySessionChange();
}

// API calls for auth
export async function login(username, password) {
  const r = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) throw new Error((await r.json()).error || "login failed");
  return r.json(); // {token, user}
}

export async function whoami() {
  const token = getToken();
  if (!token) return null;
  const r = await fetch("/api/auth/me", { headers: { "x-session-token": token } });
  if (!r.ok) return null;
  return r.json(); // { user }
}

// logout & clear local session
export async function logout() {
  const token = getToken();
  try {
    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "x-session-token": token }
      });
    }
  } catch (_) {
    // ignore network error on logout
  } finally {
    clearSession();
  }
}
