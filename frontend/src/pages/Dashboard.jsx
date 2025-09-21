import { useEffect, useMemo, useState } from "react";
import { getItems } from "../services/api";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import "./Dashboard.css";

/* ---------- CONFIG (flip these as you like) ---------- */
const BLANK_STATUS_IS_NOT_STARTED = true;   // blank status -> Not Started
const UNKNOWN_POLICY = "map";               // "map" -> map unknown to Not Started, "keep" -> keep Unknown
const SHOW_UNKNOWN_BAR = false;             // hide the Unknown bar entirely
const REMOVE_ZERO_BARS = true;              // drop bars whose value is 0
const SHOW_UNASSIGNED_PIE = true;           // include "Unassigned" slice in the pie

// When scope/resources are "Medium", how to split them for the 2×2:
const MAP_MEDIUM_SCOPE_TO = "narrow";      // "narrow" or "wide"
const MAP_MEDIUM_RES_TO   = "low";         // "low" or "high"

/* ---------- palette ---------- */
const C = {
  teal: "#06b6d4",
  blue: "#0ea5e9",
  indigo: "#6366f1",
  rose: "#f43f5e",
  green: "#10b981",
  amber: "#f59e0b",
  gray: "#94a3b8",
  ink: "#0b1220",
  mute: "#64748b",
  grid: "#e5e7eb",
  card: "#ffffff",
};

/* ---------- data helpers ---------- */
const STATUS_KEYS = ["not_started", "in_progress", "completed", "delayed"];
const STATUS_LABEL = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  delayed: "Delayed",
  unknown: "Unknown",
};
const STATUS_COLOR = {
  "Not Started": C.amber,
  "In Progress": C.blue,
  "Completed": C.green,
  "Delayed": C.rose,
  "Unknown": C.gray,
};

function norm(v) {
  return (v ?? "").toString().trim().toLowerCase().replace(/\s+/g, "_");
}

function mapTriToBinaryScope(v) {
  const s = norm(v);
  if (s === "narrow") return "narrow";
  if (s === "wide") return "wide";
  if (s === "medium") return MAP_MEDIUM_SCOPE_TO;
  return null;
}

function mapTriToBinaryRes(v) {
  const r = norm(v);
  if (r === "low") return "low";
  if (r === "high") return "high";
  if (r === "medium") return MAP_MEDIUM_RES_TO;
  return null;
}

function summarize(items) {
  const byStatus = {
    "Not Started": 0,
    "In Progress": 0,
    "Completed": 0,
    "Delayed": 0,
    "Unknown": 0,
  };

  const byQuad = {
    "Quick Wins": 0,
    "Strategic Projects": 0,
    "Minimal Effort": 0,
    "Risk Zone": 0,
    "Unassigned": 0,
  };

  for (const it of items || []) {
    // --- status
    const sRaw = norm(it.exec_status);
    let sKey;
    if (STATUS_KEYS.includes(sRaw)) {
      sKey = STATUS_LABEL[sRaw];
    } else if (!sRaw && BLANK_STATUS_IS_NOT_STARTED) {
      sKey = STATUS_LABEL.not_started;
    } else {
      // map or keep Unknown
      sKey = UNKNOWN_POLICY === "map" ? STATUS_LABEL.not_started : STATUS_LABEL.unknown;
    }
    byStatus[sKey]++;

    // --- quadrant
    const s = mapTriToBinaryScope(it.scope);
    const r = mapTriToBinaryRes(it.resources);
    if (s && r) {
      if (s === "narrow" && r === "high") byQuad["Quick Wins"]++;
      else if (s === "wide" && r === "high") byQuad["Strategic Projects"]++;
      else if (s === "narrow" && r === "low") byQuad["Minimal Effort"]++;
      else if (s === "wide" && r === "low") byQuad["Risk Zone"]++;
    } else {
      byQuad["Unassigned"]++;
    }
  }

  return { byStatus, byQuad, total: (items || []).length };
}

/* ---------- 3D column (custom polygons) ---------- */
function Bar3D({ data }) {
  const cats = data.map(d => d.label);
  const values = data.map(d => d.value);
  const colors = data.map(d => d.color);
  const total = values.reduce((a, b) => a + b, 0) || 1;

  const depth = { dx: 12, dy: -12 };
  function renderItem(params, api) {
    const i = params.dataIndex;
    const val = api.value(1);
    const x = api.value(0);
    const half = 0.36;

    const p0 = api.coord([x - half, 0]);
    const p1 = api.coord([x + half, 0]);
    const p2 = api.coord([x + half, val]);
    const p3 = api.coord([x - half, val]);

    const base = colors[i];
    const left = echarts.color.lift(base, -0.25);
    const right = echarts.color.lift(base, -0.12);
    const top = echarts.color.lift(base, 0.22);

    return {
      type: "group",
      children: [
        { type: "polygon", silent: true, shape: { points: [[p3[0], p3[1]], [p0[0], p0[1]], [p0[0] + depth.dx, p0[1] + depth.dy], [p3[0] + depth.dx, p3[1] + depth.dy]] }, style: { fill: left } },
        { type: "polygon", silent: true, shape: { points: [[p2[0], p2[1]], [p1[0], p1[1]], [p1[0] + depth.dx, p1[1] + depth.dy], [p2[0] + depth.dx, p2[1] + depth.dy]] }, style: { fill: right } },
        { type: "polygon", silent: true, shape: { points: [[p3[0], p3[1]], [p2[0], p2[1]], [p2[0] + depth.dx, p2[1] + depth.dy], [p3[0] + depth.dx, p3[1] + depth.dy]] }, style: { fill: top, shadowBlur: 6, shadowColor: "rgba(0,0,0,.18)" } },
      ]
    };
  }

  const option = {
    backgroundColor: C.card,
    grid: { left: 56, right: 18, top: 26, bottom: 48 },
    xAxis: {
      type: "category",
      data: cats,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#cbd5e1" } },
      axisLabel: { color: C.ink }
    },
    yAxis: {
      type: "value",
      name: "frequency",
      nameLocation: "middle",
      nameGap: 42,
      nameTextStyle: { color: C.mute, fontSize: 12 },
      splitLine: { lineStyle: { color: C.grid } },
      axisLabel: { color: C.mute, formatter: (v) => Math.floor(v) }
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (ps) => {
        const p = ps[0];
        const v = p.value[1];
        const pct = Math.round((v / total) * 100);
        return `${p.axisValue}<br/><b>${v}</b> (${pct}%)`;
      }
    },
    series: [
      { type: "custom", renderItem, encode: { x: 0, y: 1 }, data: cats.map((c, i) => [c, values[i]]), z: 10 },
      { type: "bar", data: values, itemStyle: { color: "rgba(0,0,0,0)" }, barWidth: "50%", label: { show: true, position: "top", color: C.ink, fontWeight: 700 }, z: 20 }
    ]
  };

  return <ReactECharts option={option} style={{ height: 360 }} notMerge />;
}

/* ---------- pie ---------- */
function Pie({ data }) {
  const seriesData = data
    .filter(d => d.value > 0)
    .map(d => ({ name: d.label, value: d.value, itemStyle: { color: d.color } }));

  const option = {
    backgroundColor: C.card,
    legend: { orient: "vertical", right: 10, top: "middle", textStyle: { color: C.ink } },
    tooltip: { trigger: "item", formatter: (p) => `${p.name}<br/><b>${p.value}</b> (${p.percent}%)` },
    series: [{
      type: "pie",
      radius: ["42%", "72%"],
      center: ["38%", "58%"],
      label: { show: true, formatter: "{b}\n{d}%", fontSize: 12, color: C.ink },
      itemStyle: { borderColor: "#fff", borderWidth: 2 },
      data: seriesData
    }]
  };
  return <ReactECharts option={option} style={{ height: 360 }} notMerge />;
}

/* ---------- page ---------- */
export default function Dashboard() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    getItems()
      .then(rows => setItems(Array.isArray(rows) ? rows : []))
      .catch(() => setItems([]));
  }, []);

  const { byStatus, byQuad, total } = useMemo(() => summarize(items), [items]);

  // Build bar data, then apply visibility rules
  const barDataRaw = [
    { label: "Not Started", value: byStatus["Not Started"], color: STATUS_COLOR["Not Started"] },
    { label: "In Progress", value: byStatus["In Progress"], color: STATUS_COLOR["In Progress"] },
    { label: "Completed",   value: byStatus["Completed"],   color: STATUS_COLOR["Completed"]   },
    { label: "Delayed",     value: byStatus["Delayed"],     color: STATUS_COLOR["Delayed"]     },
    { label: "Unknown",     value: byStatus["Unknown"],     color: STATUS_COLOR["Unknown"]     },
  ];
  let barData = barDataRaw;
  if (!SHOW_UNKNOWN_BAR) barData = barData.filter(d => d.label !== "Unknown");
  if (REMOVE_ZERO_BARS) barData = barData.filter(d => d.value > 0);

  // Pie data with optional Unassigned visibility
  const pieRaw = [
    { label: "Quick Wins",         value: byQuad["Quick Wins"],         color: C.teal   },
    { label: "Strategic Projects", value: byQuad["Strategic Projects"], color: C.indigo },
    { label: "Minimal Effort",     value: byQuad["Minimal Effort"],     color: C.green  },
    { label: "Risk Zone",          value: byQuad["Risk Zone"],          color: C.rose   },
    { label: "Unassigned",         value: byQuad["Unassigned"],         color: C.gray   },
  ];
  let pieData = pieRaw.filter(d => d.value > 0);
  if (!SHOW_UNASSIGNED_PIE) pieData = pieData.filter(d => d.label !== "Unassigned");

  return (
    <div className="dash">
      <h1>Dashboard</h1>
      <p className="muted">Live snapshot of your item activity.</p>

      <div className="grid-2">
        <div className="card chart">
          <div className="card-head">
            <h3>Status (3D Columns)</h3>
            <span className="muted">hover for %</span>
          </div>
          <Bar3D data={barData} />
          <div className="footnote">Total items: <b>{total}</b></div>
        </div>

        <div className="card chart">
          <div className="card-head">
            <h3>Scope × Resources (Pie)</h3>
            <span className="muted">{SHOW_UNASSIGNED_PIE ? "includes Unassigned" : "assigned only"}</span>
          </div>
          <Pie data={pieData} />
        </div>
      </div>
    </div>
  );
}
