import { describe, it, expect } from 'vitest';
import { parseRequest, normalizeUrl, buildR2Key } from './normalize';

describe('parseRequest', () => {
  it('extracts URL from path', () => {
    const result = parseRequest('/https://example.com');
    expect(result.targetUrl).toBe('https://example.com');
    expect(result.modifiers).toEqual([]);
  });

  it('extracts modifiers from URL', () => {
    const result = parseRequest('/https://example.com@full@mobile');
    expect(result.targetUrl).toBe('https://example.com');
    expect(result.modifiers).toEqual(['full', 'mobile']);
  });

  it('handles URL without protocol', () => {
    const result = parseRequest('/example.com');
    expect(result.targetUrl).toBe('example.com');
  });

  it('rejects unknown modifiers', () => {
    expect(() => parseRequest('/https://example.com@unknown')).toThrow(
      'Unknown modifier: @unknown'
    );
  });

  it('handles refresh modifier', () => {
    const result = parseRequest('/https://example.com@refresh');
    expect(result.modifiers).toEqual(['refresh']);
  });

  it('handles social modifier', () => {
    const result = parseRequest('/https://example.com@social');
    expect(result.modifiers).toEqual(['social']);
  });

  it('extracts date modifier', () => {
    const result = parseRequest('/https://example.com@2026-01-28');
    expect(result.targetUrl).toBe('https://example.com');
    expect(result.date).toBe('2026-01-28');
    expect(result.modifiers).toEqual([]);
  });

  it('extracts date with other modifiers', () => {
    const result = parseRequest('/https://example.com@full@2026-01-28');
    expect(result.targetUrl).toBe('https://example.com');
    expect(result.date).toBe('2026-01-28');
    expect(result.modifiers).toEqual(['full']);
  });

  it('rejects multiple dates', () => {
    expect(() =>
      parseRequest('/https://example.com@2026-01-28@2026-01-29')
    ).toThrow('Only one @date modifier allowed');
  });

  it('handles empty path', () => {
    expect(() => parseRequest('/')).toThrow('No URL provided');
  });
});

describe('normalizeUrl', () => {
  it('adds https protocol if missing', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
  });

  it('preserves existing https', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('preserves existing http', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('lowercases hostname', () => {
    expect(normalizeUrl('https://EXAMPLE.COM')).toBe('https://example.com');
  });

  it('lowercases path', () => {
    expect(normalizeUrl('https://example.com/Page')).toBe(
      'https://example.com/page'
    );
  });

  it('strips query string', () => {
    expect(normalizeUrl('https://example.com?foo=bar')).toBe(
      'https://example.com'
    );
  });

  it('strips fragment', () => {
    expect(normalizeUrl('https://example.com#section')).toBe(
      'https://example.com'
    );
  });

  it('strips both query and fragment', () => {
    expect(normalizeUrl('https://example.com/page?q=1#top')).toBe(
      'https://example.com/page'
    );
  });

  it('decodes URL-encoded characters', () => {
    expect(normalizeUrl('https://example.com/my%20page')).toBe(
      'https://example.com/my page'
    );
  });

  it('handles complex URL', () => {
    expect(
      normalizeUrl('https://Example.COM/My%20Page?utm_source=twitter#section')
    ).toBe('https://example.com/my page');
  });
});

describe('buildR2Key', () => {
  it('builds key for default modifiers', () => {
    expect(buildR2Key('https://example.com', [])).toBe(
      'screenshots/https://example.com/default/latest.png'
    );
  });

  it('builds key with single modifier', () => {
    expect(buildR2Key('https://example.com', ['full'])).toBe(
      'screenshots/https://example.com/full/latest.png'
    );
  });

  it('builds key with multiple modifiers sorted', () => {
    expect(buildR2Key('https://example.com', ['mobile', 'full'])).toBe(
      'screenshots/https://example.com/full-mobile/latest.png'
    );
  });

  it('excludes refresh from key', () => {
    expect(buildR2Key('https://example.com', ['refresh', 'full'])).toBe(
      'screenshots/https://example.com/full/latest.png'
    );
  });

  it('builds dated key', () => {
    expect(buildR2Key('https://example.com', [], '2026-01-28')).toBe(
      'screenshots/https://example.com/default/2026-01-28.png'
    );
  });

  it('includes social in key', () => {
    expect(buildR2Key('https://example.com', ['social'])).toBe(
      'screenshots/https://example.com/social/latest.png'
    );
  });

  it('handles URL with path', () => {
    expect(buildR2Key('https://example.com/some/page', [])).toBe(
      'screenshots/https://example.com/some/page/default/latest.png'
    );
  });
});
