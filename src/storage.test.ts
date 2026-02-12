// src/storage.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getScreenshot, saveScreenshot, findNearestDate, ScreenshotMetadata } from './storage';

describe('storage', () => {
  let mockBucket: {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockBucket = {
      get: vi.fn(),
      put: vi.fn(),
      list: vi.fn(),
    };
  });

  describe('getScreenshot', () => {
    it('returns null when object does not exist', async () => {
      mockBucket.get.mockResolvedValue(null);
      const result = await getScreenshot(
        mockBucket as unknown as R2Bucket,
        'screenshots/example/default/latest.png'
      );
      expect(result).toBeNull();
    });

    it('returns image data when object exists', async () => {
      const mockBody = new Uint8Array([1, 2, 3]);
      mockBucket.get.mockResolvedValue({
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(mockBody);
            controller.close();
          },
        }),
        customMetadata: { captured_at: '2026-01-28T12:00:00Z' },
      });

      const result = await getScreenshot(
        mockBucket as unknown as R2Bucket,
        'screenshots/example/default/latest.png'
      );

      expect(result).not.toBeNull();
      expect(mockBucket.get).toHaveBeenCalledWith(
        'screenshots/example/default/latest.png'
      );
    });
  });

  describe('saveScreenshot', () => {
    it('saves to both latest and dated paths', async () => {
      mockBucket.put.mockResolvedValue({});
      const imageData = new Uint8Array([1, 2, 3]);
      const metadata: ScreenshotMetadata = {
        captured_at: '2026-01-28T12:00:00Z',
        target_url: 'https://example.com',
        modifiers: '',
      };

      await saveScreenshot(
        mockBucket as unknown as R2Bucket,
        'screenshots/https://example.com/default/latest.png',
        imageData,
        metadata
      );

      expect(mockBucket.put).toHaveBeenCalledTimes(2);
      expect(mockBucket.put).toHaveBeenCalledWith(
        'screenshots/https://example.com/default/latest.png',
        imageData,
        expect.objectContaining({ customMetadata: metadata })
      );
      expect(mockBucket.put).toHaveBeenCalledWith(
        expect.stringContaining('screenshots/https://example.com/default/2026-01-28.png'),
        imageData,
        expect.objectContaining({ customMetadata: metadata })
      );
    });
  });

  describe('findNearestDate', () => {
    it('returns nearest date before requested date', async () => {
      mockBucket.list.mockResolvedValue({
        objects: [
          { key: 'screenshots/https://example.com/default/2026-01-20.png' },
          { key: 'screenshots/https://example.com/default/2026-01-25.png' },
          { key: 'screenshots/https://example.com/default/2026-01-30.png' },
          { key: 'screenshots/https://example.com/default/latest.png' },
        ],
      });

      const result = await findNearestDate(
        mockBucket as unknown as R2Bucket,
        'screenshots/https://example.com/default/',
        '2026-01-28'
      );
      expect(result).toBe('2026-01-25');
    });

    it('returns null when no earlier screenshots exist', async () => {
      mockBucket.list.mockResolvedValue({
        objects: [
          { key: 'screenshots/https://example.com/default/2026-02-01.png' },
          { key: 'screenshots/https://example.com/default/latest.png' },
        ],
      });

      const result = await findNearestDate(
        mockBucket as unknown as R2Bucket,
        'screenshots/https://example.com/default/',
        '2026-01-28'
      );
      expect(result).toBeNull();
    });

    it('returns null when no screenshots exist at all', async () => {
      mockBucket.list.mockResolvedValue({ objects: [] });

      const result = await findNearestDate(
        mockBucket as unknown as R2Bucket,
        'screenshots/https://example.com/default/',
        '2026-01-28'
      );
      expect(result).toBeNull();
    });

    it('skips latest.png and non-date files', async () => {
      mockBucket.list.mockResolvedValue({
        objects: [
          { key: 'screenshots/https://example.com/default/latest.png' },
          { key: 'screenshots/https://example.com/default/2026-01-15.png' },
        ],
      });

      const result = await findNearestDate(
        mockBucket as unknown as R2Bucket,
        'screenshots/https://example.com/default/',
        '2026-01-28'
      );
      expect(result).toBe('2026-01-15');
    });
  });
});
