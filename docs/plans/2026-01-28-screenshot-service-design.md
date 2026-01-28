# Screenshot Service Design

## Overview

A URL-native screenshot service where `screenshot.app/https://example.com` returns a browser screenshot of that page. Built entirely on Cloudflare infrastructure.

## Architecture

### Components

- **Cloudflare Worker** - Entry point at `screenshot.app/*`. Handles all requests.
- **Browser Rendering API** - Cloudflare's headless Chromium, called by the Worker.
- **R2 Bucket** - Stores screenshots. Private, accessed via Worker binding.

### Request Flow

```
User requests: screenshot.app/https://example.com
                      |
                      v
              Cloudflare Worker
                      |
                      v
         Check R2 for existing screenshot
                      |
              +-------+-------+
              |               |
           Found          Not Found
              |               |
              v               v
        Return image    Call Browser Rendering API
        from R2         Navigate & screenshot
                              |
                              v
                        Write to R2:
                        - latest.png
                        - {date}.png
                              |
                              v
                        Return image
```

## URL Structure

### Basic Usage

```
screenshot.app/https://example.com           -> latest screenshot
screenshot.app/https://example.com@full      -> full page screenshot
screenshot.app/https://example.com@mobile    -> mobile viewport
screenshot.app/https://example.com@refresh   -> force new screenshot
```

### Modifier Syntax

Modifiers are appended with `@` and can be chained:

```
screenshot.app/https://example.com@full@mobile
```

**Available modifiers (v1):**

| Modifier | Effect |
|----------|--------|
| `@full` | Capture full scrollable page instead of viewport |
| `@mobile` | Mobile viewport (390x844) instead of desktop |
| `@refresh` | Bypass cache, take fresh screenshot |

**Future modifiers (not in v1):**

| Modifier | Effect |
|----------|--------|
| `@YYYY-MM-DD` | Retrieve specific dated version |
| `@dark` | Force dark mode (prefers-color-scheme: dark) |
| `@1x` | Standard resolution instead of 2x retina |

Modifiers are parsed from right to left. Unknown modifiers return 400 Bad Request.

## URL Normalization

**Design decision:** All URLs are normalized before lookup and storage. This is intentional to provide "the base page" and avoid cache pollution.

**Normalization steps:**

1. Strip anchor/fragment (`#anything`)
2. Strip query string (`?anything`)
3. Add protocol if missing (default to `https://`)
4. Lowercase entire URL (hostname + path)
5. URL-decode (`%20` -> space, etc.)

**Examples:**

```
Input:  screenshot.app/https://Example.com/My%20Page?utm_source=twitter#top
Stored: screenshots/https://example.com/my page/default/latest.png

Input:  screenshot.app/example.com
Stored: screenshots/https://example.com/default/latest.png
```

**Explicit decisions:**
- Query strings are stripped (avoids tracking params, simplifies caching)
- Anchors are stripped (don't affect rendering)
- Paths are lowercased (most servers are case-insensitive in practice)
- URL encoding is resolved for readable storage keys

## R2 Storage

### Key Structure

```
screenshots/
  https://example.com/
    default/
      latest.png
      2026-01-28.png
      2026-01-15.png
    full/
      latest.png
      2026-01-28.png
    mobile/
      latest.png
    full-mobile/
      latest.png
  https://other-site.org/some/path/
    default/
      latest.png
```

Modifier combinations are sorted alphabetically in the key (`full-mobile` not `mobile-full`).

### Object Metadata

Each stored screenshot includes metadata:
- `captured_at`: ISO timestamp of capture
- `target_url`: Original normalized URL
- `modifiers`: Applied modifiers (comma-separated)

### Caching Behavior

- Screenshots are cached indefinitely by default
- `latest.png` serves the same image until explicitly refreshed
- Use `@refresh` modifier to force a new capture
- Rate limit: maximum one refresh per day per URL+modifier combination

## Browser Rendering Configuration

### Default (Desktop Viewport)

- Width: 1280px
- Height: 800px
- Device scale factor: 2x (produces 2560x1600 PNG)
- Full page: No (above-the-fold only)

### Mobile Viewport (`@mobile`)

- Width: 390px
- Height: 844px (iPhone 14 dimensions)
- Device scale factor: 2x
- Full page: No

### Full Page (`@full`)

- Same width as viewport mode
- Height: Entire scrollable page
- Device scale factor: 2x

### Page Load Strategy

1. Navigate to URL
2. Wait for `networkidle` (no network requests for 500ms)
3. Additional 500ms delay (fonts/animations settle)
4. Take screenshot

### Timeouts

- Navigation timeout: 30 seconds
- Total operation timeout: 45 seconds

### Explicit Non-Goals (v1)

- Cookie consent banner handling (would require interaction)
- Login-protected pages (public pages only)
- Custom wait selectors for SPAs

## Worker Implementation

### Project Structure

```
screenshot-worker/
  src/
    index.ts        # Main entry point, request routing
    normalize.ts    # URL normalization logic
    screenshot.ts   # Browser Rendering API calls
    storage.ts      # R2 read/write operations
  wrangler.toml     # Cloudflare config (R2 binding, Browser API)
```

### Request Handling

```
1. Parse incoming path -> extract target URL and modifiers
2. Validate modifiers (reject unknown)
3. Normalize the URL
4. Build R2 key: screenshots/{normalized-url}/{modifiers}/latest.png
5. If @refresh not present, check R2 for existing object
   - If exists -> return image with cache headers
6. Call Browser Rendering API with appropriate settings
7. Write to R2:
   - screenshots/{url}/{modifiers}/latest.png
   - screenshots/{url}/{modifiers}/{YYYY-MM-DD}.png
8. Return image to user
```

### Response Headers

- `Content-Type: image/png`
- `Cache-Control: public, max-age=86400` (adjustable)

## Error Handling

### Error Responses

| Scenario | Status | Response |
|----------|--------|----------|
| Invalid/unparseable URL | 400 | Plain text error message |
| Unknown modifier | 400 | "Unknown modifier: @foo" |
| Target site unreachable | 502 | Error image with message |
| Screenshot timeout (>45s) | 504 | Error image with message |
| Rate limited (`@refresh`) | 429 | "Refresh limit: once per day" |

### Error Images

For 502/504 errors, return a generated error image (gray background with explanatory text) rather than plain text. This ensures embeds display something rather than a broken image icon.

### Logging

Worker logs capture:
- Target URL
- Modifiers requested
- Success/failure
- Duration (ms)
- Error details (if failed)

Failed attempts are not stored in R2.

## Future Considerations

These are explicitly out of scope for v1 but may be added later:

- **Date-based retrieval** (`@YYYY-MM-DD`): Exact match lookup of historical screenshots
- **"Closest before" date semantics**: Find nearest screenshot before a given date
- **Dark mode** (`@dark`): Force prefers-color-scheme: dark
- **Resolution options** (`@1x`): Smaller file sizes
- **R2 public domain redirect**: For high-traffic optimization, redirect to public R2 CDN instead of streaming through Worker
- **Query string support**: For pages where query strings affect content
