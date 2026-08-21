import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findAccountScreenshot,
  getAccountScreenshotById,
  getAccountUsage,
  listAccountScreenshots,
  recordAccountScreenshotAccess,
  upsertAccountScreenshot,
} from './account-screenshots';

function statement(options: { first?: unknown; results?: unknown[] } = {}) {
  const stmt = {
    bind: vi.fn(),
    first: vi.fn().mockResolvedValue(options.first ?? null),
    all: vi.fn().mockResolvedValue({ results: options.results ?? [] }),
    run: vi.fn().mockResolvedValue({ success: true }),
  };
  stmt.bind.mockReturnValue(stmt);
  return stmt;
}

describe('account screenshot catalog', () => {
  let db: any;

  beforeEach(() => {
    db = { prepare: vi.fn() };
  });

  it('upserts a captured screenshot and returns its stable id', async () => {
    const stmt = statement({ first: { id: 'shot-1' } });
    db.prepare.mockReturnValue(stmt);

    await expect(
      upsertAccountScreenshot(db as D1Database, {
        accountId: 'account-1',
        targetUrl: 'https://example.com',
        modifiers: 'full',
        r2Prefix: 'accounts/account-1/screenshots/https://example.com/full/',
        byteSize: 1234,
        capturedAt: '2026-08-21T12:00:00.000Z',
      })
    ).resolves.toBe('shot-1');
    expect(stmt.bind.mock.calls[0]).toEqual([
      expect.stringMatching(/^[0-9a-f-]{36}$/),
      'account-1',
      'https://example.com',
      'full',
      'accounts/account-1/screenshots/https://example.com/full/',
      1234,
      '2026-08-21T12:00:00.000Z',
      '2026-08-21T12:00:00.000Z',
    ]);
  });

  it('increments access for an account screenshot', async () => {
    const stmt = statement();
    db.prepare.mockReturnValue(stmt);

    await recordAccountScreenshotAccess(
      db as D1Database,
      'account-1',
      'https://example.com',
      'full',
      '2026-08-21T12:00:00.000Z'
    );

    expect(stmt.bind).toHaveBeenCalledWith(
      '2026-08-21T12:00:00.000Z',
      'account-1',
      'https://example.com',
      'full'
    );
  });

  it('lists screenshots for the dashboard', async () => {
    const stmt = statement({
      results: [
        {
          id: 'shot-1',
          account_id: 'account-1',
          target_url: 'https://example.com',
          modifiers: 'full',
          r2_prefix: 'prefix/',
          byte_size: 1234,
          access_count: 3,
          capture_count: 2,
          created_at: 'created',
          last_captured_at: 'captured',
          last_accessed_at: 'accessed',
        },
      ],
    });
    db.prepare.mockReturnValue(stmt);

    const rows = await listAccountScreenshots(db as D1Database, 'account-1');

    expect(rows[0]).toMatchObject({ id: 'shot-1', byteSize: 1234, accessCount: 3 });
    expect(stmt.bind).toHaveBeenCalledWith('account-1');
  });

  it('returns aggregate quota usage', async () => {
    db.prepare.mockReturnValue(
      statement({ first: { screenshot_count: 4, storage_bytes: 5678 } })
    );

    await expect(
      getAccountUsage(db as D1Database, 'account-1')
    ).resolves.toEqual({ screenshotCount: 4, storageBytes: 5678 });
  });

  it('looks up a screenshot by id and owner', async () => {
    const stmt = statement({
      first: {
        id: 'shot-1',
        account_id: 'account-1',
        target_url: 'https://example.com',
        modifiers: '',
        r2_prefix: 'prefix/',
        byte_size: 100,
        access_count: 0,
        capture_count: 1,
        created_at: 'created',
        last_captured_at: 'captured',
        last_accessed_at: null,
      },
    });
    db.prepare.mockReturnValue(stmt);

    const screenshot = await getAccountScreenshotById(
      db as D1Database,
      'account-1',
      'shot-1'
    );

    expect(screenshot?.accountId).toBe('account-1');
    expect(stmt.bind).toHaveBeenCalledWith('shot-1', 'account-1');
  });

  it('finds an existing screenshot by its logical account key', async () => {
    const row = {
      id: 'shot-1',
      account_id: 'account-1',
      target_url: 'https://example.com',
      modifiers: 'full',
      r2_prefix: 'prefix/',
      byte_size: 100,
      access_count: 0,
      capture_count: 1,
      created_at: 'created',
      last_captured_at: 'captured',
      last_accessed_at: null,
    };
    const stmt = statement({ first: row });
    db.prepare.mockReturnValue(stmt);

    await expect(
      findAccountScreenshot(
        db as D1Database,
        'account-1',
        'https://example.com',
        'full'
      )
    ).resolves.toMatchObject({ id: 'shot-1' });
    expect(stmt.bind).toHaveBeenCalledWith(
      'account-1',
      'https://example.com',
      'full'
    );
  });
});
