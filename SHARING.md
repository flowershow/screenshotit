# ScreenshotIt

**Screenshot any webpage via URL. No API keys, no SDK, no dashboard.**

```
screenshotit.app/example.com
```

That's it. The URL *is* the API. Embed it anywhere:

```markdown
![](https://screenshotit.app/example.com)
```

Add `@full` for full-page, `@mobile` for mobile viewport, `@social` for OG-sized social previews. Screenshots are cached; use `@refresh` to force update.

Built on Cloudflare (Workers + Browser Rendering + R2). ~400 lines of TypeScript. Alpha release.

**Try it:** https://screenshotit.app/example.com

---

# Building ScreenshotIt: URL-Native Screenshots

What if taking a screenshot of any webpage was as simple as writing a URL?

```
screenshotit.app/example.com
```

That's the idea behind screenshotit.app. No API keys, no SDKs, no dashboards. Just a URL that returns an image.

## The Problem

Most screenshot tools require you to integrate an API, manage credentials, handle file uploads, or use a dashboard. If you're writing documentation, a blog post, or research notes, you just want to embed a screenshot. You don't want to spin up infrastructure.

## The Solution

screenshotit.app treats screenshots as URLs. You construct a URL, and you get an image back. It's embeddable anywhere that accepts images: Markdown, wikis, static sites, note-taking apps.

```markdown
![Example homepage](https://screenshotit.app/example.com)
```

## What We Built

The v1 implementation runs entirely on Cloudflare's edge infrastructure:

**Cloudflare Worker** - The entry point that handles requests, parses URLs, checks cache, and returns images.

**Browser Rendering API** - Cloudflare's headless Chromium service that actually loads pages and takes screenshots. No servers to manage.

**R2 Storage** - Object storage for caching screenshots. Each screenshot is stored twice: as `latest.png` (always current) and as `{date}.png` (for historical reference).

## Technical Details

### URL Normalization

All URLs are normalized before storage to ensure consistent caching:

- **Protocol optional** — `screenshotit.app/example.com` and `screenshotit.app/https://example.com` resolve to the same screenshot and the same cache entry. HTTPS is assumed when no protocol is provided.
- Query strings stripped (avoids tracking params like `?utm_source=...`)
- Fragments stripped (don't affect rendering)
- Entire URL lowercased (most servers are case-insensitive)
- URL-decoded for readable storage keys

So `https://Example.COM/My%20Page?ref=twitter#section` becomes `https://example.com/my page`, and `Example.COM/My%20Page` produces the same result.

### Modifier System

Options are passed via `@modifier` syntax:

```
screenshotit.app/example.com@full        # Full page screenshot
screenshotit.app/example.com@mobile      # Mobile viewport (390x844)
screenshotit.app/example.com@social      # Social preview (1200x630)
screenshotit.app/example.com@refresh     # Force fresh capture
screenshotit.app/example.com@full@mobile # Combine them
```

Modifiers are sorted alphabetically in storage keys for consistency (`full-mobile`, not `mobile-full`).

### Viewport Defaults

- **Desktop**: 1280x800 at 2x scale (produces 2560x1600 PNG)
- **Mobile**: 390x844 at 2x scale (iPhone 14 dimensions)
- **Social**: 1200x630 at 2x scale (produces 2400x1260 PNG, OG standard)
- **Full page**: Captures entire scrollable height

### Social Previews

The `@social` modifier is purpose-built for Open Graph images. It captures at exactly 1200x630 — the standard used by Facebook, Twitter/X, LinkedIn, Discord, Slack, and iMessage for link previews. The 2x scale factor means the output PNG is 2400x1260, so previews render retina-sharp when platforms downscale to the display size.

Use it as a drop-in `og:image`:

```html
<meta property="og:image" content="https://screenshotit.app/yoursite.com@social">
```

Every page gets a live social preview without any image generation pipeline.

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
    social/
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

Total: ~400 lines of TypeScript, 36 tests, zero servers to manage.

---

## Tweet Options

**Option 1 — Show don't tell:**

> Just shipped screenshotit.app — screenshot any webpage by URL. No API key, no SDK, no dashboard. Just `screenshotit.app/example.com` and you get an image back. Embed it in Markdown, docs, wikis, anywhere. The URL is the API.

**Option 2 — Problem/solution:**

> Most screenshot tools need API keys, SDKs, or a dashboard. screenshotit.app needs a URL. That's it. `screenshotit.app/example.com` → screenshot. Add @full for full-page, @mobile for mobile, @social for OG images. Built on Cloudflare. ~400 lines of TypeScript.

**Option 3 — Punchy/minimal (recommended):**

> What if a screenshot was just a URL? `screenshotit.app/example.com` → image. Embed anywhere. Cached forever. No signup, no API key, no SDK. Just shipped it.
