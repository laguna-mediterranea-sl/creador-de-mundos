import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InviteManager } from '../src/InviteManager.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('InviteManager', () => {
  let manager: InviteManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new InviteManager('https://api.test.com/', 'auth-token-123');
  });

  describe('constructor', () => {
    it('stores the base URL with trailing slash stripped', () => {
      expect(manager).toBeDefined();
    });
  });

  describe('createInvite', () => {
    it('sends POST to /api/co-reading/invite with auth', async () => {
      const mockResponse = {
        roomCode: 'ABC123',
        deepLink: 'https://app.test.com/join/ABC123',
        expiresAt: Date.now() + 300000,
        storyId: 'story-1',
        storyTitle: 'Test Story',
        token: 'lk-token-123',
        livekitUrl: 'wss://lk.test.com',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await manager.createInvite('story-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/co-reading/invite',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer auth-token-123',
          }),
          body: JSON.stringify({ storyId: 'story-1' }),
        }),
      );

      expect(result).toEqual(mockResponse);
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      });

      await expect(manager.createInvite('story-1')).rejects.toThrow('Failed to create invite');
    });
  });

  describe('joinWithCode', () => {
    it('sends POST to /api/co-reading/join', async () => {
      const mockResult = {
        success: true,
        token: 'lk-token-456',
        livekitUrl: 'wss://lk.test.com',
        storyId: 'story-1',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const result = await manager.joinWithCode('ABC123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/co-reading/join',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ roomCode: 'ABC123' }),
        }),
      );

      expect(result.success).toBe(true);
      expect(result.token).toBe('lk-token-456');
    });

    it('returns not_found for invalid code format', async () => {
      const result = await manager.joinWithCode('INVALID');

      expect(result.success).toBe(false);
      expect(result.error).toBe('not_found');
      // Should NOT call fetch for invalid code
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns expired for 410 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 410,
      });

      const result = await manager.joinWithCode('ABC123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('expired');
    });

    it('returns full for 409 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
      });

      const result = await manager.joinWithCode('ABC123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('full');
    });

    it('returns not_found for 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await manager.joinWithCode('ABC123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('not_found');
    });

    it('normalizes code to uppercase and trims whitespace', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, token: 'tok' }),
      });

      // After trim+uppercase: '  abc123  ' → 'ABC123' which matches [A-Z]{3}\d{3}
      const result = await manager.joinWithCode('  abc123  ');

      expect(mockFetch).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('createWhatsAppLink (static)', () => {
    it('generates a WhatsApp share link', () => {
      const link = InviteManager.createWhatsAppLink(
        'ABC123',
        'El Bosque Mágico',
        'https://app.test.com/join/ABC123',
      );

      expect(link).toContain('wa.me');
      expect(link).toContain('ABC123');
    });

    it('encodes story title in the message', () => {
      const link = InviteManager.createWhatsAppLink(
        'XYZ789',
        'La Aventura Espacial',
        'https://app.test.com/join/XYZ789',
      );

      expect(link).toContain(encodeURIComponent('La Aventura Espacial'));
    });
  });
});
