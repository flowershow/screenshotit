export interface ChangelogEntry {
  date: string;
  title: string;
  body: string;
}

export const CHANGELOG_ENTRIES: readonly ChangelogEntry[] = [
  {
    date: '2026-08-21',
    title: 'Account-owned screenshots',
    body:
      'ScreenshotIt now supports GitHub sign-in with usernames, so people can create and manage their own screenshot collections at /@username/... while keeping every published image publicly accessible.',
  },
];

export function renderChangelogPage(
  entries: readonly ChangelogEntry[] = CHANGELOG_ENTRIES
): string {
  const renderedEntries = entries
    .map(
      (entry) => `
        <article class="entry">
          <p class="date">${escapeHtml(entry.date)}</p>
          <h2>${escapeHtml(entry.title)}</h2>
          <p>${escapeHtml(entry.body)}</p>
        </article>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Changelog · Screenshot•It</title>
  <style>
    :root { color-scheme: dark; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    body { margin: 0; background: #111; color: #f4f1ea; }
    main { max-width: 760px; margin: 0 auto; padding: 28px 20px 72px; }
    nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 72px; }
    nav a { color: inherit; text-decoration: none; }
    .back { color: #b9b2a7; font-size: 13px; }
    h1 { font-size: clamp(32px, 7vw, 64px); line-height: 1; margin: 0 0 56px; letter-spacing: -0.06em; }
    .entry { border-top: 1px solid #393631; padding: 28px 0 36px; }
    .date { color: #a7a095; font-size: 13px; margin: 0 0 12px; }
    h2 { font-size: 24px; line-height: 1.15; margin: 0 0 16px; letter-spacing: -0.04em; }
    .entry > p:last-child { color: #d4cfc6; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 17px; line-height: 1.6; margin: 0; }
  </style>
</head>
<body>
  <main>
    <nav><a href="/">Screenshot•It</a><a class="back" href="/">Back home</a></nav>
    <h1>Changelog</h1>
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
