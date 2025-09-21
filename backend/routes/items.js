const express = require("express");
const router = express.Router();
const { db } = require("../db");
const { requireAuth, requireRole } = require("./auth"); // <-- correct relative path

// GET /api/items  (?step=0..4)  — any authenticated user
router.get("/", requireAuth, (req, res) => {
  const { step } = req.query;
  const sql =
    step !== undefined
      ? "SELECT * FROM items WHERE current_step = ? ORDER BY id DESC"
      : "SELECT * FROM items ORDER BY id DESC";
  const params = step !== undefined ? [Number(step)] : [];
  db.all(sql, params, (err, rows) =>
    err ? res.status(500).json({ error: err.message }) : res.json(rows)
  );
});

// POST /api/items  — admin/manager
router.post(
  "/",
  requireAuth,
  requireRole(["admin", "manager"]),
  (req, res) => {
    const { title } = req.body || {};
    if (!title) return res.status(400).json({ error: "title required" });
    const now = new Date().toISOString();
    const number = `AC-${String(Math.floor(Math.random() * 900) + 100)}`;
    const sql = `INSERT INTO items (number,title,current_step,created_at,updated_at)
                 VALUES (?,?,?,?,?)`;
    db.run(sql, [number, title, 0, now, now], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM items WHERE id = ?", [this.lastID], (e, row) =>
        e ? res.status(500).json({ error: e.message }) : res.status(201).json(row)
      );
    });
  }
);

// PATCH /api/items/:id/step  — admin/manager
router.patch(
  "/:id/step",
  requireAuth,
  requireRole(["admin", "manager"]),
  (req, res) => {
    const id = Number(req.params.id);
    const { step } = req.body || {};
    if (![0, 1, 2, 3, 4].includes(step))
      return res.status(400).json({ error: "invalid step" });
    const now = new Date().toISOString();
    db.run(
      "UPDATE items SET current_step = ?, updated_at = ? WHERE id = ?",
      [step, now, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT * FROM items WHERE id = ?", [id], (e, row) =>
          e ? res.status(500).json({ error: e.message }) : res.json(row)
        );
      }
    );
  }
);

// PATCH /api/items/:id  — field updates
// admin/manager: can edit all fields
// team: can ONLY edit exec_status and notes
router.patch("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const role = req.user.role;

  const allowedForAll = ["exec_status", "notes"];
  const allowedAdminMgr = [
    "title",
    "factor",
    "action",
    "scope",
    "time",
    "resources",
    "current_step",
    ...allowedForAll,
  ];
  const allowed = role === "team" ? allowedForAll : allowedAdminMgr;

  const fields = Object.keys(req.body || {}).filter((k) => allowed.includes(k));
  if (fields.length === 0)
    return res.status(400).json({ error: "no valid fields" });

  const now = new Date().toISOString();
  const sets = fields.map((k) => `${k} = ?`).join(", ");
  const values = fields.map((k) => req.body[k]);
  values.push(now, id);

  const sql = `UPDATE items SET ${sets}, updated_at = ? WHERE id = ?`;
  db.run(sql, values, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get("SELECT * FROM items WHERE id = ?", [id], (e, row) =>
      e ? res.status(500).json({ error: e.message }) : res.json(row)
    );
  });
});

// DELETE /api/items/:id — admin/manager
router.delete(
  "/:id",
  requireAuth,
  requireRole(["admin", "manager"]),
  (req, res) => {
    const id = Number(req.params.id);
    db.run("DELETE FROM items WHERE id = ?", [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, deleted: this.changes });
    });
  }
);

module.exports = router;
