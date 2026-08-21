import { describe, expect, it } from 'vitest';
import { normalizeUsername, parseAccountRoute } from './account-routing';

describe('account routing', () => {
  it('parses an account screenshot path', () => {
    expect(parseAccountRoute('/@Alice/example.com@full')).toEqual({
      username: 'alice',
      screenshotPath: '/example.com@full',
    });
  });

  it('does not match an anonymous screenshot path', () => {
    expect(parseAccountRoute('/example.com@full')).toBeNull();
  });

  it('rejects an account route without a screenshot target', () => {
    expect(() => parseAccountRoute('/@alice')).toThrow('No URL provided');
  });

  it('rejects invalid usernames', () => {
    expect(() => parseAccountRoute('/@bad_name/example.com')).toThrow(
      'Invalid username'
    );
  });

  it('rejects reserved usernames', () => {
    expect(() => normalizeUsername('auth')).toThrow('reserved');
  });
});
