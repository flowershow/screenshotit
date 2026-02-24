import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  recordScreenshotAccess,
  recordScreenshotCreated,
  getTopScreenshots,
  getRecentCreatedScreenshots,
} from './analytics';

describe('analytics', () => {
  let mockStmt: {
    bind: ReturnType<typeof vi.fn>;
    run: ReturnType<typeof vi.fn>;
    all: ReturnType<typeof vi.fn>;
  };
  let mockDb: {
    prepare: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockStmt = {
      bind: vi.fn(),
      run: vi.fn(),
      all: vi.fn(),
    };
    mockStmt.bind.mockReturnValue(mockStmt);

    mockDb = {
      prepare: vi.fn().mockReturnValue(mockStmt),
    };
  });

  it('records screenshot access with upsert SQL', async () => {
    mockStmt.run.mockResolvedValue({ success: true });

    await recordScreenshotAccess(mockDb as unknown as D1Database, {
      r2Key: 'screenshots/https://example.com/default/latest.webp',
      targetUrl: 'https://example.com',
      modifiers: '',
      accessedAt: '2026-02-24T12:00:00.000Z',
    });

    expect(mockDb.prepare).toHaveBeenCalledOnce();
    expect(mockStmt.bind).toHaveBeenCalledWith(
      'screenshots/https://example.com/default/latest.webp',
      'https://example.com',
      '',
      '2026-02-24T12:00:00.000Z'
    );
    expect(mockStmt.run).toHaveBeenCalledOnce();
  });

  it('records screenshot creation with upsert SQL', async () => {
    mockStmt.run.mockResolvedValue({ success: true });

    await recordScreenshotCreated(mockDb as unknown as D1Database, {
      r2Key: 'screenshots/https://example.com/default/latest.webp',
      targetUrl: 'https://example.com',
      modifiers: '',
      createdAt: '2026-02-24T12:00:00.000Z',
    });

    expect(mockDb.prepare).toHaveBeenCalledOnce();
    expect(mockStmt.bind).toHaveBeenCalledWith(
      'screenshots/https://example.com/default/latest.webp',
      'https://example.com',
      '',
      '2026-02-24T12:00:00.000Z'
    );
    expect(mockStmt.run).toHaveBeenCalledOnce();
  });

  it('returns mapped leaderboard rows', async () => {
    mockStmt.all.mockResolvedValue({
      results: [
        {
          r2_key: 'screenshots/https://example.com/default/latest.webp',
          target_url: 'https://example.com',
          modifiers: '',
          access_count: 42,
          created_count: 2,
          created_at: '2026-02-20T00:00:00.000Z',
          last_created_at: '2026-02-24T00:00:00.000Z',
          last_accessed_at: '2026-02-24T12:00:00.000Z',
        },
      ],
    });

    const rows = await getTopScreenshots(mockDb as unknown as D1Database, 5);
    expect(mockStmt.bind).toHaveBeenCalledWith(5);
    expect(rows).toHaveLength(1);
    expect(rows[0].accessCount).toBe(42);
    expect(rows[0].targetUrl).toBe('https://example.com');
  });

  it('returns mapped recent-created rows', async () => {
    mockStmt.all.mockResolvedValue({
      results: [
        {
          r2_key: 'screenshots/https://example.com/full/latest.webp',
          target_url: 'https://example.com',
          modifiers: 'full',
          access_count: 5,
          created_count: 3,
          created_at: '2026-02-24T11:00:00.000Z',
          last_created_at: '2026-02-24T11:00:00.000Z',
          last_accessed_at: '2026-02-24T12:00:00.000Z',
        },
      ],
    });

    const rows = await getRecentCreatedScreenshots(
      mockDb as unknown as D1Database,
      5
    );

    expect(mockStmt.bind).toHaveBeenCalledWith(5);
    expect(rows).toHaveLength(1);
    expect(rows[0].modifiers).toBe('full');
    expect(rows[0].createdCount).toBe(3);
  });
});
