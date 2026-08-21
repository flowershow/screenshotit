import { describe, expect, it, vi } from 'vitest';
import {
  handleDashboardRequest,
  renderDashboard,
  type DashboardDependencies,
  type DashboardEnv,
} from './dashboard';

const session = {
  accountId: 'account-1',
  username: 'alice',
  csrfToken: 'csrf-token',
  expiresAt: '2026-08-22T00:00:00.000Z',
};

const screenshot = {
  id: 'shot-1',
  accountId: 'account-1',
  targetUrl: 'https://example.com',
  modifiers: 'full',
  r2Prefix: 'accounts/account-1/screenshots/https://example.com/full/',
  byteSize: 1234,
  accessCount: 3,
  captureCount: 2,
  createdAt: '2026-08-21T10:00:00.000Z',
  lastCapturedAt: '2026-08-21T12:00:00.000Z',
  lastAccessedAt: '2026-08-21T12:01:00.000Z',
};

const env = {
  ANALYTICS_DB: {} as D1Database,
  SCREENSHOTS: {} as R2Bucket,
  APP_ORIGIN: 'https://screenshotit.app',
} satisfies DashboardEnv;

function dependencies(
  overrides: Partial<DashboardDependencies> = {}
): DashboardDependencies {
  return {
    getRequestSession: vi.fn().mockResolvedValue(session),
    listScreenshots: vi.fn().mockResolvedValue([screenshot]),
    getUsage: vi.fn().mockResolvedValue({ screenshotCount: 1, storageBytes: 1234 }),
    getScreenshotById: vi.fn().mockResolvedValue(screenshot),
    deletePrefix: vi.fn().mockResolvedValue({ objectCount: 2, byteSize: 1234 }),
    deleteScreenshotRecord: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('account dashboard', () => {
  it('renders usage, public links, refresh, delete, and CSRF protection', () => {
    const html = renderDashboard({
      session,
      screenshots: [screenshot],
      usage: { screenshotCount: 1, storageBytes: 1234 },
    });

    expect(html).toContain('@alice');
    expect(html).toContain('/@alice/example.com@full');
    expect(html).toContain('/@alice/example.com@full@refresh');
    expect(html).toContain('name="csrf_token" value="csrf-token"');
    expect(html).toContain('1.2 KB');
  });

  it('escapes stored target URLs before rendering them', () => {
    const html = renderDashboard({
      session,
      screenshots: [{ ...screenshot, targetUrl: 'https://example.com/<script>' }],
      usage: { screenshotCount: 1, storageBytes: 1234 },
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('redirects a logged-out dashboard visitor to GitHub login', async () => {
    const response = await handleDashboardRequest(
      new Request('https://screenshotit.app/dashboard'),
      env,
      dependencies({ getRequestSession: vi.fn().mockResolvedValue(null) })
    );

    expect(response?.status).toBe(302);
    expect(response?.headers.get('Location')).toContain('/auth/github');
  });

  it('renders the dashboard for its owner', async () => {
    const response = await handleDashboardRequest(
      new Request('https://screenshotit.app/dashboard'),
      env,
      dependencies()
    );

    expect(response?.status).toBe(200);
    expect(await response?.text()).toContain('/@alice/example.com@full');
  });

  it('redirects a valid create form to the owner URL', async () => {
    const body = new URLSearchParams({
      csrf_token: 'csrf-token',
      target: 'Example.com/docs',
    });
    const response = await handleDashboardRequest(
      new Request('https://screenshotit.app/dashboard/create', {
        method: 'POST',
        headers: {
          Origin: 'https://screenshotit.app',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      }),
      env,
      dependencies()
    );

    expect(response?.status).toBe(303);
    expect(response?.headers.get('Location')).toBe(
      'https://screenshotit.app/@alice/example.com/docs'
    );
  });

  it('deletes only a screenshot owned by the session account', async () => {
    const deps = dependencies();
    const response = await handleDashboardRequest(
      new Request('https://screenshotit.app/api/screenshots/shot-1/delete', {
        method: 'POST',
        headers: {
          Origin: 'https://screenshotit.app',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ csrf_token: 'csrf-token' }),
      }),
      env,
      deps
    );

    expect(response?.status).toBe(303);
    expect(deps.deletePrefix).toHaveBeenCalledWith(
      env.SCREENSHOTS,
      screenshot.r2Prefix
    );
    expect(deps.deleteScreenshotRecord).toHaveBeenCalledWith(
      env.ANALYTICS_DB,
      'account-1',
      'shot-1'
    );
  });

  it('rejects deletion with an invalid CSRF token', async () => {
    const deps = dependencies();
    const response = await handleDashboardRequest(
      new Request('https://screenshotit.app/api/screenshots/shot-1/delete', {
        method: 'POST',
        headers: {
          Origin: 'https://screenshotit.app',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ csrf_token: 'wrong' }),
      }),
      env,
      deps
    );

    expect(response?.status).toBe(403);
    expect(deps.deletePrefix).not.toHaveBeenCalled();
  });

  it('returns 404 when the requested screenshot is not owned by the account', async () => {
    const deps = dependencies({
      getScreenshotById: vi.fn().mockResolvedValue(null),
    });
    const response = await handleDashboardRequest(
      new Request('https://screenshotit.app/api/screenshots/other/delete', {
        method: 'POST',
        headers: {
          Origin: 'https://screenshotit.app',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ csrf_token: 'csrf-token' }),
      }),
      env,
      deps
    );

    expect(response?.status).toBe(404);
  });
});
