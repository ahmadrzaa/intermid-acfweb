const express = require("express");
const router = express.Router();
const { db } = require("../db");
const { requireAuth } = require("./auth");

function fetchItems(step) {
  return new Promise((resolve, reject) => {
    const sql =
      step !== undefined
        ? "SELECT * FROM items WHERE current_step = ? ORDER BY id DESC"
        : "SELECT * FROM items ORDER BY id DESC";
    const params = step !== undefined ? [Number(step)] : [];
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

// CSV
router.get("/csv", requireAuth, async (req, res) => {
  try {
    const step = req.query.step !== undefined ? Number(req.query.step) : undefined;
    const items = await fetchItems(step);
    const head = [
      "number",
      "title",
      "factor",
      "action",
      "scope",
      "time",
      "resources",
      "exec_status",
      "notes",
      "current_step",
    ];
    const rows = items.map((r) =>
      head.map((k) => String(r[k] ?? "").replace(/"/g, '""')).join('","')
    );
    const csv = `"${head.join('","')}"\n"${rows.join('"\n"')}"`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=intermid-items.csv");
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// very small “PDF” (simple text PDF) for quick test
router.get("/pdf", requireAuth, async (req, res) => {
  try {
    const step = req.query.step !== undefined ? Number(req.query.step) : undefined;
    const items = await fetchItems(step);
    // super-minimal PDF (ok for demo): one page with plain text
    const lines = items.map((i) => `${i.number}  ${i.title}`).join("\\n");
    const content = `%PDF-1.4
1 0 obj<<>>endobj
2 0 obj<< /Length 3 0 R >>stream
BT /F1 12 Tf 50 750 Td (${lines}) Tj ET
endstream
endobj
3 0 obj 100 endobj
4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
5 0 obj<< /Type /Page /Parent 6 0 R /Resources<< /Font<< /F1 4 0 R >> >> /Contents 2 0 R /MediaBox [0 0 612 792] >>endobj
6 0 obj<< /Type /Pages /Kids [5 0 R] /Count 1 >>endobj
7 0 obj<< /Type /Catalog /Pages 6 0 R >>endobj
xref
0 8
0000000000 65535 f 
0000000010 00000 n 
0000000043 00000 n 
0000000192 00000 n 
0000000215 00000 n 
0000000283 00000 n 
0000000452 00000 n 
0000000515 00000 n 
trailer<< /Root 7 0 R /Size 8 >>
startxref
580
%%EOF`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=intermid-items.pdf");
    res.send(content);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
