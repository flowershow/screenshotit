PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  max_screenshots INTEGER NOT NULL DEFAULT 100,
  max_storage_bytes INTEGER NOT NULL DEFAULT 104857600,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS account_usernames (
  username TEXT PRIMARY KEY COLLATE NOCASE,
  account_id TEXT NOT NULL,
  is_canonical INTEGER NOT NULL DEFAULT 0 CHECK (is_canonical IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_usernames_canonical
  ON account_usernames (account_id)
  WHERE is_canonical = 1;

CREATE TABLE IF NOT EXISTS account_identities (
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_login TEXT NOT NULL,
  account_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (provider, provider_user_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_identities_account
  ON account_identities (account_id);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  csrf_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  last_seen_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_account
  ON sessions (account_id);

CREATE INDEX IF NOT EXISTS idx_sessions_expiry
  ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS oauth_states (
  state_hash TEXT PRIMARY KEY,
  return_to TEXT NOT NULL DEFAULT '/dashboard',
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_expiry
  ON oauth_states (expires_at);

CREATE TABLE IF NOT EXISTS account_screenshots (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  target_url TEXT NOT NULL,
  modifiers TEXT NOT NULL DEFAULT '',
  r2_prefix TEXT NOT NULL,
  byte_size INTEGER NOT NULL DEFAULT 0,
  access_count INTEGER NOT NULL DEFAULT 0,
  capture_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  last_captured_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  last_accessed_at TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  UNIQUE (account_id, target_url, modifiers)
);

CREATE INDEX IF NOT EXISTS idx_account_screenshots_account_created
  ON account_screenshots (account_id, created_at DESC);
