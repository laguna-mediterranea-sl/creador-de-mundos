import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Navigator } from '../src/navigation/Navigator.js';
import { EventBus } from '../src/events/EventBus.js';

describe('Navigator', () => {
  let navigator: Navigator;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    navigator = new Navigator(eventBus);
    navigator.init(['world-1', 'world-2', 'world-3']);
  });

  describe('navigateTo', () => {
    it('should navigate to an available world', async () => {
      const result = await navigator.navigateTo('world-1');
      expect(result).toBe(true);
      expect(navigator.currentWorld).toBe('world-1');
    });

    it('should emit world:loaded event', async () => {
      const listener = vi.fn();
      eventBus.on('world:loaded', listener);

      await navigator.navigateTo('world-1');
      expect(listener).toHaveBeenCalledWith('world-1');
    });

    it('should emit world:changed when navigating from one world to another', async () => {
      const listener = vi.fn();
      eventBus.on('world:changed', listener);

      await navigator.navigateTo('world-1');
      await navigator.navigateTo('world-2');

      expect(listener).toHaveBeenCalledWith('world-1', 'world-2');
    });

    it('should return false for unavailable world', async () => {
      const errorListener = vi.fn();
      eventBus.on('error', errorListener);

      const result = await navigator.navigateTo('nonexistent');
      expect(result).toBe(false);
      expect(errorListener).toHaveBeenCalled();
    });

    it('should return true for same world (no-op)', async () => {
      await navigator.navigateTo('world-1');
      const result = await navigator.navigateTo('world-1');
      expect(result).toBe(true);
    });

    it('should emit portal:entered when transition effect is provided', async () => {
      const listener = vi.fn();
      eventBus.on('portal:entered', listener);

      await navigator.navigateTo('world-1', 'fade');
      expect(listener).toHaveBeenCalledWith('world-1');
    });
  });

  describe('history / goBack', () => {
    it('should track navigation history', async () => {
      await navigator.navigateTo('world-1');
      await navigator.navigateTo('world-2');

      expect(navigator.canGoBack).toBe(true);
    });

    it('should navigate back through history', async () => {
      await navigator.navigateTo('world-1');
      await navigator.navigateTo('world-2');

      const result = await navigator.goBack();
      expect(result).toBe(true);
      expect(navigator.currentWorld).toBe('world-1');
    });

    it('should return false when no history available', async () => {
      await navigator.navigateTo('world-1');
      const result = await navigator.goBack();
      expect(result).toBe(false);
    });
  });

  describe('itinerary navigation', () => {
    beforeEach(() => {
      navigator.init(['world-1', 'world-2', 'world-3'], {
        title: 'Test Itinerary',
        worldOrder: ['world-1', 'world-2', 'world-3'],
      });
    });

    it('should navigate to next world in itinerary', async () => {
      await navigator.navigateTo('world-1');

      const result = await navigator.goNext();
      expect(result).toBe(true);
      expect(navigator.currentWorld).toBe('world-2');
    });

    it('should navigate to previous world in itinerary', async () => {
      await navigator.navigateTo('world-1');
      await navigator.goNext(); // world-2

      const result = await navigator.goPrevious();
      expect(result).toBe(true);
      expect(navigator.currentWorld).toBe('world-1');
    });

    it('should return false at end of itinerary', async () => {
      await navigator.navigateTo('world-1');
      await navigator.goNext(); // world-2
      await navigator.goNext(); // world-3

      const result = await navigator.goNext();
      expect(result).toBe(false);
    });

    it('should return false at start of itinerary', async () => {
      await navigator.navigateTo('world-1');

      const result = await navigator.goPrevious();
      expect(result).toBe(false);
    });

    it('should report correct itinerary index', async () => {
      await navigator.navigateTo('world-1');
      expect(navigator.currentItineraryIndex).toBe(0);

      await navigator.goNext();
      expect(navigator.currentItineraryIndex).toBe(1);
    });

    it('should report correct itinerary length', () => {
      expect(navigator.itineraryLength).toBe(3);
    });
  });

  describe('itinerary with enforceOrder', () => {
    beforeEach(() => {
      navigator.init(['world-1', 'world-2', 'world-3'], {
        title: 'Strict Itinerary',
        worldOrder: ['world-1', 'world-2', 'world-3'],
        enforceOrder: true,
      });
    });

    it('should allow navigation to first world', async () => {
      const result = await navigator.navigateTo('world-1');
      expect(result).toBe(true);
    });

    it('should allow navigation to next world in order', async () => {
      await navigator.navigateTo('world-1');
      const result = await navigator.navigateTo('world-2');
      expect(result).toBe(true);
    });

    it('should block skipping ahead', async () => {
      await navigator.navigateTo('world-1');
      const errorListener = vi.fn();
      eventBus.on('error', errorListener);

      const result = await navigator.navigateTo('world-3');
      expect(result).toBe(false);
      expect(errorListener).toHaveBeenCalled();
    });

    it('should allow navigating back to previous worlds', async () => {
      await navigator.navigateTo('world-1');
      await navigator.navigateTo('world-2');

      const result = await navigator.navigateTo('world-1');
      expect(result).toBe(true);
    });
  });

  describe('canGoNext / canGoPrevious', () => {
    beforeEach(() => {
      navigator.init(['world-1', 'world-2', 'world-3'], {
        title: 'Test',
        worldOrder: ['world-1', 'world-2', 'world-3'],
      });
    });

    it('canGoNext should be true at start', async () => {
      await navigator.navigateTo('world-1');
      expect(navigator.canGoNext).toBe(true);
    });

    it('canGoNext should be false at end', async () => {
      await navigator.navigateTo('world-3');
      expect(navigator.canGoNext).toBe(false);
    });

    it('canGoPrevious should be false at start', async () => {
      await navigator.navigateTo('world-1');
      expect(navigator.canGoPrevious).toBe(false);
    });

    it('canGoPrevious should be true after navigating forward', async () => {
      await navigator.navigateTo('world-1');
      await navigator.goNext();
      expect(navigator.canGoPrevious).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should clear all state', async () => {
      await navigator.navigateTo('world-1');
      navigator.dispose();

      expect(navigator.currentWorld).toBeNull();
      expect(navigator.itineraryLength).toBe(0);
    });
  });
});
