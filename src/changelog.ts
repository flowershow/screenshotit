export interface ChangelogEntry {
  date: string;
  title: string;
  body: string;
  image?: { src: string; alt: string };
}

export const CHANGELOG_ENTRIES: readonly ChangelogEntry[] = [
  {
    date: '2026-08-21',
    title: 'Account-owned screenshots',
    body:
      'GitHub sign-in now gives people a username-based home for their public screenshots. Each account gets scoped storage, quotas, and a dashboard for creating, refreshing, and deleting screenshots, while the images remain publicly accessible at stable /@username/... URLs and anonymous routes continue to work as before.',
    image: {
      src: 'https://raw.githubusercontent.com/flowershow/screenshotit/main/changelog/images/2026-08-21-account-owned-screenshots.jpg',
      alt: 'The authenticated ScreenshotIt dashboard',
    },
  },
  {
    date: '2026-02-24',
    title: 'See what’s being captured',
    body:
      'ScreenshotIt added a live leaderboard and recent-activity view, making the most-accessed and newest screenshots visible from the homepage instead of leaving the service as a collection of isolated URLs.',
  },
  {
    date: '2026-02-14',
    title: 'Faster, richer screenshot history',
    body:
      'Screenshots became smaller WebP files, the homepage demo started rotating through real examples, and dated URLs made it possible to retrieve an earlier capture instead of only the latest image.',
  },
  {
    date: '2026-02-11',
    title: 'Social previews from a URL',
    body:
      'ScreenshotIt added social-sized previews, Open Graph and Twitter Card metadata, and shorter URL-first examples so a screenshot can drop directly into a post or link preview.',
  },
  {
    date: '2026-02-04',
    title: 'A clearer homepage',
    body:
      'The homepage was redesigned around a live hero example, a concise URL-to-screenshot explanation, practical API patterns, and a more welcoming path from discovery to the first capture.',
  },
  {
    date: '2026-01-31',
    title: 'ScreenshotIt.app',
    body:
      'The service became ScreenshotIt.app: a Cloudflare-powered screenshot endpoint where the URL itself is the stable image address, with no SDK or API key required for the basic workflow.',
  },
];

export function renderChangelogPage(
  entries: readonly ChangelogEntry[] = CHANGELOG_ENTRIES,
  account?: { username: string } | null
): string {
  const accountNavigation = account
    ? `<a href="/dashboard">@${escapeHtml(account.username)}</a>`
    : '<a href="/auth/github">Log in with GitHub</a>';
  const renderedEntries = entries
    .map(
      (entry) => `
        <article class="section entry">
          <p class="date section-desc">${escapeHtml(entry.date)}</p>
          <h2 class="section-title"><span class="hash">##</span>${escapeHtml(entry.title)}</h2>
          ${entry.image ? `<img class="entry-image" src="${escapeHtml(entry.image.src)}" alt="${escapeHtml(entry.image.alt)}">` : ''}
          <p class="entry-body">${escapeHtml(entry.body)}</p>
        </article>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Changelog · Screenshot•It</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'IBM Plex Mono', 'SF Mono', 'Menlo', 'Consolas', monospace; background: #fafafa; color: #111; line-height: 1.6; -webkit-font-smoothing: antialiased; }
    .container { max-width: 980px; margin: 0 auto; padding: 48px 24px; }
    .account-nav { display: flex; justify-content: flex-end; margin-bottom: 24px; font-size: 13px; }
    .account-nav a { color: #111; }
    .brand-link { color: #111; text-decoration: none; }
    .major-section-title { font-size: 26px; font-weight: 500; margin: 10px 0 40px; color: #111; }
    .major-section-title .hash, .section-title .hash { color: #999; margin-right: 8px; }
    .section { margin-bottom: 56px; }
    .section-title { font-size: 15px; font-weight: 500; margin-bottom: 12px; color: #111; }
    .section-desc { font-size: 14px; color: #666; margin-bottom: 8px; }
    .entry { border-top: 1px solid #ddd; padding-top: 24px; }
    .entry-image { width: 100%; max-width: 840px; height: auto; display: block; margin: 20px 0 22px; border: 1px solid #ddd; }
    .entry-body { max-width: 760px; font-size: 14px; color: #444; line-height: 1.7; }
  </style>
</head>
<body>
  <main class="container">
    <div class="account-nav">${accountNavigation}</div>
    <a class="brand-link" href="/">Screenshot•It</a>
    <h1 class="major-section-title"><span class="hash">#</span>Changelog</h1>
    ${renderedEntries || '<p>No updates yet.</p>'}
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] || character
  );
}
