const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");

const DB_PATH = path.join(__dirname, "data.sqlite");
const db = new sqlite3.Database(DB_PATH);

// small helpers
function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

/**
 * Create tables if they do not exist.
 * We also keep your schema.sql if present, then ensure the new tables/columns.
 */
async function ensureSchema() {
  // If a schema.sql exists, run it first (backward compatible)
  const schemaPath = path.join(__dirname, "schema.sql");
  if (fs.existsSync(schemaPath)) {
    const sql = fs.readFileSync(schemaPath, "utf8");
    if (sql && sql.trim().length) {
      await exec(sql);
    }
  }

  // Items table — includes all columns used by the app
  await exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT,
      title TEXT,
      factor TEXT,          -- internal | external
      action TEXT,          -- explore | decide | execute
      scope TEXT,           -- narrow | medium | wide
      time TEXT,            -- short | medium | long
      resources TEXT,       -- low | medium | high
      exec_status TEXT,     -- not_started | in_progress | completed | delayed
      notes TEXT,
      current_step INTEGER DEFAULT 0,  -- 0..4
      created_at TEXT,
      updated_at TEXT
    );
  `);

  // Users & sessions for simple auth/roles
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,         -- plain for MVP (dev only). Replace with bcrypt in prod.
      role TEXT NOT NULL CHECK (role IN ('admin','manager','team')),
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Ensure missing columns on items (if migrating from older DB)
  const cols = await all(`PRAGMA table_info(items);`);
  const colNames = cols.map((c) => c.name);
  async function ensureCol(name, type, def = "") {
    if (!colNames.includes(name)) {
      await exec(`ALTER TABLE items ADD COLUMN ${name} ${type} ${def};`);
    }
  }
  await ensureCol("factor", "TEXT");
  await ensureCol("action", "TEXT");
  await ensureCol("scope", "TEXT");
  await ensureCol("time", "TEXT");
  await ensureCol("resources", "TEXT");
  await ensureCol("exec_status", "TEXT");
  await ensureCol("notes", "TEXT");
  await ensureCol("current_step", "INTEGER", "DEFAULT 0");
}

/**
 * Seed initial data if empty.
 */
async function seed() {
  const now = new Date().toISOString();

  // Seed users
  const ucount = await get("SELECT COUNT(*) AS c FROM users;").catch(() => ({ c: 0 }));
  if (!ucount || ucount.c === 0) {
    const users = [
      { username: "admin",   password: "admin123",   role: "admin" },
      { username: "manager", password: "manager123", role: "manager" },
      { username: "team",    password: "team123",    role: "team" },
    ];
    const stmt = db.prepare(`INSERT INTO users (username,password,role,created_at) VALUES (?,?,?,?)`);
    for (const u of users) stmt.run(u.username, u.password, u.role, now);
    stmt.finalize();
    console.log("Seeded users: admin/admin123, manager/manager123, team/team123");
  }

  // Seed items (only if empty)
  const icount = await get("SELECT COUNT(*) AS c FROM items;").catch(() => ({ c: 0 }));
  if (!icount || icount.c === 0) {
    const stmt = db.prepare(`
      INSERT INTO items (number,title,current_step,created_at,updated_at)
      VALUES (?,?,?,?,?)
    `);
    stmt.run("AC-001", "Draft strategy paper", 0, now, now);
    stmt.run("AC-002", "Confirm budget approval", 1, now, now);
    stmt.finalize();
  }
}

async function init() {
  await ensureSchema();
  await seed();
}

module.exports = { db, init, get, all, run };
