# Screenshot Analytics and Leaderboard Design

**Date:** 2026-02-24

## Goal
Track screenshot usage and creation in a Cloudflare-native way, then expose leaderboard and recent-created views on the homepage.

## Decisions
- Use **Cloudflare D1** as the analytics system of record.
- Keep **Umami** for homepage web analytics only.
- Track analytics at request/capture time in the Worker (server-side), not via client JS.
- Do not block rollout on backfill. Add optional backfill later if needed.

## Data Model
A single table `screenshot_stats` keyed by `r2_key` (`screenshots/<normalized>/<modifier>/latest.webp`):
- `r2_key` TEXT PRIMARY KEY
- `target_url` TEXT NOT NULL
- `modifiers` TEXT NOT NULL
- `created_at` TEXT NOT NULL (first capture timestamp)
- `last_created_at` TEXT NOT NULL (latest capture timestamp)
- `created_count` INTEGER NOT NULL DEFAULT 0
- `access_count` INTEGER NOT NULL DEFAULT 0
- `last_accessed_at` TEXT

Indexes:
- `access_count DESC`
- `created_at DESC`

## Request/Capture Flow
- On every successful screenshot response (cached or fresh), increment `access_count` and set `last_accessed_at`.
- On successful fresh capture/save, upsert row:
  - initialize row on first capture
  - increment `created_count`
  - update `last_created_at`

Failures in analytics writes should not fail screenshot serving; they should be best-effort.

## Homepage Views
- Leaderboard: top N screenshots by `access_count` (all-time default).
- Recently created: latest N by `created_at`.

## Deployment and Docs
- Add D1 binding to `wrangler.toml`.
- Add migration SQL in `migrations/`.
- Update README with D1 create/migrate/deploy steps.

## Backfill
- Initial release: no backfill.
- Optional future script can scan R2 dated keys and seed `created_at` history.
