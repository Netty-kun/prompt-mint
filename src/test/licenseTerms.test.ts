import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchActiveLicenseTerms, fetchListingTerms } from '../lib/checkout/licenseTerms';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('License Terms API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchActiveLicenseTerms', () => {
    it('returns active license terms when API succeeds', async () => {
      const terms = [
        { _id: '1', version: 1, title: 'Standard License', content: 'Terms content', isActive: true },
        { _id: '2', version: 2, title: 'Pro License', content: 'Pro terms content', isActive: true },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => terms,
      });

      const result = await fetchActiveLicenseTerms();
      expect(result).toEqual(terms);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/license-terms/active'));
    });

    it('returns empty array when API fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const result = await fetchActiveLicenseTerms();
      expect(result).toEqual([]);
    });
  });

  describe('fetchListingTerms', () => {
    it('returns listing terms when API succeeds', async () => {
      const term = { _id: '1', version: 1, title: 'Standard License', content: 'Terms content', isActive: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => term,
      });

      const result = await fetchListingTerms('prompt-123');
      expect(result).toEqual(term);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/license-terms/listing/prompt-123'));
    });

    it('returns null when listing not found', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const result = await fetchListingTerms('nonexistent');
      expect(result).toBeNull();
    });
  });
});
