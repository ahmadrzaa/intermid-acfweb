// C:\Users\Ahmad\Downloads\intermid-acfweb\frontend\src\pages\Workspace.jsx
import "./Workspace.css";
import { useEffect, useMemo, useState } from "react";
import {
  getStages,
  getItems,
  createItem,
  updateItemStep,
  updateItem,
  deleteItem,
  exportCsv,
  exportPdf,
} from "../services/api";
import { getUser } from "../services/auth";

// ---------- helpers for Matrix ----------
const quadrantToAttrs = {
  QW:   { scope: "narrow", resources: "high"  }, // Quick Wins
  SP:   { scope: "wide",   resources: "high"  }, // Strategic Projects
  ME:   { scope: "narrow", resources: "low"   }, // Minimal Effort
  RISK: { scope: "wide",   resources: "low"   }, // Risk Zone
};

function getQuadrant(item) {
  const s = item.scope, r = item.resources;
  if (r === "high" && s === "narrow") return "QW";
  if (r === "high" && s === "wide")   return "SP";
  if (r === "low"  && s === "narrow") return "ME";
  if (r === "low"  && s === "wide")   return "RISK";
  return null;
}

// ---------- simple table/controls styles ----------
const th = { textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #e5e7eb", fontWeight: 600 };
const td = { padding: "8px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" };
const input = { width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8 };
const select = { width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" };

// ---------- matrix styles ----------
const quad = {
  border: "1px dashed #cbd5e1",
  borderRadius: 12,
  padding: 10,
  background: "#fff",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
};
const quadTitle = { fontWeight: 700, marginBottom: 8, color: "#0b1220" };
const quadList = { display: "grid", gap: 8, overflow: "auto" };
const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 10,
  background: "#ffffff",
  cursor: "grab",
};

// small badge style
const chip = {
  fontSize: 12,
  color: "#6b7280",
  background: "#f1f5f9",
  borderRadius: 999,
  padding: "2px 8px",
};

// render a draggable matrix card
const card = (it) => (
  <div
    key={it.id}
    draggable
    onDragStart={(e) => e.dataTransfer.setData("text/plain", String(it.id))}
    style={cardStyle}
    title={`${it.number} — drag to another quadrant`}
  >
    <div style={{ fontWeight: 600 }}>{it.number || "—"} — {it.title || "Untitled"}</div>
    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
      {it.scope && <span style={chip}>Scope: {it.scope}</span>}
      {it.resources && <span style={chip}>Res: {it.resources}</span>}
      {it.exec_status && <span style={chip}>Status: {it.exec_status}</span>}
    </div>
  </div>
);

export default function Workspace() {
  // who am I / role
  const me = useMemo(() => getUser(), []);
  const role = me?.role || "team";
  const isAdminOrManager = role === "admin" || role === "manager";

  // LEFT + TABLE state
  const [stages, setStages] = useState([]);
  const [selectedStep, setSelectedStep] = useState(0);
  const [counts, setCounts] = useState({});
  const [items, setItems] = useState([]);       // rows for selected step (table + left preview)

  // MATRIX state needs ALL items
  const [allItems, setAllItems] = useState([]);

  const [newTitle, setNewTitle] = useState("");

  // load stages once
  useEffect(() => { getStages().then(setStages); }, []);

  // refresh items + counts (+ allItems for matrix)
  async function refresh(step = selectedStep) {
    const rows = await getItems(step);   // selected step
    setItems(rows);

    const all = await getItems();        // all items
    setAllItems(all);

    const map = {};
    for (const s of stages) map[s.id] = 0;
    for (const it of all) map[it.current_step] = (map[it.current_step] || 0) + 1;
    setCounts(map);
  }

  useEffect(() => {
    if (stages.length) refresh(selectedStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages, selectedStep]);

  // actions
  async function onCreate(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await createItem(newTitle.trim());
      setNewTitle("");
      setSelectedStep(0);
      refresh(0);
    } catch (e) {
      alert(String(e.message || "Create failed (role?)"));
    }
  }

  async function move(id, dir) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const next = Math.min(4, Math.max(0, item.current_step + dir));
    if (next === item.current_step) return;
    try {
      await updateItemStep(id, next);
      refresh(selectedStep);
    } catch (e) {
      alert(String(e.message || "Move failed (role?)"));
    }
  }

  async function onDelete(id) {
    if (!isAdminOrManager) return;
    if (!confirm("Delete this item?")) return;
    try {
      await deleteItem(id);
      refresh(selectedStep);
    } catch (e) {
      alert(String(e.message || "Delete failed (role?)"));
    }
  }

  // matrix drop handlers
  function allowDrop(e) { e.preventDefault(); }
  async function onDropTo(quadrant, e) {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData("text/plain"));
    const attrs = quadrantToAttrs[quadrant];
    if (!id || !attrs) return;
    try {
      await updateItem(id, attrs);  // PATCH scope/resources
      await refresh(selectedStep);
    } catch (e) {
      alert(String(e.message || "Update failed (role?)"));
    }
  }

  // export handlers (these already trigger download)
  async function onExportCsv() { await exportCsv(selectedStep); }
  async function onExportPdf() { await exportPdf(selectedStep); }

  return (
    <div className="main-content">
      <div className="grid-3">

        {/* LEFT: Process Flow (REAL) */}
        <section className="panel">
          <h2>Process Flow</h2>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
            Role: <strong>{role}</strong>
          </div>

          {/* stages with counts */}
          <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
            {stages.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStep(s.id)}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: selectedStep === s.id ? "#f3f4f6" : "#fff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <span>{s.label}</span>
                <span style={chip}>{counts[s.id] ?? 0}</span>
              </button>
            ))}
          </div>

          {/* quick add */}
          <form onSubmit={onCreate} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New item title…"
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb" }}
              disabled={!isAdminOrManager}
            />
            <button
              type="submit"
              disabled={!isAdminOrManager}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: !isAdminOrManager ? "#f3f4f6" : "#fff",
                cursor: !isAdminOrManager ? "not-allowed" : "pointer",
              }}
            >
              Add
            </button>
          </form>

          {/* items in selected step (draggable) */}
          <div style={{ display: "grid", gap: 8 }}>
            {items.map((it) => (
              <div
                key={it.id}
                draggable={true}
                onDragStart={(e) => e.dataTransfer.setData("text/plain", String(it.id))}
                style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, background: "#fff" }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  {it.number} — {it.title}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => move(it.id, -1)}
                    title="Move back"
                    disabled={!isAdminOrManager}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      cursor: !isAdminOrManager ? "not-allowed" : "pointer",
                    }}
                  >
                    ←
                  </button>
                  <button
                    onClick={() => move(it.id, +1)}
                    title="Move forward"
                    disabled={!isAdminOrManager}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      cursor: !isAdminOrManager ? "not-allowed" : "pointer",
                    }}
                  >
                    →
                  </button>

                  {isAdminOrManager && (
                    <button
                      onClick={() => onDelete(it.id)}
                      title="Delete"
                      style={{
                        marginLeft: "auto",
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #ef4444",
                        background: "#fff",
                        color: "#ef4444",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
            {items.length === 0 && <div style={{ color: "#6b7280" }}>No items in this stage yet.</div>}
          </div>

          <p style={{ marginTop: 12, color: "#6b7280" }}>
            Item → Factor → Action → Scope/Time/Resources → Status
          </p>
        </section>

        {/* MIDDLE: Action Cycle Table (REAL) */}
        <section className="panel">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ marginRight: "auto" }}>Action Cycle Table</h2>
            {/* exports for the current selected stage */}
            <button onClick={onExportCsv} style={btnSmall}>Export CSV</button>
            <button onClick={onExportPdf} style={btnSmall}>Export PDF</button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={th}>No.</th>
                  <th style={th}>Item</th>
                  <th style={th}>Factor</th>
                  <th style={th}>Action</th>
                  <th style={th}>Scope</th>
                  <th style={th}>Time</th>
                  <th style={th}>Resources</th>
                  <th style={th}>Status</th>
                  <th style={th}>Notes / Next Step</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td style={td}>{row.number || "-"}</td>

                    {/* Item */}
                    <td style={td}>
                      <input
                        defaultValue={row.title || ""}
                        onBlur={async (e) => {
                          const v = e.target.value.trim();
                          if (v !== row.title) {
                            try { await updateItem(row.id, { title: v }); refresh(selectedStep); }
                            catch (e) { alert(String(e.message || "Update failed (role?)")); }
                          }
                        }}
                        style={input}
                        disabled={!isAdminOrManager}
                      />
                    </td>

                    {/* Factor */}
                    <td style={td}>
                      <select
                        value={row.factor || ""}
                        onChange={async (e) => {
                          try { await updateItem(row.id, { factor: e.target.value || null }); refresh(selectedStep); }
                          catch (e) { alert(String(e.message || "Update failed (role?)")); }
                        }}
                        style={select}
                        disabled={!isAdminOrManager}
                      >
                        <option value="">—</option>
                        <option value="internal">Internal</option>
                        <option value="external">External</option>
                      </select>
                    </td>

                    {/* Action */}
                    <td style={td}>
                      <select
                        value={row.action || ""}
                        onChange={async (e) => {
                          try { await updateItem(row.id, { action: e.target.value || null }); refresh(selectedStep); }
                          catch (e) { alert(String(e.message || "Update failed (role?)")); }
                        }}
                        style={select}
                        disabled={!isAdminOrManager}
                      >
                        <option value="">—</option>
                        <option value="explore">Explore</option>
                        <option value="decide">Decide</option>
                        <option value="execute">Execute</option>
                      </select>
                    </td>

                    {/* Scope */}
                    <td style={td}>
                      <select
                        value={row.scope || ""}
                        onChange={async (e) => {
                          try { await updateItem(row.id, { scope: e.target.value || null }); refresh(selectedStep); }
                          catch (e) { alert(String(e.message || "Update failed (role?)")); }
                        }}
                        style={select}
                        disabled={!isAdminOrManager}
                      >
                        <option value="">—</option>
                        <option value="narrow">Narrow</option>
                        <option value="medium">Medium</option>
                        <option value="wide">Wide</option>
                      </select>
                    </td>

                    {/* Time */}
                    <td style={td}>
                      <select
                        value={row.time || ""}
                        onChange={async (e) => {
                          try { await updateItem(row.id, { time: e.target.value || null }); refresh(selectedStep); }
                          catch (e) { alert(String(e.message || "Update failed (role?)")); }
                        }}
                        style={select}
                        disabled={!isAdminOrManager}
                      >
                        <option value="">—</option>
                        <option value="short">Short</option>
                        <option value="medium">Medium</option>
                        <option value="long">Long</option>
                      </select>
                    </td>

                    {/* Resources */}
                    <td style={td}>
                      <select
                        value={row.resources || ""}
                        onChange={async (e) => {
                          try { await updateItem(row.id, { resources: e.target.value || null }); refresh(selectedStep); }
                          catch (e) { alert(String(e.message || "Update failed (role?)")); }
                        }}
                        style={select}
                        disabled={!isAdminOrManager}
                      >
                        <option value="">—</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </td>

                    {/* Execution Status (team CAN edit) */}
                    <td style={td}>
                      <select
                        value={row.exec_status || ""}
                        onChange={async (e) => {
                          try { await updateItem(row.id, { exec_status: e.target.value || null }); refresh(selectedStep); }
                          catch (e) { alert(String(e.message || "Update failed (role?)")); }
                        }}
                        style={select}
                      >
                        <option value="">—</option>
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="delayed">Delayed</option>
                      </select>
                    </td>

                    {/* Notes (team CAN edit) */}
                    <td style={td}>
                      <input
                        defaultValue={row.notes || ""}
                        onBlur={async (e) => {
                          const v = e.target.value.trim();
                          if (v !== (row.notes || "")) {
                            try { await updateItem(row.id, { notes: v }); refresh(selectedStep); }
                            catch (e) { alert(String(e.message || "Update failed (role?)")); }
                          }
                        }}
                        style={input}
                        placeholder="Next step…"
                      />
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan="9" style={{ padding: 16, color: "#6b7280" }}>No items in this stage.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* RIGHT: 2×2 Matrix (REAL drag & drop) */}
        <section className="panel">
          <h2>2×2 Matrix</h2>
          <p style={{ color: "#6b7280", marginTop: 0 }}>
            Scope (Narrow→Wide) × Resources (Low→High)
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: 12,
            height: "calc(100vh - 240px)"
          }}>
            {/* Quick Wins */}
            <div onDragOver={allowDrop} onDrop={(e) => onDropTo("QW", e)} style={quad}>
              <div style={quadTitle}>Quick Wins</div>
              <div style={quadList}>
                {allItems.filter(i => getQuadrant(i) === "QW").map(card)}
              </div>
            </div>

            {/* Strategic Projects */}
            <div onDragOver={allowDrop} onDrop={(e) => onDropTo("SP", e)} style={quad}>
              <div style={quadTitle}>Strategic Projects</div>
              <div style={quadList}>
                {allItems.filter(i => getQuadrant(i) === "SP").map(card)}
              </div>
            </div>

            {/* Minimal Effort */}
            <div onDragOver={allowDrop} onDrop={(e) => onDropTo("ME", e)} style={quad}>
              <div style={quadTitle}>Minimal Effort</div>
              <div style={quadList}>
                {allItems.filter(i => getQuadrant(i) === "ME").map(card)}
              </div>
            </div>

            {/* Risk Zone */}
            <div onDragOver={allowDrop} onDrop={(e) => onDropTo("RISK", e)} style={quad}>
              <div style={quadTitle}>Risk Zone</div>
              <div style={quadList}>
                {allItems.filter(i => getQuadrant(i) === "RISK").map(card)}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

const btnSmall = {
  padding: "8px 10px",
  border: "1px solid #e5e7eb",
  background: "#fff",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
};
