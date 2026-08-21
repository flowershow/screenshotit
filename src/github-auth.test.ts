import { describe, expect, it, vi } from 'vitest';
import {
  buildGithubAuthorizationUrl,
  exchangeGithubCode,
  fetchGithubUser,
  handleAuthRequest,
  type GithubAuthDependencies,
  type GithubAuthEnv,
} from './github-auth';

const env = {
  ANALYTICS_DB: {} as D1Database,
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  APP_ORIGIN: 'https://screenshotit.app',
  SESSION_MAX_AGE_SECONDS: '3600',
} satisfies GithubAuthEnv;

function dependencies(
  overrides: Partial<GithubAuthDependencies> = {}
): GithubAuthDependencies {
  return {
    fetcher: vi.fn(),
    storeOAuthState: vi.fn().mockResolvedValue(undefined),
    consumeOAuthState: vi.fn().mockResolvedValue('/dashboard'),
    provisionAccount: vi.fn().mockResolvedValue({
      id: 'account-1',
      username: 'alice',
      status: 'active',
    }),
    createAccountSession: vi.fn().mockResolvedValue({
      token: 'session-token',
      session: {
        accountId: 'account-1',
        username: '',
        csrfToken: 'csrf',
        expiresAt: '2026-08-22T00:00:00.000Z',
      },
    }),
    getAccountSession: vi.fn().mockResolvedValue(null),
    deleteAccountSession: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('GitHub OAuth', () => {
  it('builds the GitHub authorization URL', () => {
    const url = new URL(
      buildGithubAuthorizationUrl(
        'client-id',
        'https://screenshotit.app/auth/github/callback',
        'state-token'
      )
    );

    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('scope')).toBe('read:user');
    expect(url.searchParams.get('state')).toBe('state-token');
  });

  it('starts login with persisted state and a browser-bound state cookie', async () => {
    const deps = dependencies();
    const response = await handleAuthRequest(
      new Request('https://screenshotit.app/auth/github?return_to=%2Fdashboard'),
      env,
      deps
    );

    expect(response?.status).toBe(302);
    expect(response?.headers.get('Location')).toContain(
      'https://github.com/login/oauth/authorize'
    );
    expect(response?.headers.get('Set-Cookie')).toContain(
      'screenshotit_oauth_state='
    );
    expect(deps.storeOAuthState).toHaveBeenCalledOnce();
  });

  it('rejects a callback whose state does not match the browser cookie', async () => {
    const deps = dependencies();
    const response = await handleAuthRequest(
      new Request(
        'https://screenshotit.app/auth/github/callback?code=code&state=query-state',
        { headers: { Cookie: 'screenshotit_oauth_state=cookie-state' } }
      ),
      env,
      deps
    );

    expect(response?.status).toBe(302);
    expect(response?.headers.get('Location')).toContain('auth_error=invalid_state');
    expect(deps.fetcher).not.toHaveBeenCalled();
  });

  it('returns null when GitHub rejects the code exchange', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('denied', { status: 401 }));

    await expect(
      exchangeGithubCode('code', env, fetcher)
    ).resolves.toBeNull();
  });

  it('validates the GitHub user payload', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({ id: 42, login: 'Alice' })
    );

    await expect(fetchGithubUser('access-token', fetcher)).resolves.toEqual({
      providerUserId: '42',
      login: 'Alice',
    });
  });

  it('creates an account session after a valid callback', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: 'access-token' }))
      .mockResolvedValueOnce(Response.json({ id: 42, login: 'Alice' }));
    const deps = dependencies({ fetcher });
    const response = await handleAuthRequest(
      new Request(
        'https://screenshotit.app/auth/github/callback?code=code&state=state-token',
        { headers: { Cookie: 'screenshotit_oauth_state=state-token' } }
      ),
      env,
      deps
    );

    expect(response?.status).toBe(302);
    expect(response?.headers.get('Location')).toBe('https://screenshotit.app/dashboard');
    expect(response?.headers.get('Set-Cookie')).toContain(
      'screenshotit_session=session-token'
    );
    expect(deps.provisionAccount).toHaveBeenCalledWith(env.ANALYTICS_DB, {
      providerUserId: '42',
      login: 'Alice',
    });
  });

  it('logs out by deleting the server session and expiring the cookie', async () => {
    const deps = dependencies();
    const response = await handleAuthRequest(
      new Request('https://screenshotit.app/auth/logout', {
        method: 'POST',
        headers: { Cookie: 'screenshotit_session=session-token' },
      }),
      env,
      deps
    );

    expect(deps.deleteAccountSession).toHaveBeenCalledWith(
      env.ANALYTICS_DB,
      'session-token'
    );
    expect(response?.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  it('returns the current account from the session API', async () => {
    const deps = dependencies({
      getAccountSession: vi.fn().mockResolvedValue({
        accountId: 'account-1',
        username: 'alice',
        csrfToken: 'csrf',
        expiresAt: '2026-08-22T00:00:00.000Z',
      }),
    });
    const response = await handleAuthRequest(
      new Request('https://screenshotit.app/api/me', {
        headers: { Cookie: 'screenshotit_session=session-token' },
      }),
      env,
      deps
    );

    expect(response?.status).toBe(200);
    await expect(response?.json()).resolves.toEqual({
      accountId: 'account-1',
      username: 'alice',
    });
  });

  it('returns null for routes outside the auth API', async () => {
    await expect(
      handleAuthRequest(
        new Request('https://screenshotit.app/example.com'),
        env,
        dependencies()
      )
    ).resolves.toBeNull();
  });
});
