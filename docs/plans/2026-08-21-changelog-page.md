# Changelog Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the repository changelog convention, record the account-support release, and expose the same release notes at `/changelog`.

**Architecture:** Keep `changelog.md` as the human-facing canonical record. Store the small set of public entries in a typed `src/changelog.ts` module and render them as escaped HTML from the Worker, routing `/changelog` before the screenshot catch-all. The page is public, read-only, and uses the existing site shell without new bindings.

**Tech Stack:** Cloudflare Worker, TypeScript, Vitest, existing HTML render functions, Markdown documentation.

---

### Task 1: Add repository changelog guidance and release entry

**Files:**
- Create: `AGENTS.md`
- Create: `changelog.md`

**Step 1: Add the requested AGENTS content verbatim**

Copy the 13-line content from the requested `add-to-agents.md` source into `AGENTS.md`.

**Step 2: Add the dated newest-first release entry**

Record the shipped GitHub login, username URLs, and public account-owned screenshot lifecycle in one reader-facing entry dated `2026-08-21`, with no implementation-file details or screenshot asset because the release is primarily a workflow feature.

**Step 3: Verify the content**

Run: `sed -n '1,80p' AGENTS.md && sed -n '1,80p' changelog.md`

Expected: AGENTS matches the source and changelog has the new entry first.

**Step 4: Commit**

```bash
git add AGENTS.md changelog.md
git commit -m "docs: add changelog guidance and account release"
```

### Task 2: Add typed changelog rendering with a failing test first

**Files:**
- Create: `src/changelog.ts`
- Create: `src/changelog.test.ts`

**Step 1: Write the failing tests**

Cover that the renderer includes the dated account release, escapes entry text before inserting it into HTML, and returns a complete page shell with a home link.

**Step 2: Run the focused test**

Run: `npx vitest run src/changelog.test.ts`

Expected: FAIL because the module and renderer do not exist.

**Step 3: Implement the minimal renderer**

Define a typed entry array and render function. Escape `&`, `<`, `>`, `"`, and `'`; render headings, body copy, and optional links using the existing visual language. Keep the data small and static.

**Step 4: Run the focused test**

Run: `npx vitest run src/changelog.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/changelog.ts src/changelog.test.ts
git commit -m "feat: add changelog page renderer"
```

### Task 3: Route `/changelog` through the Worker

**Files:**
- Modify: `src/index.ts`
- Modify: `src/index.test.ts` if route-level tests are present; otherwise add route assertions to `src/changelog.test.ts`

**Step 1: Write the failing route test**

Assert that a GET request for `/changelog` returns status 200, HTML content type, and the account-release title, while the existing screenshot fallback remains available for other paths.

**Step 2: Run the focused test**

Run: `npx vitest run src/changelog.test.ts`

Expected: FAIL because the Worker does not dispatch `/changelog` yet.

**Step 3: Add the route**

Import the renderer and return it for exactly `/changelog` before `handleScreenshotRequest`. Preserve the existing auth and dashboard routing order.

**Step 4: Run focused and full verification**

Run: `npx vitest run src/changelog.test.ts && npm test && npx tsc --noEmit`

Expected: all tests pass and TypeScript reports no errors.

**Step 5: Commit**

```bash
git add src/index.ts src/changelog.test.ts
git commit -m "feat: expose changelog route"
```

### Task 4: Deploy and verify the live page

**Files:**
- No source changes expected.

**Step 1: Validate the Worker bundle**

Run: `npx wrangler deploy --dry-run`

Expected: successful bundle validation with the existing D1, R2, and Browser bindings.

**Step 2: Deploy**

Run: `npx wrangler deploy`

Expected: a new production version for `screenshotit`.

**Step 3: Smoke-test production**

Run: `curl -sS -D - https://screenshotit.app/changelog -o /tmp/screenshotit-changelog.html` and verify status `200`, HTML content type, and the account-release title. Also verify `/` remains `200` and `/dashboard` remains an unauthenticated redirect.

**Step 4: Push the commits**

```bash
git push origin main
```

Expected: `main` is synchronized with `origin/main`.
