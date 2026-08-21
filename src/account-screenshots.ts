export interface AccountScreenshot {
  id: string;
  accountId: string;
  targetUrl: string;
  modifiers: string;
  r2Prefix: string;
  byteSize: number;
  accessCount: number;
  captureCount: number;
  createdAt: string;
  lastCapturedAt: string;
  lastAccessedAt: string | null;
}

interface AccountScreenshotRow {
  id: string;
  account_id: string;
  target_url: string;
  modifiers: string;
  r2_prefix: string;
  byte_size: number;
  access_count: number;
  capture_count: number;
  created_at: string;
  last_captured_at: string;
  last_accessed_at: string | null;
}

export interface AccountUsage {
  screenshotCount: number;
  storageBytes: number;
}

export async function upsertAccountScreenshot(
  db: D1Database,
  input: {
    accountId: string;
    targetUrl: string;
    modifiers: string;
    r2Prefix: string;
    byteSize: number;
    capturedAt: string;
  }
): Promise<string> {
  const row = await db
    .prepare(
      `INSERT INTO account_screenshots (
         id, account_id, target_url, modifiers, r2_prefix, byte_size,
         capture_count, created_at, last_captured_at
       ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(account_id, target_url, modifiers) DO UPDATE SET
         r2_prefix = excluded.r2_prefix,
         byte_size = excluded.byte_size,
         capture_count = account_screenshots.capture_count + 1,
         last_captured_at = excluded.last_captured_at
       RETURNING id`
    )
    .bind(
      crypto.randomUUID(),
      input.accountId,
      input.targetUrl,
      input.modifiers,
      input.r2Prefix,
      input.byteSize,
      input.capturedAt,
      input.capturedAt
    )
    .first<{ id: string }>();

  if (!row) throw new Error('Failed to catalog account screenshot');
  return row.id;
}

export async function recordAccountScreenshotAccess(
  db: D1Database,
  accountId: string,
  targetUrl: string,
  modifiers: string,
  accessedAt: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE account_screenshots
       SET access_count = access_count + 1, last_accessed_at = ?
       WHERE account_id = ? AND target_url = ? AND modifiers = ?`
    )
    .bind(accessedAt, accountId, targetUrl, modifiers)
    .run();
}

export async function listAccountScreenshots(
  db: D1Database,
  accountId: string
): Promise<AccountScreenshot[]> {
  const result = await db
    .prepare(
      `SELECT id, account_id, target_url, modifiers, r2_prefix, byte_size,
              access_count, capture_count, created_at, last_captured_at,
              last_accessed_at
       FROM account_screenshots
       WHERE account_id = ?
       ORDER BY last_captured_at DESC
       LIMIT 100`
    )
    .bind(accountId)
    .all<AccountScreenshotRow>();
  return (result.results || []).map(mapAccountScreenshot);
}

export async function getAccountScreenshotById(
  db: D1Database,
  accountId: string,
  screenshotId: string
): Promise<AccountScreenshot | null> {
  const row = await db
    .prepare(
      `SELECT id, account_id, target_url, modifiers, r2_prefix, byte_size,
              access_count, capture_count, created_at, last_captured_at,
              last_accessed_at
       FROM account_screenshots
       WHERE id = ? AND account_id = ?`
    )
    .bind(screenshotId, accountId)
    .first<AccountScreenshotRow>();
  return row ? mapAccountScreenshot(row) : null;
}

export async function findAccountScreenshot(
  db: D1Database,
  accountId: string,
  targetUrl: string,
  modifiers: string
): Promise<AccountScreenshot | null> {
  const row = await db
    .prepare(
      `SELECT id, account_id, target_url, modifiers, r2_prefix, byte_size,
              access_count, capture_count, created_at, last_captured_at,
              last_accessed_at
       FROM account_screenshots
       WHERE account_id = ? AND target_url = ? AND modifiers = ?`
    )
    .bind(accountId, targetUrl, modifiers)
    .first<AccountScreenshotRow>();
  return row ? mapAccountScreenshot(row) : null;
}

export async function getAccountUsage(
  db: D1Database,
  accountId: string
): Promise<AccountUsage> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS screenshot_count,
              COALESCE(SUM(byte_size), 0) AS storage_bytes
       FROM account_screenshots
       WHERE account_id = ?`
    )
    .bind(accountId)
    .first<{ screenshot_count: number; storage_bytes: number }>();
  return {
    screenshotCount: Number(row?.screenshot_count || 0),
    storageBytes: Number(row?.storage_bytes || 0),
  };
}

export async function deleteAccountScreenshotRecord(
  db: D1Database,
  accountId: string,
  screenshotId: string
): Promise<void> {
  await db
    .prepare('DELETE FROM account_screenshots WHERE id = ? AND account_id = ?')
    .bind(screenshotId, accountId)
    .run();
}

function mapAccountScreenshot(row: AccountScreenshotRow): AccountScreenshot {
  return {
    id: row.id,
    accountId: row.account_id,
    targetUrl: row.target_url,
    modifiers: row.modifiers || '',
    r2Prefix: row.r2_prefix,
    byteSize: Number(row.byte_size),
    accessCount: Number(row.access_count),
    captureCount: Number(row.capture_count),
    createdAt: row.created_at,
    lastCapturedAt: row.last_captured_at,
    lastAccessedAt: row.last_accessed_at,
  };
}
