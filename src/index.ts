import { renderHomepage } from './homepage';
import {
  getRecentCreatedScreenshots,
  getTopScreenshots,
} from './analytics';
import { handleAuthRequest } from './github-auth';
import { sessionFromRequest } from './github-auth';
import { handleDashboardRequest } from './dashboard';
import { handleScreenshotRequest } from './screenshot-handler';
import { renderChangelogPage } from './changelog';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    try {
      const authResponse = await handleAuthRequest(request, env);
      if (authResponse) return authResponse;

      const dashboardResponse = await handleDashboardRequest(request, env);
      if (dashboardResponse) return dashboardResponse;

      if (url.pathname === '/' || url.pathname === '') {
        const [homepageData, session] = await Promise.all([
          loadHomepageData(env),
          sessionFromRequest(request, env).catch(() => null),
        ]);
        return new Response(
          renderHomepage({
            ...homepageData,
            account: session ? { username: session.username } : null,
          }),
          {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
      }

      if (url.pathname === '/changelog') {
        const session = await sessionFromRequest(request, env).catch(() => null);
        return new Response(
          renderChangelogPage(undefined, session ? { username: session.username } : null),
          {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
      }

      return handleScreenshotRequest(request, env, ctx);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(JSON.stringify({ message: 'request failed', error: message }));
      return new Response('Internal error', { status: 500 });
    }
  },
};

async function loadHomepageData(env: Env) {
  try {
    const [topScreenshots, recentScreenshots] = await Promise.all([
      getTopScreenshots(env.ANALYTICS_DB, 10),
      getRecentCreatedScreenshots(env.ANALYTICS_DB, 10),
    ]);
    return { topScreenshots, recentScreenshots };
  } catch (error) {
    console.error('Failed to load homepage analytics data', error);
    return { topScreenshots: [], recentScreenshots: [] };
  }
}
