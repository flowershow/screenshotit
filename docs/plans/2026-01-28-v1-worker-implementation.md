# Screenshot Worker v1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Cloudflare Worker that takes screenshots of URLs and caches them in R2.

**Architecture:** Worker receives requests at `/*`, parses the target URL and modifiers, checks R2 for cached screenshots, captures new ones via Browser Rendering API if needed, stores in R2, and returns the image.

**Tech Stack:** Cloudflare Workers, Browser Rendering API, R2, TypeScript, Vitest

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `wrangler.toml`
- Create: `vitest.config.ts`
- Create: `src/index.ts` (minimal)

**Step 1: Initialize package.json**

```json
{
  "name": "screenshot-worker",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240117.0",
    "typescript": "^5.3.3",
    "vitest": "^1.2.0",
    "wrangler": "^3.25.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create wrangler.toml**

```toml
name = "screenshot-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "development"

[[r2_buckets]]
binding = "SCREENSHOTS"
bucket_name = "screenshots"

[browser]
binding = "BROWSER"
```

**Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

**Step 5: Create minimal src/index.ts**

```typescript
export interface Env {
  SCREENSHOTS: R2Bucket;
  BROWSER: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response('Screenshot service running');
  },
};
```

**Step 6: Install dependencies**

Run: `npm install`
Expected: Dependencies installed, node_modules created

**Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Cloudflare Worker project"
```

---

## Task 2: URL Normalization Module

**Files:**
- Create: `src/normalize.ts`
- Create: `src/normalize.test.ts`

**Step 1: Write failing tests for parseRequest**

```typescript
// src/normalize.test.ts
import { describe, it, expect } from 'vitest';
import { parseRequest, normalizeUrl, ParsedRequest } from './normalize';

describe('parseRequest', () => {
  it('extracts URL from path', () => {
    const result = parseRequest('/https://example.com');
    expect(result.targetUrl).toBe('https://example.com');
    expect(result.modifiers).toEqual([]);
  });

  it('extracts modifiers from URL', () => {
    const result = parseRequest('/https://example.com@full@mobile');
    expect(result.targetUrl).toBe('https://example.com');
    expect(result.modifiers).toEqual(['full', 'mobile']);
  });

  it('handles URL without protocol', () => {
    const result = parseRequest('/example.com');
    expect(result.targetUrl).toBe('example.com');
  });

  it('rejects unknown modifiers', () => {
    expect(() => parseRequest('/https://example.com@unknown')).toThrow(
      'Unknown modifier: @unknown'
    );
  });

  it('handles refresh modifier', () => {
    const result = parseRequest('/https://example.com@refresh');
    expect(result.modifiers).toEqual(['refresh']);
  });

  it('handles empty path', () => {
    expect(() => parseRequest('/')).toThrow('No URL provided');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL - module not found

**Step 3: Implement parseRequest**

```typescript
// src/normalize.ts
const VALID_MODIFIERS = ['full', 'mobile', 'refresh'] as const;
type Modifier = (typeof VALID_MODIFIERS)[number];

export interface ParsedRequest {
  targetUrl: string;
  modifiers: Modifier[];
}

export function parseRequest(path: string): ParsedRequest {
  // Remove leading slash
  let urlPart = path.startsWith('/') ? path.slice(1) : path;

  if (!urlPart) {
    throw new Error('No URL provided');
  }

  // Extract modifiers from the end
  const modifiers: Modifier[] = [];
  const parts = urlPart.split('@');
  urlPart = parts[0];

  for (let i = 1; i < parts.length; i++) {
    const mod = parts[i].toLowerCase();
    if (!VALID_MODIFIERS.includes(mod as Modifier)) {
      throw new Error(`Unknown modifier: @${parts[i]}`);
    }
    modifiers.push(mod as Modifier);
  }

  return {
    targetUrl: urlPart,
    modifiers,
  };
}
```

**Step 4: Run tests to verify parseRequest passes**

Run: `npm test`
Expected: parseRequest tests PASS

**Step 5: Write failing tests for normalizeUrl**

Add to `src/normalize.test.ts`:

```typescript
describe('normalizeUrl', () => {
  it('adds https protocol if missing', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
  });

  it('preserves existing https', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('preserves existing http', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('lowercases hostname', () => {
    expect(normalizeUrl('https://EXAMPLE.COM')).toBe('https://example.com');
  });

  it('lowercases path', () => {
    expect(normalizeUrl('https://example.com/Page')).toBe(
      'https://example.com/page'
    );
  });

  it('strips query string', () => {
    expect(normalizeUrl('https://example.com?foo=bar')).toBe(
      'https://example.com'
    );
  });

  it('strips fragment', () => {
    expect(normalizeUrl('https://example.com#section')).toBe(
      'https://example.com'
    );
  });

  it('strips both query and fragment', () => {
    expect(normalizeUrl('https://example.com/page?q=1#top')).toBe(
      'https://example.com/page'
    );
  });

  it('decodes URL-encoded characters', () => {
    expect(normalizeUrl('https://example.com/my%20page')).toBe(
      'https://example.com/my page'
    );
  });

  it('handles complex URL', () => {
    expect(
      normalizeUrl('https://Example.COM/My%20Page?utm_source=twitter#section')
    ).toBe('https://example.com/my page');
  });
});
```

**Step 6: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL - normalizeUrl not exported

**Step 7: Implement normalizeUrl**

Add to `src/normalize.ts`:

```typescript
export function normalizeUrl(url: string): string {
  // Add protocol if missing
  let fullUrl = url;
  if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
    fullUrl = 'https://' + fullUrl;
  }

  // Parse the URL
  const parsed = new URL(fullUrl);

  // Reconstruct without query/fragment, lowercase everything
  const protocol = parsed.protocol;
  const hostname = parsed.hostname.toLowerCase();
  const port = parsed.port ? `:${parsed.port}` : '';
  const pathname = decodeURIComponent(parsed.pathname).toLowerCase();

  return `${protocol}//${hostname}${port}${pathname}`;
}
```

**Step 8: Run tests to verify all pass**

Run: `npm test`
Expected: All tests PASS

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: add URL parsing and normalization"
```

---

## Task 3: R2 Key Generation

**Files:**
- Modify: `src/normalize.ts`
- Modify: `src/normalize.test.ts`

**Step 1: Write failing tests for buildR2Key**

Add to `src/normalize.test.ts`:

```typescript
import { parseRequest, normalizeUrl, buildR2Key } from './normalize';

describe('buildR2Key', () => {
  it('builds key for default modifiers', () => {
    expect(buildR2Key('https://example.com', [])).toBe(
      'screenshots/https://example.com/default/latest.png'
    );
  });

  it('builds key with single modifier', () => {
    expect(buildR2Key('https://example.com', ['full'])).toBe(
      'screenshots/https://example.com/full/latest.png'
    );
  });

  it('builds key with multiple modifiers sorted', () => {
    expect(buildR2Key('https://example.com', ['mobile', 'full'])).toBe(
      'screenshots/https://example.com/full-mobile/latest.png'
    );
  });

  it('excludes refresh from key', () => {
    expect(buildR2Key('https://example.com', ['refresh', 'full'])).toBe(
      'screenshots/https://example.com/full/latest.png'
    );
  });

  it('builds dated key', () => {
    expect(buildR2Key('https://example.com', [], '2026-01-28')).toBe(
      'screenshots/https://example.com/default/2026-01-28.png'
    );
  });

  it('handles URL with path', () => {
    expect(buildR2Key('https://example.com/some/page', [])).toBe(
      'screenshots/https://example.com/some/page/default/latest.png'
    );
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL - buildR2Key not exported

**Step 3: Implement buildR2Key**

Add to `src/normalize.ts`:

```typescript
export function buildR2Key(
  normalizedUrl: string,
  modifiers: Modifier[],
  date?: string
): string {
  // Filter out refresh (it's not part of the storage key)
  const storageModifiers = modifiers.filter((m) => m !== 'refresh');

  // Sort modifiers alphabetically for consistent keys
  const modifierPart =
    storageModifiers.length > 0
      ? storageModifiers.sort().join('-')
      : 'default';

  const filename = date ? `${date}.png` : 'latest.png';

  return `screenshots/${normalizedUrl}/${modifierPart}/${filename}`;
}
```

**Step 4: Run tests to verify all pass**

Run: `npm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add R2 key generation"
```

---

## Task 4: Storage Module

**Files:**
- Create: `src/storage.ts`
- Create: `src/storage.test.ts`

**Step 1: Write failing tests for storage functions**

```typescript
// src/storage.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getScreenshot, saveScreenshot, ScreenshotMetadata } from './storage';

describe('storage', () => {
  let mockBucket: {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockBucket = {
      get: vi.fn(),
      put: vi.fn(),
    };
  });

  describe('getScreenshot', () => {
    it('returns null when object does not exist', async () => {
      mockBucket.get.mockResolvedValue(null);
      const result = await getScreenshot(
        mockBucket as unknown as R2Bucket,
        'screenshots/example/default/latest.png'
      );
      expect(result).toBeNull();
    });

    it('returns image data when object exists', async () => {
      const mockBody = new Uint8Array([1, 2, 3]);
      mockBucket.get.mockResolvedValue({
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(mockBody);
            controller.close();
          },
        }),
        customMetadata: { captured_at: '2026-01-28T12:00:00Z' },
      });

      const result = await getScreenshot(
        mockBucket as unknown as R2Bucket,
        'screenshots/example/default/latest.png'
      );

      expect(result).not.toBeNull();
      expect(mockBucket.get).toHaveBeenCalledWith(
        'screenshots/example/default/latest.png'
      );
    });
  });

  describe('saveScreenshot', () => {
    it('saves to both latest and dated paths', async () => {
      mockBucket.put.mockResolvedValue({});
      const imageData = new Uint8Array([1, 2, 3]);
      const metadata: ScreenshotMetadata = {
        captured_at: '2026-01-28T12:00:00Z',
        target_url: 'https://example.com',
        modifiers: '',
      };

      await saveScreenshot(
        mockBucket as unknown as R2Bucket,
        'screenshots/https://example.com/default/latest.png',
        imageData,
        metadata
      );

      expect(mockBucket.put).toHaveBeenCalledTimes(2);
      expect(mockBucket.put).toHaveBeenCalledWith(
        'screenshots/https://example.com/default/latest.png',
        imageData,
        expect.objectContaining({ customMetadata: metadata })
      );
      expect(mockBucket.put).toHaveBeenCalledWith(
        expect.stringContaining('screenshots/https://example.com/default/2026-01-28.png'),
        imageData,
        expect.objectContaining({ customMetadata: metadata })
      );
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL - module not found

**Step 3: Implement storage module**

```typescript
// src/storage.ts
export interface ScreenshotMetadata {
  captured_at: string;
  target_url: string;
  modifiers: string;
}

export interface StoredScreenshot {
  data: ReadableStream;
  metadata: ScreenshotMetadata;
}

export async function getScreenshot(
  bucket: R2Bucket,
  key: string
): Promise<StoredScreenshot | null> {
  const object = await bucket.get(key);
  if (!object) {
    return null;
  }

  return {
    data: object.body,
    metadata: object.customMetadata as unknown as ScreenshotMetadata,
  };
}

export async function saveScreenshot(
  bucket: R2Bucket,
  latestKey: string,
  imageData: Uint8Array,
  metadata: ScreenshotMetadata
): Promise<void> {
  const options = {
    customMetadata: metadata,
    httpMetadata: {
      contentType: 'image/png',
    },
  };

  // Save to latest
  await bucket.put(latestKey, imageData, options);

  // Save to dated version
  const today = metadata.captured_at.split('T')[0];
  const datedKey = latestKey.replace('latest.png', `${today}.png`);
  await bucket.put(datedKey, imageData, options);
}
```

**Step 4: Run tests to verify all pass**

Run: `npm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add R2 storage module"
```

---

## Task 5: Screenshot Module

**Files:**
- Create: `src/screenshot.ts`
- Create: `src/screenshot.test.ts`

**Step 1: Write tests for getViewportConfig**

```typescript
// src/screenshot.test.ts
import { describe, it, expect } from 'vitest';
import { getViewportConfig, ViewportConfig } from './screenshot';

describe('getViewportConfig', () => {
  it('returns desktop config by default', () => {
    const config = getViewportConfig([]);
    expect(config.width).toBe(1280);
    expect(config.height).toBe(800);
    expect(config.deviceScaleFactor).toBe(2);
    expect(config.fullPage).toBe(false);
  });

  it('returns mobile config with mobile modifier', () => {
    const config = getViewportConfig(['mobile']);
    expect(config.width).toBe(390);
    expect(config.height).toBe(844);
  });

  it('sets fullPage with full modifier', () => {
    const config = getViewportConfig(['full']);
    expect(config.fullPage).toBe(true);
    expect(config.width).toBe(1280);
  });

  it('combines mobile and full', () => {
    const config = getViewportConfig(['mobile', 'full']);
    expect(config.width).toBe(390);
    expect(config.fullPage).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL - module not found

**Step 3: Implement viewport config**

```typescript
// src/screenshot.ts
export interface ViewportConfig {
  width: number;
  height: number;
  deviceScaleFactor: number;
  fullPage: boolean;
}

type Modifier = 'full' | 'mobile' | 'refresh';

export function getViewportConfig(modifiers: Modifier[]): ViewportConfig {
  const isMobile = modifiers.includes('mobile');
  const isFullPage = modifiers.includes('full');

  return {
    width: isMobile ? 390 : 1280,
    height: isMobile ? 844 : 800,
    deviceScaleFactor: 2,
    fullPage: isFullPage,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 5: Add captureScreenshot function**

Add to `src/screenshot.ts`:

```typescript
export interface CaptureOptions {
  url: string;
  viewport: ViewportConfig;
}

export async function captureScreenshot(
  browser: Fetcher,
  options: CaptureOptions
): Promise<Uint8Array> {
  // Cloudflare Browser Rendering API endpoint
  const browserEndpoint = 'https://browser.cloudflare.com';

  const response = await browser.fetch(browserEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: options.url,
      viewport: {
        width: options.viewport.width,
        height: options.viewport.height,
        deviceScaleFactor: options.viewport.deviceScaleFactor,
      },
      screenshotOptions: {
        type: 'png',
        fullPage: options.viewport.fullPage,
      },
      waitUntil: 'networkidle0',
      timeout: 30000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Screenshot failed: ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
```

Note: The exact Browser Rendering API interface may need adjustment based on Cloudflare's current documentation. This is a reasonable starting point.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add screenshot capture module"
```

---

## Task 6: Main Request Handler

**Files:**
- Modify: `src/index.ts`

**Step 1: Implement the full request handler**

```typescript
// src/index.ts
import { parseRequest, normalizeUrl, buildR2Key } from './normalize';
import { getScreenshot, saveScreenshot, ScreenshotMetadata } from './storage';
import { getViewportConfig, captureScreenshot } from './screenshot';

export interface Env {
  SCREENSHOTS: R2Bucket;
  BROWSER: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle root path
    if (url.pathname === '/' || url.pathname === '') {
      return new Response(
        'Screenshot Service\n\nUsage: /<url> or /<url>@modifier\n\nModifiers: @full, @mobile, @refresh',
        { status: 200 }
      );
    }

    try {
      // Parse the request
      const parsed = parseRequest(url.pathname);
      const normalizedUrl = normalizeUrl(parsed.targetUrl);
      const r2Key = buildR2Key(normalizedUrl, parsed.modifiers as any);
      const hasRefresh = parsed.modifiers.includes('refresh' as any);

      // Check cache (unless @refresh)
      if (!hasRefresh) {
        const cached = await getScreenshot(env.SCREENSHOTS, r2Key);
        if (cached) {
          return new Response(cached.data, {
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=86400',
              'X-Screenshot-Cached': 'true',
              'X-Screenshot-Captured': cached.metadata.captured_at,
            },
          });
        }
      }

      // Capture new screenshot
      const viewport = getViewportConfig(parsed.modifiers as any);
      const imageData = await captureScreenshot(env.BROWSER, {
        url: normalizedUrl,
        viewport,
      });

      // Prepare metadata
      const metadata: ScreenshotMetadata = {
        captured_at: new Date().toISOString(),
        target_url: normalizedUrl,
        modifiers: parsed.modifiers.filter((m) => m !== 'refresh').join(','),
      };

      // Save to R2
      await saveScreenshot(env.SCREENSHOTS, r2Key, imageData, metadata);

      // Return image
      return new Response(imageData, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
          'X-Screenshot-Cached': 'false',
          'X-Screenshot-Captured': metadata.captured_at,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Return appropriate error
      if (message.includes('Unknown modifier') || message.includes('No URL')) {
        return new Response(message, { status: 400 });
      }

      if (message.includes('Screenshot failed')) {
        return new Response(`Failed to capture screenshot: ${message}`, {
          status: 502,
        });
      }

      return new Response(`Internal error: ${message}`, { status: 500 });
    }
  },
};
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: implement main request handler"
```

---

## Task 7: Rate Limiting for Refresh

**Files:**
- Create: `src/ratelimit.ts`
- Create: `src/ratelimit.test.ts`
- Modify: `src/index.ts`

**Step 1: Write failing tests for rate limiting**

```typescript
// src/ratelimit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRefreshRateLimit, recordRefresh } from './ratelimit';

describe('rate limiting', () => {
  let mockBucket: {
    head: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockBucket = {
      head: vi.fn(),
      put: vi.fn(),
    };
  });

  describe('checkRefreshRateLimit', () => {
    it('allows refresh when no previous refresh today', async () => {
      mockBucket.head.mockResolvedValue(null);
      const allowed = await checkRefreshRateLimit(
        mockBucket as unknown as R2Bucket,
        'https://example.com',
        ['full']
      );
      expect(allowed).toBe(true);
    });

    it('blocks refresh when already refreshed today', async () => {
      mockBucket.head.mockResolvedValue({ key: 'exists' });
      const allowed = await checkRefreshRateLimit(
        mockBucket as unknown as R2Bucket,
        'https://example.com',
        ['full']
      );
      expect(allowed).toBe(false);
    });
  });

  describe('recordRefresh', () => {
    it('records refresh with correct key', async () => {
      mockBucket.put.mockResolvedValue({});
      await recordRefresh(
        mockBucket as unknown as R2Bucket,
        'https://example.com',
        ['full']
      );
      expect(mockBucket.put).toHaveBeenCalledWith(
        expect.stringContaining('ratelimit/'),
        '',
        expect.any(Object)
      );
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL - module not found

**Step 3: Implement rate limiting**

```typescript
// src/ratelimit.ts
type Modifier = 'full' | 'mobile' | 'refresh';

function getRateLimitKey(url: string, modifiers: Modifier[]): string {
  const today = new Date().toISOString().split('T')[0];
  const modifierPart =
    modifiers.filter((m) => m !== 'refresh').sort().join('-') || 'default';
  return `ratelimit/${today}/${url}/${modifierPart}`;
}

export async function checkRefreshRateLimit(
  bucket: R2Bucket,
  url: string,
  modifiers: Modifier[]
): Promise<boolean> {
  const key = getRateLimitKey(url, modifiers);
  const existing = await bucket.head(key);
  return existing === null;
}

export async function recordRefresh(
  bucket: R2Bucket,
  url: string,
  modifiers: Modifier[]
): Promise<void> {
  const key = getRateLimitKey(url, modifiers);
  // Store empty object, just need the key to exist
  // Auto-expires after 1 day
  await bucket.put(key, '', {
    customMetadata: { recorded_at: new Date().toISOString() },
  });
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 5: Integrate rate limiting into index.ts**

Update `src/index.ts` to add rate limiting check:

```typescript
// Add import at top
import { checkRefreshRateLimit, recordRefresh } from './ratelimit';

// In the fetch handler, after parsing and before capture:
// Check rate limit for refresh
if (hasRefresh) {
  const allowed = await checkRefreshRateLimit(
    env.SCREENSHOTS,
    normalizedUrl,
    parsed.modifiers as any
  );
  if (!allowed) {
    return new Response('Refresh limit: once per day per URL', {
      status: 429,
    });
  }
}

// After saving screenshot, record the refresh:
if (hasRefresh) {
  await recordRefresh(env.SCREENSHOTS, normalizedUrl, parsed.modifiers as any);
}
```

**Step 6: Run tests to verify all pass**

Run: `npm test`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add rate limiting for refresh modifier"
```

---

## Task 8: Local Development Setup

**Files:**
- Modify: `wrangler.toml`

**Step 1: Update wrangler.toml for local dev**

```toml
name = "screenshot-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "development"

[[r2_buckets]]
binding = "SCREENSHOTS"
bucket_name = "screenshots"
preview_bucket_name = "screenshots-dev"

# Browser Rendering requires paid Workers plan
# For local dev, you may need to mock this or use production
[browser]
binding = "BROWSER"

[dev]
port = 8787
local_protocol = "http"
```

**Step 2: Create R2 buckets (requires wrangler login)**

Run: `npx wrangler r2 bucket create screenshots-dev`
Expected: Bucket created (or instructions if not logged in)

**Step 3: Test local dev server**

Run: `npm run dev`
Expected: Server starts on localhost:8787

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: configure local development"
```

---

## Task 9: Integration Test with Real Browser API

This task requires a Cloudflare account with Browser Rendering enabled.

**Step 1: Deploy to Cloudflare**

Run: `npx wrangler deploy`
Expected: Worker deployed, URL provided

**Step 2: Test basic screenshot**

Run: `curl -I https://your-worker.workers.dev/https://example.com`
Expected: 200 OK, Content-Type: image/png

**Step 3: Test with modifiers**

Run: `curl -I https://your-worker.workers.dev/https://example.com@full`
Expected: 200 OK

**Step 4: Test cache hit**

Run: `curl -I https://your-worker.workers.dev/https://example.com`
Expected: X-Screenshot-Cached: true

**Step 5: Test rate limiting**

Run: `curl -I https://your-worker.workers.dev/https://example.com@refresh` (twice)
Expected: First returns 200, second returns 429

---

## Summary

After completing all tasks, you will have:

1. A Cloudflare Worker that accepts URLs and returns screenshots
2. R2 storage for cached screenshots with latest + dated versions
3. URL normalization (strips query/fragment, lowercases, decodes)
4. Modifier support (@full, @mobile, @refresh)
5. Rate limiting for refresh (once per day)
6. Proper error handling

**Not included in v1 (future work):**
- Date-based retrieval (@YYYY-MM-DD)
- Error images (currently returns text errors)
- Dark mode (@dark)
- Resolution options (@1x)
