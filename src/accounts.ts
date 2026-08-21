import { normalizeUsername } from './account-routing';
import { generateToken, hashToken } from './auth';

export interface Account {
  id: string;
  username: string;
  status: string;
  maxScreenshots: number;
  maxStorageBytes: number;
}

export interface Session {
  accountId: string;
  username: string;
  csrfToken: string;
  expiresAt: string;
}

interface SessionRow {
  account_id: string;
  username: string;
  status: string;
  csrf_token: string;
  expires_at: string;
}

export class UsernameConflictError extends Error {
  constructor(username: string) {
    super(`Username @${username} is already in use`);
    this.name = 'UsernameConflictError';
  }
}

export async function lookupAccountByUsername(
  db: D1Database,
  username: string
): Promise<Account | null> {
  return db
    .prepare(
      `SELECT a.id, a.username, a.status,
              a.max_screenshots AS maxScreenshots,
              a.max_storage_bytes AS maxStorageBytes
       FROM account_usernames u
       JOIN accounts a ON a.id = u.account_id
       WHERE u.username = ?`
    )
    .bind(username.toLowerCase())
    .first<Account>();
}

export async function provisionGithubAccount(
  db: D1Database,
  identity: { providerUserId: string; login: string }
): Promise<Account> {
  const existing = await db
    .prepare(
      `SELECT a.id, a.username, a.status,
              a.max_screenshots AS maxScreenshots,
              a.max_storage_bytes AS maxStorageBytes
       FROM account_identities i
       JOIN accounts a ON a.id = i.account_id
       WHERE i.provider = 'github' AND i.provider_user_id = ?`
    )
    .bind(identity.providerUserId)
    .first<Account>();

  if (existing) return existing;

  const username = normalizeUsername(identity.login);
  const occupied = await lookupAccountByUsername(db, username);
  if (occupied) throw new UsernameConflictError(username);

  const account: Account = {
    id: crypto.randomUUID(),
    username,
    status: 'active',
    maxScreenshots: 100,
    maxStorageBytes: 104857600,
  };
  const now = new Date().toISOString();

  await db.batch([
    db
      .prepare(
        `INSERT INTO accounts (id, username, status, created_at, updated_at)
         VALUES (?, ?, 'active', ?, ?)`
      )
      .bind(account.id, username, now, now),
    db
      .prepare(
        `INSERT INTO account_usernames (username, account_id, is_canonical, created_at)
         VALUES (?, ?, 1, ?)`
      )
      .bind(username, account.id, now),
    db
      .prepare(
        `INSERT INTO account_identities (
           provider, provider_user_id, provider_login, account_id, created_at, updated_at
         ) VALUES ('github', ?, ?, ?, ?, ?)`
      )
      .bind(identity.providerUserId, identity.login, account.id, now, now),
  ]);

  return account;
}

export async function createSession(
  db: D1Database,
  accountId: string,
  maxAgeSeconds: number,
  now = new Date()
): Promise<{ token: string; session: Session }> {
  const token = generateToken();
  const csrfToken = generateToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(now.getTime() + maxAgeSeconds * 1000).toISOString();

  await db
    .prepare(
      `INSERT INTO sessions (
         token_hash, account_id, csrf_token, expires_at, created_at, last_seen_at
       ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(tokenHash, accountId, csrfToken, expiresAt, now.toISOString(), now.toISOString())
    .run();

  return {
    token,
    session: { accountId, username: '', csrfToken, expiresAt },
  };
}

export async function getSession(
  db: D1Database,
  token: string | null | undefined,
  now = new Date()
): Promise<Session | null> {
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const row = await db
    .prepare(
      `SELECT s.account_id, s.csrf_token, s.expires_at, a.username, a.status
       FROM sessions s
       JOIN accounts a ON a.id = s.account_id
       WHERE s.token_hash = ?`
    )
    .bind(tokenHash)
    .first<SessionRow>();

  if (!row || row.status !== 'active' || row.expires_at <= now.toISOString()) {
    return null;
  }

  return {
    accountId: row.account_id,
    username: row.username,
    csrfToken: row.csrf_token,
    expiresAt: row.expires_at,
  };
}

export async function deleteSession(
  db: D1Database,
  token: string | null | undefined
): Promise<void> {
  if (!token) return;
  await db
    .prepare('DELETE FROM sessions WHERE token_hash = ?')
    .bind(await hashToken(token))
    .run();
}
