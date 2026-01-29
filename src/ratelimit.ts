// src/ratelimit.ts
type Modifier = 'full' | 'mobile' | 'refresh';

function getRateLimitKey(url: string, modifiers: Modifier[]): string {
  const today = new Date().toISOString().split('T')[0];
  const modifierPart =
    modifiers.filter((m) => m !== 'refresh').sort().join('-') || 'default';
  return `ratelimit/${today}/${url}/${modifierPart}`;
}

export async function checkRefreshRateLimit(
  bucket: R2Bucket,
  url: string,
  modifiers: Modifier[]
): Promise<boolean> {
  const key = getRateLimitKey(url, modifiers);
  const existing = await bucket.head(key);
  return existing === null;
}

export async function recordRefresh(
  bucket: R2Bucket,
  url: string,
  modifiers: Modifier[]
): Promise<void> {
  const key = getRateLimitKey(url, modifiers);
  // Store empty object, just need the key to exist
  // Auto-expires after 1 day
  await bucket.put(key, '', {
    customMetadata: { recorded_at: new Date().toISOString() },
  });
}
