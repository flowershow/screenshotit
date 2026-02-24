CREATE TABLE IF NOT EXISTS screenshot_stats (
  r2_key TEXT PRIMARY KEY,
  target_url TEXT NOT NULL,
  modifiers TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  last_created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  created_count INTEGER NOT NULL DEFAULT 0,
  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_screenshot_stats_access_count
  ON screenshot_stats (access_count DESC, last_accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_screenshot_stats_created_at
  ON screenshot_stats (created_at DESC);
