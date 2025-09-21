-- create items table (Phase 1)
CREATE TABLE IF NOT EXISTS items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  number       TEXT,
  title        TEXT NOT NULL,
  factor       TEXT,          -- internal | external
  action       TEXT,          -- explore | decide | execute
  scope        TEXT,          -- narrow | medium | wide
  time         TEXT,          -- short | medium | long
  resources    TEXT,          -- low | medium | high
  exec_status  TEXT,          -- not_started | in_progress | completed | delayed
  current_step INTEGER,       -- 0 Item, 1 Factor, 2 Action, 3 STR, 4 Status
  notes        TEXT,
  created_at   TEXT,
  updated_at   TEXT
);

-- seed a couple of rows (only if table empty; we’ll guard in JS)
