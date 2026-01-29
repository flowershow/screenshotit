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
      contentType: 'image/png',
    },
  };

  // Save to latest
  await bucket.put(latestKey, imageData, options);

  // Save to dated version
  const today = metadata.captured_at.split('T')[0];
  const datedKey = latestKey.replace('latest.png', `${today}.png`);
  await bucket.put(datedKey, imageData, options);
}
