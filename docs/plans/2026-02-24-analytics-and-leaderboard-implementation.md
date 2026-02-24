# Analytics and Leaderboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add D1-backed analytics for screenshot accesses/creates and expose leaderboard + recent-created on the homepage.

**Architecture:** Worker writes analytics counters to D1 on successful responses and captures. Homepage fetches pre-aggregated top and recent rows from D1 at request time. Analytics failures are non-fatal.

**Tech Stack:** Cloudflare Workers (TypeScript), Cloudflare D1, R2, Vitest.

---

### Task 1: Add failing tests for analytics data layer

**Files:**
- Create: `src/analytics.test.ts`
- Create: `src/analytics.ts`

**Step 1: Write failing test**
- Add tests for:
  - access upsert increments `access_count`
  - creation upsert initializes/increments `created_count`
  - leaderboard/recent query mapping

**Step 2: Run test to verify it fails**
Run: `npm test -- src/analytics.test.ts`
Expected: FAIL because module/functions do not exist.

**Step 3: Write minimal implementation**
- Implement analytics helpers over D1 prepared statements.

**Step 4: Run test to verify it passes**
Run: `npm test -- src/analytics.test.ts`
Expected: PASS.

### Task 2: Add failing tests for homepage analytics section rendering

**Files:**
- Modify: `src/homepage.ts`
- Create: `src/homepage.test.ts`

**Step 1: Write failing test**
- Assert homepage includes leaderboard and recent sections when given sample data.

**Step 2: Run test to verify it fails**
Run: `npm test -- src/homepage.test.ts`
Expected: FAIL because render function has no data inputs/sections.

**Step 3: Write minimal implementation**
- Make `renderHomepage` accept optional analytics data and render sections.

**Step 4: Run test to verify it passes**
Run: `npm test -- src/homepage.test.ts`
Expected: PASS.

### Task 3: Integrate analytics in Worker request flow

**Files:**
- Modify: `src/index.ts`

**Step 1: Write failing integration-oriented test (minimal)**
- If practical, unit test analytics helper calls via spies/mocks; otherwise rely on module tests + type checks.

**Step 2: Run targeted tests**
Run: `npm test -- src/analytics.test.ts src/homepage.test.ts`

**Step 3: Implement integration**
- Add D1 binding to `Env`
- Query leaderboard/recent for `/`
- Record access on successful cached/fresh/dated responses
- Record create on fresh capture only
- Swallow analytics failures with `console.error`

**Step 4: Re-run tests**
Run: `npm test -- src/analytics.test.ts src/homepage.test.ts src/storage.test.ts src/normalize.test.ts src/screenshot.test.ts src/ratelimit.test.ts`
Expected: PASS.

### Task 4: Add D1 schema and Wrangler config

**Files:**
- Modify: `wrangler.toml`
- Create: `migrations/0001_analytics.sql`

**Step 1: Add migration SQL**
- Create table/indexes for `screenshot_stats`.

**Step 2: Add D1 binding**
- Add `[[d1_databases]]` binding `ANALYTICS_DB`.

**Step 3: Validate config references**
Run: `npx wrangler d1 migrations list ANALYTICS_DB --local` (or document if not runnable offline)

### Task 5: Update README setup/deploy docs

**Files:**
- Modify: `README.md`

**Step 1: Document D1 setup**
- Create DB
- Add database id to wrangler config
- Apply migrations local/prod

**Step 2: Document behavior + backfill stance**
- Explain real-time tracking and no initial backfill.

**Step 3: Verify docs consistency**
Run: `rg -n "D1|analytics|migrations|leaderboard|recent" README.md wrangler.toml`

### Task 6: Full verification

**Files:**
- No new files.

**Step 1: Run full test suite**
Run: `npm test`
Expected: all tests pass.

**Step 2: Summarize changed files and commands run**
- Provide precise notes and any follow-up actions.
