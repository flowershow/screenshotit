# Account-Owned Screenshots Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add GitHub login and public `/@username/...` screenshot namespaces where only the owner can create, refresh, or delete screenshots.

**Architecture:** Keep anonymous request handling intact while routing account-prefixed paths through an ownership-aware handler. Store public usernames and OAuth identities in D1, authenticate opaque cookie sessions, and store account screenshots below immutable account-ID R2 prefixes. Record an account screenshot catalog in D1 for dashboard listing, deletion, and usage totals.

**Tech Stack:** Cloudflare Workers, TypeScript, D1, R2, GitHub OAuth, Web Crypto, Vitest

---

### Task 1: Add the account database schema

**Files:**
- Create: `migrations/0002_accounts.sql`

**Step 1: Define account and identity tables**

Create `accounts`, `account_usernames`, and `account_identities`. Use text UUIDs for account IDs, case-folded usernames as primary keys, and a unique `(provider, provider_user_id)` identity constraint.

**Step 2: Define session and OAuth-state tables**

Store only SHA-256 hashes of session and state tokens. Add expiry indexes so expired records can be removed efficiently.

**Step 3: Define screenshot catalog and usage tables**

Create `account_screenshots` with a unique `(account_id, target_url, modifiers)` key and counters for bytes, accesses, and captures. Use `ON DELETE CASCADE` for account-owned records.

**Step 4: Validate the migration locally**

Run: `npx wrangler d1 migrations apply screenshotit-analytics --local`

Expected: migration `0002_accounts.sql` applies successfully.

**Step 5: Commit**

```bash
git add -- migrations/0002_accounts.sql
git commit -m "feat: add account storage schema"
```

### Task 2: Parse account routes and build account R2 keys

**Files:**
- Create: `src/account-routing.ts`
- Create: `src/account-routing.test.ts`
- Modify: `src/normalize.ts`
- Modify: `src/normalize.test.ts`

**Step 1: Write failing routing tests**

Cover `/@alice/example.com`, case-folding of `/@Alice/...`, rejection of a missing target, and leaving anonymous paths unmatched.

```ts
expect(parseAccountRoute('/@Alice/example.com@full')).toEqual({
  username: 'alice',
  screenshotPath: '/example.com@full',
});
expect(parseAccountRoute('/example.com')).toBeNull();
```

**Step 2: Run the focused tests and verify failure**

Run: `npm test -- src/account-routing.test.ts src/normalize.test.ts`

Expected: FAIL because `parseAccountRoute` and `buildAccountR2Key` do not exist.

**Step 3: Implement route parsing and username validation**

Accept GitHub-compatible usernames after `@`, normalize to lowercase, and reserve `auth`, `api`, and `dashboard`. Return `null` for ordinary anonymous routes and throw a request error for malformed account routes.

**Step 4: Implement immutable-ID R2 keys**

Add:

```ts
buildAccountR2Key(accountId, normalizedUrl, modifiers, date)
// accounts/<accountId>/screenshots/<normalizedUrl>/<modifier>/<filename>
```

Factor the shared modifier and filename construction so anonymous key behavior does not change.

**Step 5: Run tests and type checking**

Run: `npm test -- src/account-routing.test.ts src/normalize.test.ts && npx tsc --noEmit`

Expected: PASS.

**Step 6: Commit**

```bash
git add -- src/account-routing.ts src/account-routing.test.ts src/normalize.ts src/normalize.test.ts
git commit -m "feat: add account screenshot routing"
```

### Task 3: Add secure session primitives and account persistence

**Files:**
- Create: `src/auth.ts`
- Create: `src/auth.test.ts`
- Create: `src/accounts.ts`
- Create: `src/accounts.test.ts`

**Step 1: Write failing crypto and cookie tests**

Cover random token creation, SHA-256 hashing, cookie parsing, secure production cookies, local-development cookies, expiry, and logout cookie clearing.

**Step 2: Write failing account repository tests**

Cover username lookup through aliases, provider identity lookup, first-login account creation, existing-login reuse, session lookup by token hash, and expired-session rejection.

**Step 3: Run focused tests and verify failure**

Run: `npm test -- src/auth.test.ts src/accounts.test.ts`

Expected: FAIL because the modules do not exist.

**Step 4: Implement authentication primitives**

Use Web Crypto and base64url tokens. Export helpers for OAuth-state cookies, session cookies, token hashing, cookie parsing, session creation, session lookup, and session deletion. Never persist or log a raw session token.

**Step 5: Implement the D1 account repository**

Use immutable GitHub user IDs as provider identity keys. On first login, create the account, canonical username alias, and identity in one `D1Database.batch`. If a username is occupied by another identity, return a typed conflict instead of reassigning it.

**Step 6: Run tests and type checking**

Run: `npm test -- src/auth.test.ts src/accounts.test.ts && npx tsc --noEmit`

Expected: PASS.

**Step 7: Commit**

```bash
git add -- src/auth.ts src/auth.test.ts src/accounts.ts src/accounts.test.ts
git commit -m "feat: add account sessions and persistence"
```

### Task 4: Implement GitHub OAuth routes

**Files:**
- Create: `src/github-auth.ts`
- Create: `src/github-auth.test.ts`
- Modify: `src/index.ts`

**Step 1: Write failing OAuth tests**

Cover authorization URL construction, callback state mismatch, GitHub token exchange errors, user-profile errors, successful account/session creation, safe return paths, and logout.

**Step 2: Run the focused tests and verify failure**

Run: `npm test -- src/github-auth.test.ts`

Expected: FAIL because OAuth handlers do not exist.

**Step 3: Implement GitHub OAuth integration**

Use Worker `fetch` for GitHub's authorize, access-token, and user endpoints. Request only `read:user`. Require `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `SESSION_SECRET` bindings. Validate one-time state before exchanging a code.

**Step 4: Route authentication endpoints before screenshot parsing**

Add `/auth/github`, `/auth/github/callback`, `/auth/logout`, and `/api/me` dispatch in `src/index.ts`. Keep provider secrets out of responses and logs.

**Step 5: Run tests and type checking**

Run: `npm test -- src/github-auth.test.ts && npx tsc --noEmit`

Expected: PASS.

**Step 6: Commit**

```bash
git add -- src/github-auth.ts src/github-auth.test.ts src/index.ts
git commit -m "feat: add GitHub login"
```

### Task 5: Add the account screenshot catalog

**Files:**
- Create: `src/account-screenshots.ts`
- Create: `src/account-screenshots.test.ts`
- Modify: `src/storage.ts`
- Modify: `src/storage.test.ts`

**Step 1: Write failing repository tests**

Cover screenshot lookup, upsert after capture, access increments, dashboard listing, aggregate usage, ownership lookup, and deletion state transitions.

**Step 2: Write failing R2 deletion tests**

Cover paginated prefix listing and batch deletion of both `latest.webp` and dated objects.

**Step 3: Run tests and verify failure**

Run: `npm test -- src/account-screenshots.test.ts src/storage.test.ts`

Expected: FAIL because catalog and prefix deletion functions do not exist.

**Step 4: Implement catalog operations**

Record immutable account ID, normalized target, stable sorted modifiers, R2 prefix, bytes, capture count, access count, and timestamps. Derive dashboard totals with SQL aggregates rather than a second mutable counter table in the MVP.

**Step 5: Implement exact-prefix deletion**

List every R2 page below the catalogued prefix, delete explicit returned keys, and only remove the D1 catalog record after all R2 deletes succeed.

**Step 6: Run tests and type checking**

Run: `npm test -- src/account-screenshots.test.ts src/storage.test.ts && npx tsc --noEmit`

Expected: PASS.

**Step 7: Commit**

```bash
git add -- src/account-screenshots.ts src/account-screenshots.test.ts src/storage.ts src/storage.test.ts
git commit -m "feat: catalog account screenshots"
```

### Task 6: Enforce public-read and owner-write semantics

**Files:**
- Create: `src/screenshot-handler.ts`
- Create: `src/screenshot-handler.test.ts`
- Modify: `src/index.ts`
- Modify: `src/ratelimit.ts`
- Modify: `src/ratelimit.test.ts`

**Step 1: Extract and test the existing anonymous handler**

Move screenshot request behavior out of `src/index.ts` without changing responses. Run all existing tests to establish anonymous regression coverage.

**Step 2: Write failing account authorization tests**

Cover public cached reads, public dated reads, owner creation, non-owner missing `404`, owner refresh, non-owner refresh denial, unknown username, and quota rejection.

**Step 3: Run the focused tests and verify failure**

Run: `npm test -- src/screenshot-handler.test.ts`

Expected: FAIL on account-specific behavior.

**Step 4: Implement the account request context**

Resolve the username alias before building an R2 key. For cached ordinary and dated reads, do not require a session. Before capture or refresh, require `session.accountId === route.accountId` and enforce configured limits.

**Step 5: Scope refresh rate limits by account ID**

Ensure one account cannot consume or block another account's refresh allowance for the same target.

**Step 6: Record catalog and analytics updates**

After successful capture, upsert the account catalog with the image byte length. On successful reads, increment account access best-effort alongside existing analytics.

**Step 7: Run the full test suite and type checking**

Run: `npm test && npx tsc --noEmit`

Expected: all tests PASS and TypeScript reports no errors.

**Step 8: Commit**

```bash
git add -- src/screenshot-handler.ts src/screenshot-handler.test.ts src/index.ts src/ratelimit.ts src/ratelimit.test.ts
git commit -m "feat: enforce account screenshot ownership"
```

### Task 7: Add dashboard and deletion endpoints

**Files:**
- Create: `src/dashboard.ts`
- Create: `src/dashboard.test.ts`
- Modify: `src/index.ts`
- Modify: `src/homepage.ts`
- Modify: `src/homepage.test.ts`

**Step 1: Write failing dashboard rendering tests**

Cover logged-out login prompt, account identity, usage summary, public screenshot URLs, create form, refresh links, delete forms, HTML escaping, and CSRF tokens.

**Step 2: Write failing management-route tests**

Cover authenticated dashboard access, unauthenticated redirects, owner deletion, cross-account deletion denial, invalid CSRF, and successful logout.

**Step 3: Run focused tests and verify failure**

Run: `npm test -- src/dashboard.test.ts src/homepage.test.ts`

Expected: FAIL because dashboard rendering and account navigation do not exist.

**Step 4: Implement the dashboard**

Render a server-side dashboard at `/dashboard`. Provide a target URL form that redirects the owner to their `/@username/...` URL, plus screenshot rows and usage totals.

**Step 5: Implement deletion**

Add `POST /api/screenshots/:id/delete`. Validate session, same-origin/CSRF, and ownership before deleting the exact R2 prefix and catalog row. Redirect back to the dashboard on success.

**Step 6: Add homepage account navigation**

Show “Log in with GitHub” for anonymous visitors and the username/dashboard link for authenticated visitors. Pass optional account data into homepage rendering without changing analytics sections.

**Step 7: Run tests and type checking**

Run: `npm test && npx tsc --noEmit`

Expected: all tests PASS.

**Step 8: Commit**

```bash
git add -- src/dashboard.ts src/dashboard.test.ts src/index.ts src/homepage.ts src/homepage.test.ts
git commit -m "feat: add account screenshot dashboard"
```

### Task 8: Configure and document deployment

**Files:**
- Modify: `wrangler.toml`
- Modify: `README.md`

**Step 1: Add non-secret configuration**

Add development defaults for the application origin, session lifetime, maximum account screenshots, and maximum account bytes. Document production overrides.

**Step 2: Document GitHub OAuth setup**

Describe creating a GitHub OAuth App with callback URL
`https://screenshotit.app/auth/github/callback`, setting `GITHUB_CLIENT_ID` as a
Worker variable, and adding `GITHUB_CLIENT_SECRET` and `SESSION_SECRET` with
`wrangler secret put` or the Cloudflare dashboard.

**Step 3: Document migration and user behavior**

Include D1 migration commands, `/@username` examples, public-read semantics,
owner-only creation/refresh/deletion, and unchanged anonymous URLs.

**Step 4: Verify configuration**

Run: `npx wrangler deploy --dry-run && npm test && npx tsc --noEmit`

Expected: dry-run bundle succeeds, all tests pass, and TypeScript reports no errors.

**Step 5: Commit**

```bash
git add -- wrangler.toml README.md
git commit -m "docs: configure account deployment"
```

### Task 9: Final verification

**Files:**
- Verify only

**Step 1: Apply migrations to a fresh local database**

Run: `npx wrangler d1 migrations apply screenshotit-analytics --local`

Expected: all migrations apply successfully.

**Step 2: Run automated verification**

Run: `npm test && npx tsc --noEmit && npx wrangler deploy --dry-run`

Expected: every command exits zero.

**Step 3: Inspect the final diff**

Run: `git status --short && git diff main@{upstream}...HEAD --stat`

Expected: only the pre-existing untracked `design/` directory remains outside committed feature changes.

**Step 4: Perform remote smoke tests after secrets and migration are configured**

Verify GitHub login, owner creation, logged-out public access, non-owner missing
`404`, refresh authorization, dashboard statistics, deletion, and continued
anonymous capture behavior.
