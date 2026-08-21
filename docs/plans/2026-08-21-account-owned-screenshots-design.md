# Account-Owned Screenshots Design

## Goal

Add optional accounts to ScreenshotIt without changing the existing anonymous
service. Signed-in users receive a public username namespace where they can
create, refresh, inspect, and delete screenshots. Anyone can read screenshots
that already exist in that namespace.

The first authentication provider is GitHub. The data model remains
provider-neutral so Google or another OAuth provider can be added later.

## Product Rules

- Anonymous URLs such as `/example.com@full` keep their current behavior.
- Account URLs use `/@username/<target>`, for example
  `/@alice/example.com@full`.
- Account-owned screenshots are public and require no authentication to read.
- Only the owning account may create a missing screenshot in its namespace.
- Only the owning account may refresh or delete its screenshots.
- Usernames are public, attractive identifiers. Internal ownership uses an
  immutable account ID so username changes do not require moving R2 objects.
- Old usernames remain aliases after a rename so published screenshot URLs do
  not break.

## Authentication

The Worker implements the GitHub OAuth web flow. It creates an account on the
first successful login and stores a provider identity separately from the
account itself.

Authentication endpoints:

- `GET /auth/github` starts GitHub authorization with a short-lived state value.
- `GET /auth/github/callback` validates state, exchanges the authorization code,
  loads the GitHub identity, and creates a session.
- `POST /auth/logout` invalidates the session.
- `GET /api/me` returns the current public account profile.

Sessions use an opaque random token in a Secure, HttpOnly, SameSite cookie. D1
stores only a hash of the token, along with the account ID and expiry. OAuth
state values are also short-lived and single-use. State-changing account API
requests validate same-origin requests and a CSRF token.

The account and identity records are separate. A future Google identity can be
linked to an existing account without changing screenshot ownership or URLs.
Automatic cross-provider account merging is out of scope.

## Username Model

GitHub's login becomes the initial username after case-folding to lowercase.
Usernames are unique case-insensitively and are limited to a URL-safe subset.
Reserved route names such as `auth`, `api`, and `admin` cannot be usernames.

D1 maps the current username and all retained aliases to the immutable account
ID. A request for an alias resolves to the same account and screenshot objects.
The application can emit the current canonical URL in metadata or dashboard
links, but reads do not need to redirect.

If a GitHub username is unavailable because another ScreenshotIt account owns
it, login stops at a username-selection screen rather than silently taking or
reassigning the name.

## Routing and Request Flow

Account routing is detected before the existing target URL parser. The first
path segment must match `@<username>`; the remaining path is parsed using the
existing URL and modifier rules.

For `GET /@alice/example.com@full`:

1. Resolve `alice` to an account ID.
2. Build the account-scoped R2 key.
3. If the object exists, serve it publicly using the existing cache headers.
4. If it does not exist, inspect the session.
5. If the session belongs to Alice, check quota, capture, store, and record it.
6. Otherwise return `404`. An unauthenticated reader cannot spend an account's
   capture or storage allowance.

`@refresh` follows the same ownership rule even when the screenshot exists.
Dated lookups remain read-only and public when the dated object exists.

## Storage

Anonymous objects retain their current key structure:

```text
screenshots/<normalized-url>/<modifiers>/<date-or-latest>.webp
```

Account objects use the immutable ID:

```text
accounts/<account-id>/screenshots/<normalized-url>/<modifiers>/<date-or-latest>.webp
```

The public username is intentionally absent from R2 keys. Renaming an account
therefore changes only D1 aliases. Anonymous and account-owned captures are
separate objects even when they have the same target URL.

R2 key prefixes organize objects but are not an authorization mechanism. The
Worker enforces all create, refresh, and delete ownership rules.

## Data Model

D1 adds the following logical tables:

- `accounts`: immutable ID, current username, timestamps, status, and quota
  limits.
- `account_usernames`: case-folded username or historical alias mapped to an
  account, with a canonical flag.
- `account_identities`: provider, immutable provider user ID, provider login,
  and account ID.
- `sessions`: hashed session token, account ID, expiry, and timestamps.
- `oauth_states`: hashed state value, expiry, and optional return path.
- `account_screenshots`: stable screenshot ID, account ID, normalized target,
  modifiers, R2 prefix, byte totals, timestamps, and status.
- `account_usage`: per-account counters for stored bytes, stored objects,
  captures, and accesses.

Existing global analytics continue to support the public homepage. Account
events also carry `account_id`, allowing the dashboard to show account-specific
counts without deriving ownership from a username or parsing an R2 key.

## Dashboard and Management API

The first dashboard is intentionally small:

- current username and GitHub identity;
- screenshot count, stored bytes, captures, and accesses;
- quota usage;
- a form to create an account URL;
- a list of owned screenshots with public links, refresh, and delete actions.

Deletion uses a stable screenshot ID rather than embedding the target URL in an
API route. The Worker verifies ownership, lists and deletes the screenshot's
`latest` and dated objects under its exact R2 prefix, removes its metadata, and
updates usage counters. A partial R2 failure leaves the metadata in a retryable
deleting state instead of falsely reporting success.

## Quotas and Consistency

Quota checks happen before capture. Initial limits are configuration-driven so
the product can change them without a schema migration. D1 usage counters are
the fast enforcement path; R2 object sizes and metadata are the source for a
periodic reconciliation job.

Creation reserves capacity in D1 before browser capture. Failed captures release
the reservation. Successful R2 writes finalize the screenshot record and usage
counters. Duplicate concurrent requests use a uniqueness constraint on account,
target, and modifiers so only one logical screenshot is created.

## Errors

- Unknown username: `404`.
- Existing screenshot: public image response.
- Missing screenshot requested by a non-owner: `404`.
- Owner without remaining quota: `429` with a clear quota response.
- Unauthorized refresh or delete: `403` for authenticated callers and `401` for
  API callers without a session.
- OAuth denial or invalid state: safe redirect to the homepage with a short
  error code; provider tokens and authorization codes are never logged.
- Capture, R2, or D1 failure: preserve existing service error behavior while
  ensuring quota reservations can be reconciled.

## Testing

- Unit tests for account-route parsing, username normalization, R2 account keys,
  session validation, ownership decisions, and quota transitions.
- D1 tests for unique provider identities, case-insensitive usernames, aliases,
  session expiry, and concurrent screenshot uniqueness.
- Worker integration tests covering public reads, owner creation, non-owner
  creation denial, owner refresh/delete, anonymous compatibility, and OAuth
  callback failures.
- Storage tests covering complete deletion, partial failure, and reconciliation.
- Existing anonymous route, storage, analytics, rate-limit, and homepage tests
  remain regression coverage.

## Out of Scope

- Private screenshots or access-controlled reads.
- Password authentication.
- Team/shared accounts.
- Billing and paid quota upgrades.
- Automatic identity merging across providers.
- Deduplicating bytes between anonymous and account namespaces.
