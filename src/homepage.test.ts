import { describe, it, expect } from 'vitest';
import { renderHomepage } from './homepage';

describe('renderHomepage analytics sections', () => {
  it('renders clear hero usage examples', () => {
    const html = renderHomepage();

    expect(html).toContain('Screenshot•It <span class="credit">by <a href="https://datopian.com/">Datopian Data Co</a></span>');
    expect(html).toContain('URL to Screenshot in one line');
    expect(html).toContain(
      'Paste any URL after screenshotit.app and get a stable image you can embed anywhere.'
    );
    expect(html).toContain('screenshotit.app/{url}');
    expect(html).not.toContain('<div class="site-tagline">The URL is the screenshot.</div>');
  });

  it('renders leaderboard and recent sections when rows are provided', () => {
    const html = renderHomepage({
      topScreenshots: [
        {
          r2Key: 'screenshots/https://example.com/default/latest.webp',
          targetUrl: 'https://example.com',
          modifiers: '',
          accessCount: 10,
          createdCount: 1,
          createdAt: '2026-02-24T10:00:00.000Z',
          lastCreatedAt: '2026-02-24T10:00:00.000Z',
          lastAccessedAt: '2026-02-24T10:01:00.000Z',
        },
      ],
      recentScreenshots: [
        {
          r2Key: 'screenshots/https://example.com/full/latest.webp',
          targetUrl: 'https://example.com',
          modifiers: 'full',
          accessCount: 3,
          createdCount: 2,
          createdAt: '2026-02-24T11:00:00.000Z',
          lastCreatedAt: '2026-02-24T11:00:00.000Z',
          lastAccessedAt: '2026-02-24T11:01:00.000Z',
        },
      ],
    });

    expect(html).toContain('Most accessed screenshots');
    expect(html).toContain('Recently created screenshots');
    expect(html).toContain('/example.com');
    expect(html).toContain('/example.com@full');
  });
});
