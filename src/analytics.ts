export interface ScreenshotStatsRow {
  r2Key: string;
  targetUrl: string;
  modifiers: string;
  accessCount: number;
  createdCount: number;
  createdAt: string;
  lastCreatedAt: string;
  lastAccessedAt: string | null;
}

export interface AccessEventInput {
  r2Key: string;
  targetUrl: string;
  modifiers: string;
  accessedAt: string;
}

export interface CreateEventInput {
  r2Key: string;
  targetUrl: string;
  modifiers: string;
  createdAt: string;
}

interface RawStatsRow {
  r2_key: string;
  target_url: string;
  modifiers: string;
  access_count: number;
  created_count: number;
  created_at: string;
  last_created_at: string;
  last_accessed_at: string | null;
}

export async function recordScreenshotAccess(
  db: D1Database,
  event: AccessEventInput
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO screenshot_stats (
        r2_key,
        target_url,
        modifiers,
        access_count,
        last_accessed_at
      ) VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(r2_key) DO UPDATE SET
        target_url = excluded.target_url,
        modifiers = excluded.modifiers,
        access_count = screenshot_stats.access_count + 1,
        last_accessed_at = excluded.last_accessed_at`
    )
    .bind(event.r2Key, event.targetUrl, event.modifiers, event.accessedAt)
    .run();
}

export async function recordScreenshotCreated(
  db: D1Database,
  event: CreateEventInput
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO screenshot_stats (
        r2_key,
        target_url,
        modifiers,
        created_at,
        created_count
      ) VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(r2_key) DO UPDATE SET
        target_url = excluded.target_url,
        modifiers = excluded.modifiers,
        created_count = screenshot_stats.created_count + 1,
        last_created_at = excluded.created_at`
    )
    .bind(event.r2Key, event.targetUrl, event.modifiers, event.createdAt)
    .run();
}

export async function getTopScreenshots(
  db: D1Database,
  limit = 10
): Promise<ScreenshotStatsRow[]> {
  const result = await db
    .prepare(
      `SELECT
        r2_key,
        target_url,
        modifiers,
        access_count,
        created_count,
        created_at,
        last_created_at,
        last_accessed_at
      FROM screenshot_stats
      ORDER BY access_count DESC, last_accessed_at DESC
      LIMIT ?`
    )
    .bind(limit)
    .all<RawStatsRow>();

  return (result.results || []).map(mapRow);
}

export async function getRecentCreatedScreenshots(
  db: D1Database,
  limit = 10
): Promise<ScreenshotStatsRow[]> {
  const result = await db
    .prepare(
      `SELECT
        r2_key,
        target_url,
        modifiers,
        access_count,
        created_count,
        created_at,
        last_created_at,
        last_accessed_at
      FROM screenshot_stats
      ORDER BY created_at DESC
      LIMIT ?`
    )
    .bind(limit)
    .all<RawStatsRow>();

  return (result.results || []).map(mapRow);
}

export function toPublicScreenshotPath(
  targetUrl: string,
  modifiers: string
): string {
  const withoutProtocol = targetUrl.replace(/^https?:\/\//, '');
  const modifierSuffix = modifiers
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `@${part}`)
    .join('');

  return `/${withoutProtocol}${modifierSuffix}`;
}

function mapRow(row: RawStatsRow): ScreenshotStatsRow {
  return {
    r2Key: row.r2_key,
    targetUrl: row.target_url,
    modifiers: row.modifiers || '',
    accessCount: Number(row.access_count),
    createdCount: Number(row.created_count),
    createdAt: row.created_at,
    lastCreatedAt: row.last_created_at,
    lastAccessedAt: row.last_accessed_at,
  };
}
