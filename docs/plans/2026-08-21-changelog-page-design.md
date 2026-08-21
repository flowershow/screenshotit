# Changelog page design

## Goal

Record the account-owned screenshot release in the repository's conventional
root `changelog.md` and make those release notes readable at `/changelog`.

## Design

- Copy the requested short changelog guidance into a root `AGENTS.md`.
- Keep `changelog.md` as the canonical, dated, newest-first record.
- Represent the same entries in a small typed module used by the Worker route;
  this avoids adding a Markdown parser for a simple public page while keeping
  the page's HTML escaped and predictable.
- Add `/changelog` before screenshot catch-all routing. The page will use the
  existing site's typography and navigation, show the newest account-support
  release first, and include a link back home.
- Keep the route public and read-only. No new bindings, storage, or auth rules
  are needed.

## Verification

- Unit-test the changelog rendering and route response.
- Run the full test suite and TypeScript validation.
- Deploy and verify `/changelog` returns `200` with the new entry on the live
  site.
