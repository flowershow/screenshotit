import { describe, expect, it } from 'vitest';
import { renderChangelogPage, type ChangelogEntry } from './changelog';

describe('changelog page', () => {
  it('renders the newest account release and a link home', () => {
    const html = renderChangelogPage();

    expect(html).toContain('Account-owned screenshots');
    expect(html).toContain('2026-08-21');
    expect(html).toContain('href="/"');
  });

  it('escapes entry content before rendering HTML', () => {
    const unsafeEntry: ChangelogEntry = {
      date: '2026-08-21',
      title: '<script>alert(1)</script>',
      body: 'Readers <strong>should</strong> see text only.',
    };

    const html = renderChangelogPage([unsafeEntry]);

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Readers &lt;strong&gt;should&lt;/strong&gt; see text only.');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
