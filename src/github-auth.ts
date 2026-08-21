import {
  createSession,
  deleteSession,
  getSession,
  provisionGithubAccount,
  type Account,
  type Session,
} from './accounts';
import {
  SESSION_COOKIE,
  generateToken,
  hashToken,
  parseCookieHeader,
  safeReturnTo,
  serializeExpiredSessionCookie,
  serializeSessionCookie,
  tokensEqual,
} from './auth';

const OAUTH_STATE_COOKIE = 'screenshotit_oauth_state';
const OAUTH_STATE_MAX_AGE_SECONDS = 600;

export interface GithubAuthEnv {
  ANALYTICS_DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  APP_ORIGIN: string;
  SESSION_MAX_AGE_SECONDS?: string;
}

export interface GithubIdentity {
  providerUserId: string;
  login: string;
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface GithubAuthDependencies {
  fetcher: Fetcher;
  storeOAuthState: (
    db: D1Database,
    state: string,
    returnTo: string,
    now?: Date
  ) => Promise<void>;
  consumeOAuthState: (
    db: D1Database,
    state: string,
    now?: Date
  ) => Promise<string | null>;
  provisionAccount: (
    db: D1Database,
    identity: GithubIdentity
  ) => Promise<Account>;
  createAccountSession: typeof createSession;
  getAccountSession: typeof getSession;
  deleteAccountSession: typeof deleteSession;
}

const defaultDependencies: GithubAuthDependencies = {
  fetcher: (input, init) => fetch(input, init),
  storeOAuthState,
  consumeOAuthState,
  provisionAccount: provisionGithubAccount,
  createAccountSession: createSession,
  getAccountSession: getSession,
  deleteAccountSession: deleteSession,
};

export function buildGithubAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'read:user');
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeGithubCode(
  code: string,
  env: Pick<GithubAuthEnv, 'GITHUB_CLIENT_ID' | 'GITHUB_CLIENT_SECRET'>,
  fetcher: Fetcher = defaultDependencies.fetcher
): Promise<string | null> {
  const response = await fetcher('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  if (!response.ok) return null;
  const payload: unknown = await response.json();
  if (!isRecord(payload) || typeof payload.access_token !== 'string') return null;
  return payload.access_token;
}

export async function fetchGithubUser(
  accessToken: string,
  fetcher: Fetcher = defaultDependencies.fetcher
): Promise<GithubIdentity | null> {
  const response = await fetcher('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'ScreenshotIt',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) return null;
  const payload: unknown = await response.json();
  if (
    !isRecord(payload) ||
    (typeof payload.id !== 'number' && typeof payload.id !== 'string') ||
    typeof payload.login !== 'string'
  ) {
    return null;
  }
  return { providerUserId: String(payload.id), login: payload.login };
}

export async function handleAuthRequest(
  request: Request,
  env: GithubAuthEnv,
  dependencies: GithubAuthDependencies = defaultDependencies
): Promise<Response | null> {
  const url = new URL(request.url);
  const secure = new URL(env.APP_ORIGIN).protocol === 'https:';

  if (url.pathname === '/auth/github') {
    const state = generateToken();
    await dependencies.storeOAuthState(
      env.ANALYTICS_DB,
      state,
      safeReturnTo(url.searchParams.get('return_to'))
    );
    const location = buildGithubAuthorizationUrl(
      env.GITHUB_CLIENT_ID,
      new URL('/auth/github/callback', env.APP_ORIGIN).toString(),
      state
    );
    return redirect(location, serializeOAuthStateCookie(state, secure));
  }

  if (url.pathname === '/auth/github/callback') {
    const state = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    const cookieState = parseCookieHeader(request.headers.get('Cookie'))[
      OAUTH_STATE_COOKIE
    ];
    if (!state || !code || !cookieState || !(await tokensEqual(state, cookieState))) {
      return callbackError(env.APP_ORIGIN, 'invalid_state', secure);
    }

    const returnTo = await dependencies.consumeOAuthState(
      env.ANALYTICS_DB,
      state
    );
    if (!returnTo) return callbackError(env.APP_ORIGIN, 'invalid_state', secure);

    const accessToken = await exchangeGithubCode(code, env, dependencies.fetcher);
    if (!accessToken) return callbackError(env.APP_ORIGIN, 'oauth_failed', secure);
    const identity = await fetchGithubUser(accessToken, dependencies.fetcher);
    if (!identity) return callbackError(env.APP_ORIGIN, 'profile_failed', secure);

    try {
      const account = await dependencies.provisionAccount(env.ANALYTICS_DB, identity);
      const maxAgeSeconds = parsePositiveInteger(
        env.SESSION_MAX_AGE_SECONDS,
        60 * 60 * 24 * 30
      );
      const { token } = await dependencies.createAccountSession(
        env.ANALYTICS_DB,
        account.id,
        maxAgeSeconds
      );
      const headers = new Headers({
        Location: new URL(returnTo, env.APP_ORIGIN).toString(),
      });
      headers.append(
        'Set-Cookie',
        serializeSessionCookie(token, { secure, maxAgeSeconds })
      );
      headers.append('Set-Cookie', serializeExpiredOAuthStateCookie(secure));
      return new Response(null, { status: 302, headers });
    } catch (error) {
      const code = error instanceof Error && error.name === 'UsernameConflictError'
        ? 'username_taken'
        : 'account_failed';
      return callbackError(env.APP_ORIGIN, code, secure);
    }
  }

  if (url.pathname === '/auth/logout') {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
    }
    const token = parseCookieHeader(request.headers.get('Cookie'))[SESSION_COOKIE];
    await dependencies.deleteAccountSession(env.ANALYTICS_DB, token);
    return redirect(
      new URL('/', env.APP_ORIGIN).toString(),
      serializeExpiredSessionCookie(secure)
    );
  }

  if (url.pathname === '/api/me') {
    const session = await sessionFromRequest(request, env, dependencies);
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    return Response.json({ accountId: session.accountId, username: session.username });
  }

  return null;
}

export async function sessionFromRequest(
  request: Request,
  env: Pick<GithubAuthEnv, 'ANALYTICS_DB'>,
  dependencies: Pick<GithubAuthDependencies, 'getAccountSession'> = defaultDependencies
): Promise<Session | null> {
  const token = parseCookieHeader(request.headers.get('Cookie'))[SESSION_COOKIE];
  return dependencies.getAccountSession(env.ANALYTICS_DB, token);
}

export async function storeOAuthState(
  db: D1Database,
  state: string,
  returnTo: string,
  now = new Date()
): Promise<void> {
  const expiresAt = new Date(
    now.getTime() + OAUTH_STATE_MAX_AGE_SECONDS * 1000
  ).toISOString();
  await db
    .prepare(
      `INSERT INTO oauth_states (state_hash, return_to, expires_at, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(await hashToken(state), safeReturnTo(returnTo), expiresAt, now.toISOString())
    .run();
}

export async function consumeOAuthState(
  db: D1Database,
  state: string,
  now = new Date()
): Promise<string | null> {
  const row = await db
    .prepare(
      `DELETE FROM oauth_states
       WHERE state_hash = ? AND expires_at > ?
       RETURNING return_to`
    )
    .bind(await hashToken(state), now.toISOString())
    .first<{ return_to: string }>();
  return row?.return_to || null;
}

function redirect(location: string, cookie?: string): Response {
  const headers = new Headers({ Location: location });
  if (cookie) headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers });
}

function callbackError(origin: string, code: string, secure: boolean): Response {
  const url = new URL('/', origin);
  url.searchParams.set('auth_error', code);
  return redirect(url.toString(), serializeExpiredOAuthStateCookie(secure));
}

function serializeOAuthStateCookie(state: string, secure: boolean): string {
  const attributes = [
    `${OAUTH_STATE_COOKIE}=${encodeURIComponent(state)}`,
    'Path=/auth/github/callback',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${OAUTH_STATE_MAX_AGE_SECONDS}`,
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

function serializeExpiredOAuthStateCookie(secure: boolean): string {
  const attributes = [
    `${OAUTH_STATE_COOKIE}=`,
    'Path=/auth/github/callback',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
