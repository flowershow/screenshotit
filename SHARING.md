# ScreenshotIt

**Screenshot any webpage via URL. No API keys, no SDK, no dashboard.**

```
screenshotit.app/https://example.com
```

That's it. The URL *is* the API. Embed it anywhere:

```markdown
![](https://screenshotit.app/https://example.com)
```

Add `@full` for full-page, `@mobile` for mobile viewport. Screenshots are cached; use `@refresh` to force update.

Built on Cloudflare (Workers + Browser Rendering + R2). ~400 lines of TypeScript. Alpha release.

**Try it:** https://screenshotit.app/https://example.com

---

# Building ScreenshotIt: URL-Native Screenshots

What if taking a screenshot of any webpage was as simple as writing a URL?

```
screenshotit.app/https://example.com
```

That's the idea behind screenshotit.app. No API keys, no SDKs, no dashboards. Just a URL that returns an image.

## The Problem

Most screenshot tools require you to integrate an API, manage credentials, handle file uploads, or use a dashboard. If you're writing documentation, a blog post, or research notes, you just want to embed a screenshot. You don't want to spin up infrastructure.

## The Solution

screenshotit.app treats screenshots as URLs. You construct a URL, and you get an image back. It's embeddable anywhere that accepts images: Markdown, wikis, static sites, note-taking apps.

```markdown
![Example homepage](https://screenshotit.app/https://example.com)
```

## What We Built

The v1 implementation runs entirely on Cloudflare's edge infrastructure:

**Cloudflare Worker** - The entry point that handles requests, parses URLs, checks cache, and returns images.

**Browser Rendering API** - Cloudflare's headless Chromium service that actually loads pages and takes screenshots. No servers to manage.

**R2 Storage** - Object storage for caching screenshots. Each screenshot is stored twice: as `latest.png` (always current) and as `{date}.png` (for historical reference).

## Technical Details

### URL Normalization

All URLs are normalized before storage to ensure consistent caching:

- Query strings stripped (avoids tracking params like `?utm_source=...`)
- Fragments stripped (don't affect rendering)
- Entire URL lowercased (most servers are case-insensitive)
- URL-decoded for readable storage keys

So `https://Example.COM/My%20Page?ref=twitter#section` becomes `https://example.com/my page`.

### Modifier System

Options are passed via `@modifier` syntax:

```
screenshotit.app/https://example.com@full      # Full page screenshot
screenshotit.app/https://example.com@mobile   # Mobile viewport (390x844)
screenshotit.app/https://example.com@refresh  # Force fresh capture
screenshotit.app/https://example.com@full@mobile  # Combine them
```

Modifiers are sorted alphabetically in storage keys for consistency (`full-mobile`, not `mobile-full`).

### Viewport Defaults

- **Desktop**: 1280x800 at 2x scale (produces 2560x1600 PNG)
- **Mobile**: 390x844 at 2x scale (iPhone 14 dimensions)
- **Full page**: Captures entire scrollable height

### Rate Limiting

The `@refresh` modifier bypasses the cache, but is rate-limited to once per day per URL. This prevents abuse while still allowing updates when pages change.

### R2 Key Structure

```
screenshots/
  https://example.com/
    default/
      latest.png
      2026-01-28.png
    full/
      latest.png
    mobile/
      latest.png
```

## What's Next

This is v1. Future possibilities:

- `@YYYY-MM-DD` modifier for retrieving historical snapshots
- `@dark` for dark mode screenshots
- Public R2 CDN for faster serving
- Custom wait selectors for SPAs

## The Stack

- **Runtime**: Cloudflare Workers (V8 isolates)
- **Browser**: Cloudflare Browser Rendering API
- **Storage**: Cloudflare R2
- **Language**: TypeScript
- **Testing**: Vitest

Total: ~400 lines of TypeScript, 32 tests, zero servers to manage.
