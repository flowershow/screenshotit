// src/storage.ts
export interface ScreenshotMetadata {
  captured_at: string;
  target_url: string;
  modifiers: string;
}

export interface StoredScreenshot {
  data: ReadableStream;
  metadata: ScreenshotMetadata;
}

export async function getScreenshot(
  bucket: R2Bucket,
  key: string
): Promise<StoredScreenshot | null> {
  const object = await bucket.get(key);
  if (!object) {
    return null;
  }

  return {
    data: object.body,
    metadata: object.customMetadata as unknown as ScreenshotMetadata,
  };
}

export async function saveScreenshot(
  bucket: R2Bucket,
  latestKey: string,
  imageData: Uint8Array,
  metadata: ScreenshotMetadata
): Promise<void> {
  const options = {
    customMetadata: {
      captured_at: metadata.captured_at,
      target_url: metadata.target_url,
      modifiers: metadata.modifiers,
    } as Record<string, string>,
    httpMetadata: {
      contentType: 'image/webp',
    },
  };

  // Save to latest
  await bucket.put(latestKey, imageData, options);

  // Save to dated version
  const today = metadata.captured_at.split('T')[0];
  const datedKey = latestKey.replace('latest.webp', `${today}.webp`);
  await bucket.put(datedKey, imageData, options);
}

export async function findNearestDate(
  bucket: R2Bucket,
  prefix: string,
  beforeDate: string
): Promise<string | null> {
  const listed = await bucket.list({ prefix });
  let nearest: string | null = null;

  for (const object of listed.objects) {
    const filename = object.key.split('/').pop() || '';
    const match = filename.match(/^(\d{4}-\d{2}-\d{2})\.webp$/);
    if (!match) continue;
    const date = match[1];
    if (date < beforeDate && (!nearest || date > nearest)) {
      nearest = date;
    }
  }

  return nearest;
}

export async function getScreenshotPrefixSize(
  bucket: R2Bucket,
  prefix: string
): Promise<number> {
  const objects = await listScreenshotPrefix(bucket, prefix);
  return objects.reduce((total, object) => total + object.size, 0);
}

export async function deleteScreenshotPrefix(
  bucket: R2Bucket,
  prefix: string
): Promise<{ objectCount: number; byteSize: number }> {
  const objects = await listScreenshotPrefix(bucket, prefix);
  const keys = objects.map((object) => object.key);
  for (let index = 0; index < keys.length; index += 1000) {
    await bucket.delete(keys.slice(index, index + 1000));
  }
  return {
    objectCount: objects.length,
    byteSize: objects.reduce((total, object) => total + object.size, 0),
  };
}

async function listScreenshotPrefix(
  bucket: R2Bucket,
  prefix: string
): Promise<R2Object[]> {
  const objects: R2Object[] = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, ...(cursor ? { cursor } : {}) });
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return objects;
}
