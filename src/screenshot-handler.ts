import {
  findAccountScreenshot,
  getAccountUsage,
  recordAccountScreenshotAccess,
  upsertAccountScreenshot,
  type AccountScreenshot,
  type AccountUsage,
} from './account-screenshots';
import { parseAccountRoute } from './account-routing';
import { lookupAccountByUsername, type Account, type Session } from './accounts';
import {
  recordScreenshotAccess,
  recordScreenshotCreated,
  type AccessEventInput,
  type CreateEventInput,
} from './analytics';
import { sessionFromRequest } from './github-auth';
import {
  buildAccountR2Key,
  buildR2Key,
  normalizeUrl,
  parseRequest,
  type Modifier,
} from './normalize';
import { checkRefreshRateLimit, recordRefresh } from './ratelimit';
import { captureScreenshot, getViewportConfig } from './screenshot';
import {
  findNearestDate,
  getScreenshot,
  getScreenshotPrefixSize,
  saveScreenshot,
  type ScreenshotMetadata,
  type StoredScreenshot,
} from './storage';

export interface ScreenshotHandlerEnv {
  SCREENSHOTS: R2Bucket;
  BROWSER: Fetcher;
  ANALYTICS_DB: D1Database;
}

export interface ScreenshotHandlerDependencies {
  lookupAccount: (db: D1Database, username: string) => Promise<Account | null>;
  getRequestSession: (
    request: Request,
    env: Pick<ScreenshotHandlerEnv, 'ANALYTICS_DB'>
  ) => Promise<Session | null>;
  getStoredScreenshot: (
    bucket: R2Bucket,
    key: string
  ) => Promise<StoredScreenshot | null>;
  saveStoredScreenshot: (
    bucket: R2Bucket,
    key: string,
    image: Uint8Array,
    metadata: ScreenshotMetadata
  ) => Promise<void>;
  findNearestStoredDate: (
    bucket: R2Bucket,
    prefix: string,
    beforeDate: string
  ) => Promise<string | null>;
  capture: typeof captureScreenshot;
  checkRefresh: (
    bucket: R2Bucket,
    url: string,
    modifiers: Modifier[],
    scope?: string
  ) => Promise<boolean>;
  recordRefresh: (
    bucket: R2Bucket,
    url: string,
    modifiers: Modifier[],
    scope?: string
  ) => Promise<void>;
  getUsage: (db: D1Database, accountId: string) => Promise<AccountUsage>;
  findCatalogScreenshot: (
    db: D1Database,
    accountId: string,
    targetUrl: string,
    modifiers: string
  ) => Promise<AccountScreenshot | null>;
  upsertCatalogScreenshot: typeof upsertAccountScreenshot;
  getPrefixSize: (bucket: R2Bucket, prefix: string) => Promise<number>;
  recordAccountAccess: typeof recordAccountScreenshotAccess;
  recordAnonymousAccess: (
    db: D1Database,
    event: AccessEventInput
  ) => Promise<void>;
  recordAnonymousCreated: (
    db: D1Database,
    event: CreateEventInput
  ) => Promise<void>;
}

const defaultDependencies: ScreenshotHandlerDependencies = {
  lookupAccount: lookupAccountByUsername,
  getRequestSession: (request, env) => sessionFromRequest(request, env),
  getStoredScreenshot: getScreenshot,
  saveStoredScreenshot: saveScreenshot,
  findNearestStoredDate: findNearestDate,
  capture: captureScreenshot,
  checkRefresh: checkRefreshRateLimit,
  recordRefresh,
  getUsage: getAccountUsage,
  findCatalogScreenshot: findAccountScreenshot,
  upsertCatalogScreenshot: upsertAccountScreenshot,
  getPrefixSize: getScreenshotPrefixSize,
  recordAccountAccess: recordAccountScreenshotAccess,
  recordAnonymousAccess: recordScreenshotAccess,
  recordAnonymousCreated: recordScreenshotCreated,
};

export async function handleScreenshotRequest(
  request: Request,
  env: ScreenshotHandlerEnv,
  ctx: ExecutionContext,
  dependencies: ScreenshotHandlerDependencies = defaultDependencies
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const accountRoute = parseAccountRoute(url.pathname);
    const account = accountRoute
      ? await dependencies.lookupAccount(env.ANALYTICS_DB, accountRoute.username)
      : null;
    if (accountRoute && (!account || account.status !== 'active')) {
      return new Response('Screenshot not found', { status: 404 });
    }

    const parsed = parseRequest(accountRoute?.screenshotPath || url.pathname);
    const normalizedUrl = normalizeUrl(parsed.targetUrl);
    const buildKey = (date?: string) =>
      account
        ? buildAccountR2Key(account.id, normalizedUrl, parsed.modifiers, date)
        : buildR2Key(normalizedUrl, parsed.modifiers, date);
    const r2Key = buildKey(parsed.date);
    const hasRefresh = parsed.modifiers.includes('refresh');
    const storageModifiers = parsed.modifiers.filter((modifier) => modifier !== 'refresh');
    const modifiersString = storageModifiers.slice().sort().join(',');

    if (parsed.date) {
      const exact = await dependencies.getStoredScreenshot(env.SCREENSHOTS, r2Key);
      if (exact) {
        queueAccess(ctx, env, dependencies, account, normalizedUrl, modifiersString, buildKey(), new Date().toISOString());
        return imageResponse(exact, true);
      }
      const prefix = keyPrefix(r2Key);
      const nearest = await dependencies.findNearestStoredDate(
        env.SCREENSHOTS,
        prefix,
        parsed.date
      );
      if (nearest) {
        const fallback = await dependencies.getStoredScreenshot(
          env.SCREENSHOTS,
          buildKey(nearest)
        );
        if (fallback) {
          queueAccess(ctx, env, dependencies, account, normalizedUrl, modifiersString, buildKey(), new Date().toISOString());
          return imageResponse(fallback, true, nearest);
        }
      }
      return new Response(
        `No screenshot found for ${normalizedUrl} on or before ${parsed.date}. No earlier screenshots are available for this URL.`,
        { status: 404 }
      );
    }

    if (!hasRefresh) {
      const cached = await dependencies.getStoredScreenshot(env.SCREENSHOTS, r2Key);
      if (cached) {
        queueAccess(ctx, env, dependencies, account, normalizedUrl, modifiersString, r2Key, new Date().toISOString());
        return imageResponse(cached, true);
      }
    }

    let catalogScreenshot: AccountScreenshot | null = null;
    let usage: AccountUsage | null = null;
    if (account) {
      const session = await dependencies.getRequestSession(request, env);
      if (!session || session.accountId !== account.id) {
        return new Response('Screenshot not found', { status: 404 });
      }
      [catalogScreenshot, usage] = await Promise.all([
        dependencies.findCatalogScreenshot(
          env.ANALYTICS_DB,
          account.id,
          normalizedUrl,
          modifiersString
        ),
        dependencies.getUsage(env.ANALYTICS_DB, account.id),
      ]);
      if (!catalogScreenshot && usage.screenshotCount >= account.maxScreenshots) {
        return new Response('Account screenshot quota exceeded', { status: 429 });
      }
      if (usage.storageBytes >= account.maxStorageBytes) {
        return new Response('Account storage quota exceeded', { status: 429 });
      }
    }

    if (hasRefresh) {
      const allowed = await dependencies.checkRefresh(
        env.SCREENSHOTS,
        normalizedUrl,
        parsed.modifiers,
        account?.id
      );
      if (!allowed) {
        return new Response('Refresh limit: once per day per URL', { status: 429 });
      }
    }

    const imageData = await dependencies.capture(env.BROWSER, {
      url: normalizedUrl,
      viewport: getViewportConfig(parsed.modifiers),
    });
    if (
      account &&
      usage &&
      usage.storageBytes + imageData.byteLength * 2 > account.maxStorageBytes
    ) {
      return new Response('Account storage quota exceeded', { status: 429 });
    }

    const capturedAt = new Date().toISOString();
    const metadata: ScreenshotMetadata = {
      captured_at: capturedAt,
      target_url: normalizedUrl,
      modifiers: modifiersString,
    };
    await dependencies.saveStoredScreenshot(env.SCREENSHOTS, r2Key, imageData, metadata);

    if (account) {
      const prefix = keyPrefix(r2Key);
      const byteSize = await dependencies.getPrefixSize(env.SCREENSHOTS, prefix);
      await dependencies.upsertCatalogScreenshot(env.ANALYTICS_DB, {
        accountId: account.id,
        targetUrl: normalizedUrl,
        modifiers: modifiersString,
        r2Prefix: prefix,
        byteSize,
        capturedAt,
      });
      queueBestEffort(
        ctx,
        dependencies.recordAccountAccess(
          env.ANALYTICS_DB,
          account.id,
          normalizedUrl,
          modifiersString,
          capturedAt
        ),
        'account access'
      );
    } else {
      queueBestEffort(
        ctx,
        dependencies.recordAnonymousCreated(env.ANALYTICS_DB, {
          r2Key,
          targetUrl: normalizedUrl,
          modifiers: modifiersString,
          createdAt: capturedAt,
        }),
        'anonymous creation'
      );
      queueBestEffort(
        ctx,
        dependencies.recordAnonymousAccess(env.ANALYTICS_DB, {
          r2Key,
          targetUrl: normalizedUrl,
          modifiers: modifiersString,
          accessedAt: capturedAt,
        }),
        'anonymous access'
      );
    }

    if (hasRefresh) {
      await dependencies.recordRefresh(
        env.SCREENSHOTS,
        normalizedUrl,
        parsed.modifiers,
        account?.id
      );
    }

    return new Response(imageData, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=86400',
        'X-Screenshot-Cached': 'false',
        'X-Screenshot-Captured': capturedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (
      message.includes('Unknown modifier') ||
      message.includes('No URL') ||
      message.includes('Invalid username') ||
      message.includes('reserved')
    ) {
      return new Response(message, { status: 400 });
    }
    if (message.includes('Screenshot failed')) {
      return new Response(`Failed to capture screenshot: ${message}`, { status: 502 });
    }
    console.error(JSON.stringify({ message: 'screenshot request failed', error: message }));
    return new Response('Internal error', { status: 500 });
  }
}

function queueAccess(
  ctx: ExecutionContext,
  env: ScreenshotHandlerEnv,
  dependencies: ScreenshotHandlerDependencies,
  account: Account | null,
  targetUrl: string,
  modifiers: string,
  r2Key: string,
  accessedAt: string
): void {
  const operation = account
    ? dependencies.recordAccountAccess(
        env.ANALYTICS_DB,
        account.id,
        targetUrl,
        modifiers,
        accessedAt
      )
    : dependencies.recordAnonymousAccess(env.ANALYTICS_DB, {
        r2Key,
        targetUrl,
        modifiers,
        accessedAt,
      });
  queueBestEffort(ctx, operation, account ? 'account access' : 'anonymous access');
}

function queueBestEffort(
  ctx: ExecutionContext,
  operation: Promise<void>,
  operationName: string
): void {
  ctx.waitUntil(
    operation.catch((error) => {
      console.error(
        JSON.stringify({
          message: 'analytics operation failed',
          operation: operationName,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    })
  );
}

function keyPrefix(key: string): string {
  return key.slice(0, key.lastIndexOf('/') + 1);
}

function imageResponse(
  screenshot: StoredScreenshot,
  cached: boolean,
  date?: string
): Response {
  const headers = new Headers({
    'Content-Type': 'image/webp',
    'Cache-Control': 'public, max-age=86400',
    'X-Screenshot-Cached': String(cached),
    'X-Screenshot-Captured': screenshot.metadata.captured_at,
  });
  if (date) headers.set('X-Screenshot-Date', date);
  return new Response(screenshot.data, { headers });
}
