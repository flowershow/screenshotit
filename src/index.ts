// src/index.ts
import { parseRequest, normalizeUrl, buildR2Key, Modifier } from './normalize';
import { getScreenshot, saveScreenshot, findNearestDate, ScreenshotMetadata } from './storage';
import { getViewportConfig, captureScreenshot } from './screenshot';
import { checkRefreshRateLimit, recordRefresh } from './ratelimit';
import { renderHomepage } from './homepage';

export interface Env {
  SCREENSHOTS: R2Bucket;
  BROWSER: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle root path
    if (url.pathname === '/' || url.pathname === '') {
      return new Response(renderHomepage(), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    try {
      // Parse the request
      const parsed = parseRequest(url.pathname);
      const normalizedUrl = normalizeUrl(parsed.targetUrl);
      const r2Key = buildR2Key(normalizedUrl, parsed.modifiers, parsed.date);
      const hasRefresh = parsed.modifiers.includes('refresh');

      // Dated requests are read-only lookups
      if (parsed.date) {
        // Try exact date first
        const cached = await getScreenshot(env.SCREENSHOTS, r2Key);
        if (cached) {
          return new Response(cached.data, {
            headers: {
              'Content-Type': 'image/webp',
              'Cache-Control': 'public, max-age=86400',
              'X-Screenshot-Cached': 'true',
              'X-Screenshot-Captured': cached.metadata.captured_at,
            },
          });
        }
        // Fall back to nearest earlier date
        const prefix = r2Key.substring(0, r2Key.lastIndexOf('/') + 1);
        const nearest = await findNearestDate(env.SCREENSHOTS, prefix, parsed.date);
        if (nearest) {
          const nearestKey = buildR2Key(normalizedUrl, parsed.modifiers, nearest);
          const fallback = await getScreenshot(env.SCREENSHOTS, nearestKey);
          if (fallback) {
            return new Response(fallback.data, {
              headers: {
                'Content-Type': 'image/webp',
                'Cache-Control': 'public, max-age=86400',
                'X-Screenshot-Cached': 'true',
                'X-Screenshot-Captured': fallback.metadata.captured_at,
                'X-Screenshot-Date': nearest,
              },
            });
          }
        }
        return new Response(
          `No screenshot found for ${normalizedUrl} on or before ${parsed.date}. No earlier screenshots are available for this URL.`,
          { status: 404 }
        );
      }

      // Check rate limit for refresh
      if (hasRefresh) {
        const allowed = await checkRefreshRateLimit(
          env.SCREENSHOTS,
          normalizedUrl,
          parsed.modifiers
        );
        if (!allowed) {
          return new Response('Refresh limit: once per day per URL', {
            status: 429,
          });
        }
      }

      // Check cache (unless @refresh)
      if (!hasRefresh) {
        const cached = await getScreenshot(env.SCREENSHOTS, r2Key);
        if (cached) {
          return new Response(cached.data, {
            headers: {
              'Content-Type': 'image/webp',
              'Cache-Control': 'public, max-age=86400',
              'X-Screenshot-Cached': 'true',
              'X-Screenshot-Captured': cached.metadata.captured_at,
            },
          });
        }
      }

      // Capture new screenshot
      const viewport = getViewportConfig(parsed.modifiers);
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

      // Record refresh for rate limiting
      if (hasRefresh) {
        await recordRefresh(env.SCREENSHOTS, normalizedUrl, parsed.modifiers);
      }

      // Return image
      return new Response(imageData, {
        headers: {
          'Content-Type': 'image/webp',
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
