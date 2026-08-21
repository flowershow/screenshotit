export const SESSION_COOKIE = 'screenshotit_session';

export function generateToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

export async function tokensEqual(first: string, second: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [firstHash, secondHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(first)),
    crypto.subtle.digest('SHA-256', encoder.encode(second)),
  ]);
  if (typeof crypto.subtle.timingSafeEqual === 'function') {
    return crypto.subtle.timingSafeEqual(firstHash, secondHash);
  }

  // Node's Web Crypto implementation used by Vitest does not expose the
  // Workers timingSafeEqual extension. Both digests have a fixed length, so a
  // full XOR comparison provides a portable constant-work fallback.
  const firstBytes = new Uint8Array(firstHash);
  const secondBytes = new Uint8Array(secondHash);
  let difference = 0;
  for (let index = 0; index < firstBytes.length; index++) {
    difference |= firstBytes[index] ^ secondBytes[index];
  }
  return difference === 0;
}

export function parseCookieHeader(header: string | null): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const segment of header.split(';')) {
    const separator = segment.indexOf('=');
    if (separator < 0) continue;
    const name = segment.slice(0, separator).trim();
    const value = segment.slice(separator + 1).trim();
    if (name) cookies[name] = decodeURIComponent(value);
  }
  return cookies;
}

export interface SessionCookieOptions {
  secure: boolean;
  maxAgeSeconds: number;
}

export function serializeSessionCookie(
  token: string,
  options: SessionCookieOptions
): string {
  const attributes = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${options.maxAgeSeconds}`,
  ];
  if (options.secure) attributes.push('Secure');
  return attributes.join('; ');
}

export function serializeExpiredSessionCookie(secure: boolean): string {
  const attributes = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }
  return value;
}
