import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldLoader } from '../src/loader/WorldLoader.js';
import type { World } from '../src/types/World.js';

function createMockWorld(overrides: Partial<World> = {}): World {
  return {
    id: 'test-world-001',
    title: 'Test World',
    asset: {
      type: 'panorama',
      url: 'https://cdn.example.com/worlds/test.jpg',
      format: 'jpg',
    },
    metadata: {},
    hotspots: [],
    ...overrides,
  };
}

describe('WorldLoader', () => {
  let loader: WorldLoader;

  beforeEach(() => {
    loader = new WorldLoader();
  });

  describe('registerWorlds', () => {
    it('should register multiple worlds', () => {
      const world1 = createMockWorld({ id: 'world-1', title: 'World 1' });
      const world2 = createMockWorld({ id: 'world-2', title: 'World 2' });

      loader.registerWorlds([world1, world2]);

      expect(loader.worldCount).toBe(2);
      expect(loader.hasWorld('world-1')).toBe(true);
      expect(loader.hasWorld('world-2')).toBe(true);
    });
  });

  describe('getWorld', () => {
    it('should return registered world', async () => {
      const world = createMockWorld();
      loader.registerWorlds([world]);

      const result = await loader.getWorld('test-world-001');
      expect(result).toEqual(world);
    });

    it('should throw for non-existent world', async () => {
      await expect(loader.getWorld('nonexistent')).rejects.toThrow(
        'World "nonexistent" not found'
      );
    });
  });

  describe('getRegisteredWorld', () => {
    it('should return world synchronously', () => {
      const world = createMockWorld();
      loader.registerWorlds([world]);

      expect(loader.getRegisteredWorld('test-world-001')).toEqual(world);
    });

    it('should return undefined for non-existent world', () => {
      expect(loader.getRegisteredWorld('nonexistent')).toBeUndefined();
    });
  });

  describe('getAllWorlds', () => {
    it('should return all registered worlds', () => {
      const w1 = createMockWorld({ id: 'w1' });
      const w2 = createMockWorld({ id: 'w2' });
      loader.registerWorlds([w1, w2]);

      const all = loader.getAllWorlds();
      expect(all).toHaveLength(2);
      expect(all.map(w => w.id)).toContain('w1');
      expect(all.map(w => w.id)).toContain('w2');
    });
  });

  describe('loadFromUrl', () => {
    it('should load world from valid URL', async () => {
      const worldData = createMockWorld({ id: 'remote-1' });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(worldData),
      }));

      const result = await loader.loadFromUrl('https://api.example.com/worlds/1.json');

      expect(result.id).toBe('remote-1');
      expect(loader.hasWorld('remote-1')).toBe(true);

      vi.unstubAllGlobals();
    });

    it('should throw on HTTP error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }));

      await expect(
        loader.loadFromUrl('https://api.example.com/worlds/bad.json')
      ).rejects.toThrow('Failed to load world');

      vi.unstubAllGlobals();
    });

    it('should throw on invalid data (missing id)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ title: 'No ID' }),
      }));

      await expect(
        loader.loadFromUrl('https://api.example.com/worlds/bad.json')
      ).rejects.toThrow('missing or empty "id"');

      vi.unstubAllGlobals();
    });

    it('should throw on invalid data (missing asset)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'test', title: 'Test' }),
      }));

      await expect(
        loader.loadFromUrl('https://api.example.com/worlds/bad.json')
      ).rejects.toThrow('missing "asset"');

      vi.unstubAllGlobals();
    });

    it('should cache results from URL', async () => {
      const worldData = createMockWorld({ id: 'cached-1' });
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(worldData),
      });
      vi.stubGlobal('fetch', fetchMock);

      await loader.loadFromUrl('https://api.example.com/w1.json');
      await loader.loadFromUrl('https://api.example.com/w1.json');

      // fetch should only be called once (second time from cache)
      expect(fetchMock).toHaveBeenCalledTimes(1);

      vi.unstubAllGlobals();
    });
  });

  describe('dispose', () => {
    it('should clear all worlds', () => {
      loader.registerWorlds([createMockWorld()]);
      loader.dispose();

      expect(loader.worldCount).toBe(0);
    });
  });
});
