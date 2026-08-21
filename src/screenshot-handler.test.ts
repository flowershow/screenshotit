import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleScreenshotRequest,
  type ScreenshotHandlerDependencies,
  type ScreenshotHandlerEnv,
} from './screenshot-handler';

const account = {
  id: 'account-1',
  username: 'alice',
  status: 'active',
  maxScreenshots: 100,
  maxStorageBytes: 1_000_000,
};

const ownerSession = {
  accountId: 'account-1',
  username: 'alice',
  csrfToken: 'csrf',
  expiresAt: '2026-08-22T00:00:00.000Z',
};

const env = {
  SCREENSHOTS: {} as R2Bucket,
  BROWSER: {} as Fetcher,
  ANALYTICS_DB: {} as D1Database,
} satisfies ScreenshotHandlerEnv;

const context = { waitUntil: vi.fn() } as unknown as ExecutionContext;

function storedScreenshot() {
  return {
    data: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.close();
      },
    }),
    metadata: {
      captured_at: '2026-08-21T12:00:00.000Z',
      target_url: 'https://example.com',
      modifiers: '',
    },
  };
}

function dependencies(
  overrides: Partial<ScreenshotHandlerDependencies> = {}
): ScreenshotHandlerDependencies {
  return {
    lookupAccount: vi.fn().mockResolvedValue(account),
    getRequestSession: vi.fn().mockResolvedValue(null),
    getStoredScreenshot: vi.fn().mockResolvedValue(null),
    saveStoredScreenshot: vi.fn().mockResolvedValue(undefined),
    findNearestStoredDate: vi.fn().mockResolvedValue(null),
    capture: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    checkRefresh: vi.fn().mockResolvedValue(true),
    recordRefresh: vi.fn().mockResolvedValue(undefined),
    getUsage: vi.fn().mockResolvedValue({ screenshotCount: 0, storageBytes: 0 }),
    findCatalogScreenshot: vi.fn().mockResolvedValue(null),
    upsertCatalogScreenshot: vi.fn().mockResolvedValue('shot-1'),
    getPrefixSize: vi.fn().mockResolvedValue(6),
    recordAccountAccess: vi.fn().mockResolvedValue(undefined),
    recordAnonymousAccess: vi.fn().mockResolvedValue(undefined),
    recordAnonymousCreated: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('screenshot request ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serves an existing account screenshot publicly', async () => {
    const deps = dependencies({
      getStoredScreenshot: vi.fn().mockResolvedValue(storedScreenshot()),
    });

    const response = await handleScreenshotRequest(
      new Request('https://screenshotit.app/@alice/example.com'),
      env,
      context,
      deps
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Screenshot-Cached')).toBe('true');
    expect(deps.getRequestSession).not.toHaveBeenCalled();
    expect(deps.getStoredScreenshot).toHaveBeenCalledWith(
      env.SCREENSHOTS,
      'accounts/account-1/screenshots/https://example.com/default/latest.webp'
    );
  });

  it('does not let a public reader create a missing account screenshot', async () => {
    const deps = dependencies();
    const response = await handleScreenshotRequest(
      new Request('https://screenshotit.app/@alice/example.com'),
      env,
      context,
      deps
    );

    expect(response.status).toBe(404);
    expect(deps.capture).not.toHaveBeenCalled();
  });

  it('lets the owner create a missing account screenshot', async () => {
    const deps = dependencies({
      getRequestSession: vi.fn().mockResolvedValue(ownerSession),
    });
    const response = await handleScreenshotRequest(
      new Request('https://screenshotit.app/@alice/example.com@full'),
      env,
      context,
      deps
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Screenshot-Cached')).toBe('false');
    expect(deps.saveStoredScreenshot).toHaveBeenCalledWith(
      env.SCREENSHOTS,
      'accounts/account-1/screenshots/https://example.com/full/latest.webp',
      expect.any(Uint8Array),
      expect.any(Object)
    );
    expect(deps.upsertCatalogScreenshot).toHaveBeenCalledWith(
      env.ANALYTICS_DB,
      expect.objectContaining({ accountId: 'account-1', byteSize: 6 })
    );
  });

  it('requires the owner session for account refresh', async () => {
    const deps = dependencies({
      getStoredScreenshot: vi.fn().mockResolvedValue(storedScreenshot()),
    });
    const response = await handleScreenshotRequest(
      new Request('https://screenshotit.app/@alice/example.com@refresh'),
      env,
      context,
      deps
    );

    expect(response.status).toBe(404);
    expect(deps.capture).not.toHaveBeenCalled();
  });

  it('scopes owner refresh rate limiting by account id', async () => {
    const deps = dependencies({
      getRequestSession: vi.fn().mockResolvedValue(ownerSession),
    });
    await handleScreenshotRequest(
      new Request('https://screenshotit.app/@alice/example.com@refresh'),
      env,
      context,
      deps
    );

    expect(deps.checkRefresh).toHaveBeenCalledWith(
      env.SCREENSHOTS,
      'https://example.com',
      ['refresh'],
      'account-1'
    );
  });

  it('returns 404 for an unknown username', async () => {
    const deps = dependencies({ lookupAccount: vi.fn().mockResolvedValue(null) });
    const response = await handleScreenshotRequest(
      new Request('https://screenshotit.app/@missing/example.com'),
      env,
      context,
      deps
    );

    expect(response.status).toBe(404);
  });

  it('rejects a new screenshot when the account count quota is exhausted', async () => {
    const deps = dependencies({
      getRequestSession: vi.fn().mockResolvedValue(ownerSession),
      getUsage: vi.fn().mockResolvedValue({
        screenshotCount: account.maxScreenshots,
        storageBytes: 0,
      }),
    });
    const response = await handleScreenshotRequest(
      new Request('https://screenshotit.app/@alice/example.com'),
      env,
      context,
      deps
    );

    expect(response.status).toBe(429);
    expect(await response.text()).toContain('quota');
    expect(deps.capture).not.toHaveBeenCalled();
  });

  it('preserves anonymous creation behavior', async () => {
    const deps = dependencies();
    const response = await handleScreenshotRequest(
      new Request('https://screenshotit.app/example.com'),
      env,
      context,
      deps
    );

    expect(response.status).toBe(200);
    expect(deps.lookupAccount).not.toHaveBeenCalled();
    expect(deps.saveStoredScreenshot).toHaveBeenCalledWith(
      env.SCREENSHOTS,
      'screenshots/https://example.com/default/latest.webp',
      expect.any(Uint8Array),
      expect.any(Object)
    );
  });
});
