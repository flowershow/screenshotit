import {
  deleteAccountScreenshotRecord,
  getAccountScreenshotById,
  getAccountUsage,
  listAccountScreenshots,
  type AccountScreenshot,
  type AccountUsage,
} from './account-screenshots';
import type { Session } from './accounts';
import { tokensEqual } from './auth';
import { sessionFromRequest } from './github-auth';
import { normalizeUrl } from './normalize';
import { deleteScreenshotPrefix } from './storage';

export interface DashboardEnv {
  ANALYTICS_DB: D1Database;
  SCREENSHOTS: R2Bucket;
  APP_ORIGIN: string;
}

export interface DashboardDependencies {
  getRequestSession: (
    request: Request,
    env: Pick<DashboardEnv, 'ANALYTICS_DB'>
  ) => Promise<Session | null>;
  listScreenshots: typeof listAccountScreenshots;
  getUsage: typeof getAccountUsage;
  getScreenshotById: typeof getAccountScreenshotById;
  deletePrefix: typeof deleteScreenshotPrefix;
  deleteScreenshotRecord: typeof deleteAccountScreenshotRecord;
}

const defaultDependencies: DashboardDependencies = {
  getRequestSession: (request, env) => sessionFromRequest(request, env),
  listScreenshots: listAccountScreenshots,
  getUsage: getAccountUsage,
  getScreenshotById: getAccountScreenshotById,
  deletePrefix: deleteScreenshotPrefix,
  deleteScreenshotRecord: deleteAccountScreenshotRecord,
};

export async function handleDashboardRequest(
  request: Request,
  env: DashboardEnv,
  dependencies: DashboardDependencies = defaultDependencies
): Promise<Response | null> {
  const url = new URL(request.url);
  const isDashboard = url.pathname === '/dashboard';
  const isCreate = url.pathname === '/dashboard/create';
  const deleteMatch = url.pathname.match(
    /^\/api\/screenshots\/([A-Za-z0-9-]{1,64})\/delete$/
  );
  if (!isDashboard && !isCreate && !deleteMatch) return null;

  const session = await dependencies.getRequestSession(request, env);
  if (!session) {
    if (isDashboard) {
      const loginUrl = new URL('/auth/github', env.APP_ORIGIN);
      loginUrl.searchParams.set('return_to', '/dashboard');
      return redirect(loginUrl.toString(), 302);
    }
    return new Response('Unauthorized', { status: 401 });
  }

  if (isDashboard) {
    if (request.method !== 'GET') return methodNotAllowed('GET');
    const [screenshots, usage] = await Promise.all([
      dependencies.listScreenshots(env.ANALYTICS_DB, session.accountId),
      dependencies.getUsage(env.ANALYTICS_DB, session.accountId),
    ]);
    return new Response(renderDashboard({ session, screenshots, usage }), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (request.method !== 'POST') return methodNotAllowed('POST');
  const form = await readVerifiedForm(request, env.APP_ORIGIN, session);
  if (form instanceof Response) return form;

  if (isCreate) {
    const rawTarget = form.get('target');
    if (typeof rawTarget !== 'string' || !rawTarget.trim()) {
      return new Response('Target URL is required', { status: 400 });
    }
    try {
      const target = normalizeUrl(rawTarget.trim()).replace(/^https?:\/\//, '');
      return redirect(
        new URL(`/@${session.username}/${target}`, env.APP_ORIGIN).toString(),
        303
      );
    } catch {
      return new Response('Invalid target URL', { status: 400 });
    }
  }

  const screenshotId = deleteMatch?.[1] || '';
  const screenshot = await dependencies.getScreenshotById(
    env.ANALYTICS_DB,
    session.accountId,
    screenshotId
  );
  if (!screenshot) return new Response('Screenshot not found', { status: 404 });

  await dependencies.deletePrefix(env.SCREENSHOTS, screenshot.r2Prefix);
  await dependencies.deleteScreenshotRecord(
    env.ANALYTICS_DB,
    session.accountId,
    screenshotId
  );
  return redirect(new URL('/dashboard', env.APP_ORIGIN).toString(), 303);
}

export function renderDashboard(data: {
  session: Session;
  screenshots: AccountScreenshot[];
  usage: AccountUsage;
}): string {
  const username = escapeHtml(data.session.username);
  const csrfToken = escapeHtml(data.session.csrfToken);
  const rows = data.screenshots.length
    ? data.screenshots.map((screenshot) => renderScreenshotRow(data.session, screenshot)).join('\n')
    : '<p class="empty">No account screenshots yet.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>@${username} · ScreenshotIt</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #fafafa; color: #111; font-family: 'SFMono-Regular', Consolas, monospace; line-height: 1.5; }
    main { max-width: 920px; margin: 0 auto; padding: 40px 24px 80px; }
    nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 48px; }
    a { color: #111; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    .muted, .empty { color: #666; }
    .stats { display: flex; gap: 16px; margin: 28px 0; }
    .stat { border: 1px solid #ddd; background: white; padding: 16px; min-width: 160px; }
    .stat strong { display: block; font-size: 20px; }
    form.create { display: flex; gap: 8px; margin: 28px 0 40px; }
    input[type=url] { flex: 1; min-width: 0; padding: 11px 12px; border: 1px solid #bbb; font: inherit; }
    button { padding: 10px 14px; border: 1px solid #111; background: #111; color: white; font: inherit; cursor: pointer; }
    .screenshot { padding: 18px 0; border-top: 1px solid #ddd; }
    .screenshot-url { word-break: break-all; }
    .meta, .actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 8px; font-size: 13px; color: #666; }
    .actions form { display: inline; }
    .actions button { padding: 0; border: 0; background: transparent; color: #a00; text-decoration: underline; }
    .logout button { padding: 0; border: 0; background: transparent; color: #111; text-decoration: underline; }
    @media (max-width: 600px) { .stats, form.create { flex-direction: column; } }
  </style>
</head>
<body>
<main>
  <nav>
    <a href="/">Screenshot•It</a>
    <form class="logout" method="post" action="/auth/logout"><button type="submit">Log out</button></form>
  </nav>
  <h1>@${username}</h1>
  <p class="muted">Your screenshots are public. Only you can create, refresh, or delete them.</p>
  <div class="stats">
    <div class="stat"><strong>${data.usage.screenshotCount}</strong>screenshots</div>
    <div class="stat"><strong>${formatBytes(data.usage.storageBytes)}</strong>stored</div>
  </div>
  <form class="create" method="post" action="/dashboard/create">
    <input type="hidden" name="csrf_token" value="${csrfToken}">
    <input type="url" name="target" placeholder="https://example.com" required>
    <button type="submit">Create screenshot</button>
  </form>
  <h2>Screenshots</h2>
  ${rows}
</main>
</body>
</html>`;
}

function renderScreenshotRow(session: Session, screenshot: AccountScreenshot): string {
  const path = accountScreenshotPath(session.username, screenshot);
  const refreshPath = `${path}@refresh`;
  return `<article class="screenshot">
    <div class="screenshot-url"><a href="${escapeHtml(path)}">${escapeHtml(path)}</a></div>
    <div class="meta"><span>${formatBytes(screenshot.byteSize)}</span><span>${screenshot.accessCount} accesses</span><span>${screenshot.captureCount} captures</span></div>
    <div class="actions">
      <a href="${escapeHtml(refreshPath)}">Refresh</a>
      <form method="post" action="/api/screenshots/${encodeURIComponent(screenshot.id)}/delete">
        <input type="hidden" name="csrf_token" value="${escapeHtml(session.csrfToken)}">
        <button type="submit">Delete</button>
      </form>
    </div>
  </article>`;
}

function accountScreenshotPath(username: string, screenshot: AccountScreenshot): string {
  const target = screenshot.targetUrl.replace(/^https?:\/\//, '');
  const modifiers = screenshot.modifiers
    .split(',')
    .map((modifier) => modifier.trim())
    .filter(Boolean)
    .map((modifier) => `@${modifier}`)
    .join('');
  return `/@${username}/${target}${modifiers}`;
}

async function readVerifiedForm(
  request: Request,
  appOrigin: string,
  session: Session
): Promise<FormData | Response> {
  if (request.headers.get('Origin') !== new URL(appOrigin).origin) {
    return new Response('Forbidden', { status: 403 });
  }
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > 16_384) return new Response('Request too large', { status: 413 });
  const form = await request.formData();
  const provided = form.get('csrf_token');
  if (
    typeof provided !== 'string' ||
    !(await tokensEqual(provided, session.csrfToken))
  ) {
    return new Response('Forbidden', { status: 403 });
  }
  return form;
}

function redirect(location: string, status: 302 | 303): Response {
  return new Response(null, { status, headers: { Location: location } });
}

function methodNotAllowed(allow: string): Response {
  return new Response('Method not allowed', { status: 405, headers: { Allow: allow } });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
