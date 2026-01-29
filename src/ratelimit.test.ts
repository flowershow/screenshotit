// src/ratelimit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRefreshRateLimit, recordRefresh } from './ratelimit';

describe('rate limiting', () => {
  let mockBucket: {
    head: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockBucket = {
      head: vi.fn(),
      put: vi.fn(),
    };
  });

  describe('checkRefreshRateLimit', () => {
    it('allows refresh when no previous refresh today', async () => {
      mockBucket.head.mockResolvedValue(null);
      const allowed = await checkRefreshRateLimit(
        mockBucket as unknown as R2Bucket,
        'https://example.com',
        ['full']
      );
      expect(allowed).toBe(true);
    });

    it('blocks refresh when already refreshed today', async () => {
      mockBucket.head.mockResolvedValue({ key: 'exists' });
      const allowed = await checkRefreshRateLimit(
        mockBucket as unknown as R2Bucket,
        'https://example.com',
        ['full']
      );
      expect(allowed).toBe(false);
    });
  });

  describe('recordRefresh', () => {
    it('records refresh with correct key', async () => {
      mockBucket.put.mockResolvedValue({});
      await recordRefresh(
        mockBucket as unknown as R2Bucket,
        'https://example.com',
        ['full']
      );
      expect(mockBucket.put).toHaveBeenCalledWith(
        expect.stringContaining('ratelimit/'),
        '',
        expect.any(Object)
      );
    });
  });
});
