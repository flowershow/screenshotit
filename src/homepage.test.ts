import { describe, it, expect } from 'vitest';
import { renderHomepage } from './homepage';

describe('renderHomepage analytics sections', () => {
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
