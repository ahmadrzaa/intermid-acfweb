// frontend/src/services/api.js
import { getToken, clearSession } from "./auth";

const base = ""; // Vite proxy: /api -> http://localhost:3001

function authHeaders() {
  const t = getToken();
  return t ? { "x-session-token": t } : {};
}

// ---- helpers -------------------------------------------------
async function jsonOrThrow(r) {
  // normalize JSON or error message
  let data = null;
  try { data = await r.clone().json(); } catch {}
  if (r.status === 401) {
    // session expired / not logged in
    clearSession();
    throw new Error(data?.error || "unauthorized");
  }
  if (!r.ok) {
    throw new Error(data?.error || `request failed (${r.status})`);
  }
  // if server returns non-array / non-object safely return data as-is
  return data;
}

async function safeListFetch(url) {
  // never crash UI: return [] on failure
  try {
    const r = await fetch(url, { headers: authHeaders() });
    const data = await jsonOrThrow(r);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

// ---- core data APIs (reads are safe, writes throw) -----------
export async function getStages() {
  return safeListFetch(`${base}/api/stages`);
}

export async function getItems(step) {
  const url =
    step === undefined ? `${base}/api/items` : `${base}/api/items?step=${step}`;
  return safeListFetch(url);
}

export async function createItem(title) {
  const r = await fetch(`${base}/api/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ title }),
  });
  return jsonOrThrow(r);
}

export async function updateItemStep(id, step) {
  const r = await fetch(`${base}/api/items/${id}/step`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ step }),
  });
  return jsonOrThrow(r);
}

export async function updateItem(id, patch) {
  const r = await fetch(`${base}/api/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(patch),
  });
  return jsonOrThrow(r);
}

export async function deleteItem(id) {
  const r = await fetch(`${base}/api/items/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return jsonOrThrow(r);
}

// ---- exports (CSV / PDF) ------------------------------------
async function downloadBlob(url, filename) {
  const r = await fetch(url, { headers: authHeaders() });
  if (r.status === 401) {
    clearSession();
    throw new Error("unauthorized");
  }
  if (!r.ok) {
    let msg = "download failed";
    try { msg = (await r.clone().json()).error || msg; } catch {}
    throw new Error(msg);
  }
  const blob = await r.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

export async function exportCsv(step) {
  const q = step === undefined ? "" : `?step=${step}`;
  return downloadBlob(`/api/export/csv${q}`, "intermid-items.csv");
}

export async function exportPdf(step) {
  const q = step === undefined ? "" : `?step=${step}`;
  return downloadBlob(`/api/export/pdf${q}`, "intermid-items.pdf");
}
