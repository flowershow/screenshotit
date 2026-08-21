import { describe, expect, it } from 'vitest';
import {
  generateToken,
  hashToken,
  parseCookieHeader,
  safeReturnTo,
  serializeExpiredSessionCookie,
  serializeSessionCookie,
} from './auth';

describe('authentication primitives', () => {
  it('generates distinct base64url tokens', () => {
    const first = generateToken();
    const second = generateToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first).not.toBe(second);
  });

  it('hashes tokens deterministically without returning the raw token', async () => {
    const first = await hashToken('secret-token');
    const second = await hashToken('secret-token');

    expect(first).toBe(second);
    expect(first).not.toContain('secret-token');
  });

  it('parses cookies without decoding unrelated syntax', () => {
    expect(parseCookieHeader('theme=dark; screenshotit_session=abc_123; x=1')).toEqual({
      theme: 'dark',
      screenshotit_session: 'abc_123',
      x: '1',
    });
  });

  it('sets a secure production session cookie', () => {
    const cookie = serializeSessionCookie('token', {
      secure: true,
      maxAgeSeconds: 3600,
    });

    expect(cookie).toContain('screenshotit_session=token');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('Max-Age=3600');
  });

  it('allows an insecure cookie for local HTTP development', () => {
    expect(
      serializeSessionCookie('token', { secure: false, maxAgeSeconds: 60 })
    ).not.toContain('Secure');
  });

  it('clears the session cookie', () => {
    expect(serializeExpiredSessionCookie(true)).toContain('Max-Age=0');
  });

  it('accepts only local return paths', () => {
    expect(safeReturnTo('/dashboard')).toBe('/dashboard');
    expect(safeReturnTo('https://evil.example')).toBe('/dashboard');
    expect(safeReturnTo('//evil.example')).toBe('/dashboard');
  });
});
