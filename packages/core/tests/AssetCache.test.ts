import { describe, it, expect, beforeEach } from 'vitest';
import { AssetCache } from '../src/loader/AssetCache.js';

describe('AssetCache', () => {
  let cache: AssetCache;

  beforeEach(() => {
    cache = new AssetCache(5); // Small limit for testing eviction
  });

  describe('set / get', () => {
    it('should store and retrieve a value', () => {
      cache.set('key1', { name: 'test' });
      expect(cache.get<{ name: string }>('key1')).toEqual({ name: 'test' });
    });

    it('should return undefined for non-existent key', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should overwrite existing values', () => {
      cache.set('key1', 'first');
      cache.set('key1', 'second');
      expect(cache.get<string>('key1')).toBe('second');
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.set('key1', 'value');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove entry and return true', () => {
      cache.set('key1', 'value');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.has('key1')).toBe(false);
    });

    it('should return false for non-existent key', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'a');
      cache.set('key2', 'b');
      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('size', () => {
    it('should return correct count', () => {
      expect(cache.size).toBe(0);
      cache.set('key1', 'a');
      expect(cache.size).toBe(1);
      cache.set('key2', 'b');
      expect(cache.size).toBe(2);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when max capacity is reached', () => {
      cache.set('k1', 1);
      cache.set('k2', 2);
      cache.set('k3', 3);
      cache.set('k4', 4);
      cache.set('k5', 5);

      // Cache is full (5). Adding another should evict k1 (oldest)
      cache.set('k6', 6);

      expect(cache.has('k1')).toBe(false);
      expect(cache.has('k6')).toBe(true);
      expect(cache.size).toBe(5);
    });

    it('should promote accessed entries (LRU behavior)', () => {
      cache.set('k1', 1);
      cache.set('k2', 2);
      cache.set('k3', 3);
      cache.set('k4', 4);
      cache.set('k5', 5);

      // Access k1, making it most recently used
      cache.get('k1');

      // Now add k6 — k2 should be evicted (it's now oldest)
      cache.set('k6', 6);

      expect(cache.has('k1')).toBe(true);  // k1 was promoted
      expect(cache.has('k2')).toBe(false); // k2 was evicted
      expect(cache.has('k6')).toBe(true);
    });
  });
});
