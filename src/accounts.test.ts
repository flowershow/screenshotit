import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  UsernameConflictError,
  createSession,
  deleteSession,
  getSession,
  lookupAccountByUsername,
  provisionGithubAccount,
} from './accounts';
import { hashToken } from './auth';

function statement(firstValue: unknown = null) {
  const stmt = {
    bind: vi.fn(),
    first: vi.fn().mockResolvedValue(firstValue),
    run: vi.fn().mockResolvedValue({ success: true }),
  };
  stmt.bind.mockReturnValue(stmt);
  return stmt;
}

describe('account persistence', () => {
  let prepared: ReturnType<typeof statement>[];
  let db: any;

  beforeEach(() => {
    prepared = [];
    db = {
      prepare: vi.fn(() => {
        const stmt = statement();
        prepared.push(stmt);
        return stmt;
      }),
      batch: vi.fn().mockResolvedValue([]),
    };
  });

  it('resolves an account through a username alias', async () => {
    const row = { id: 'account-1', username: 'alice', status: 'active' };
    const stmt = statement(row);
    db.prepare.mockReturnValueOnce(stmt);

    await expect(
      lookupAccountByUsername(db as unknown as D1Database, 'Alice')
    ).resolves.toEqual(row);
    expect(stmt.bind).toHaveBeenCalledWith('alice');
  });

  it('reuses the account for an existing GitHub identity', async () => {
    const row = { id: 'account-1', username: 'alice', status: 'active' };
    db.prepare.mockReturnValueOnce(statement(row));

    await expect(
      provisionGithubAccount(db as unknown as D1Database, {
        providerUserId: '42',
        login: 'Alice',
      })
    ).resolves.toEqual(row);
    expect(db.batch).not.toHaveBeenCalled();
  });

  it('creates an account, canonical alias, and identity on first login', async () => {
    db.prepare
      .mockReturnValueOnce(statement(null))
      .mockReturnValueOnce(statement(null));

    const account = await provisionGithubAccount(db as unknown as D1Database, {
      providerUserId: '42',
      login: 'Alice',
    });

    expect(account.username).toBe('alice');
    expect(account.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(account).toMatchObject({
      maxScreenshots: 100,
      maxStorageBytes: 104857600,
    });
    expect(db.batch).toHaveBeenCalledOnce();
    expect((db.batch.mock.calls[0][0] as unknown[])).toHaveLength(3);
  });

  it('rejects a GitHub username already owned by another account', async () => {
    db.prepare
      .mockReturnValueOnce(statement(null))
      .mockReturnValueOnce(
        statement({ id: 'other-account', username: 'alice', status: 'active' })
      );

    await expect(
      provisionGithubAccount(db as unknown as D1Database, {
        providerUserId: '42',
        login: 'Alice',
      })
    ).rejects.toBeInstanceOf(UsernameConflictError);
  });

  it('stores only a hash when creating a session', async () => {
    const stmt = statement();
    db.prepare.mockReturnValueOnce(stmt);

    const result = await createSession(
      db as unknown as D1Database,
      'account-1',
      3600,
      new Date('2026-08-21T12:00:00.000Z')
    );

    expect(result.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(stmt.bind.mock.calls[0][0]).toBe(await hashToken(result.token));
    expect(stmt.bind.mock.calls[0]).not.toContain(result.token);
  });

  it('returns an active session account', async () => {
    const row = {
      account_id: 'account-1',
      username: 'alice',
      status: 'active',
      csrf_token: 'csrf',
      expires_at: '2026-08-22T12:00:00.000Z',
    };
    db.prepare.mockReturnValueOnce(statement(row));

    await expect(
      getSession(
        db as unknown as D1Database,
        'raw-token',
        new Date('2026-08-21T12:00:00.000Z')
      )
    ).resolves.toEqual({
      accountId: 'account-1',
      username: 'alice',
      csrfToken: 'csrf',
      expiresAt: row.expires_at,
    });
  });

  it('rejects an expired session', async () => {
    db.prepare.mockReturnValueOnce(
      statement({
        account_id: 'account-1',
        username: 'alice',
        status: 'active',
        csrf_token: 'csrf',
        expires_at: '2026-08-20T12:00:00.000Z',
      })
    );

    await expect(
      getSession(
        db as unknown as D1Database,
        'raw-token',
        new Date('2026-08-21T12:00:00.000Z')
      )
    ).resolves.toBeNull();
  });

  it('deletes a session by token hash', async () => {
    const stmt = statement();
    db.prepare.mockReturnValueOnce(stmt);

    await deleteSession(db as unknown as D1Database, 'raw-token');

    expect(stmt.bind).toHaveBeenCalledWith(await hashToken('raw-token'));
    expect(stmt.run).toHaveBeenCalledOnce();
  });
});
