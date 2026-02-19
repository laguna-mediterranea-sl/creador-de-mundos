import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '../src/events/EventBus.js';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('on / emit', () => {
    it('should call listener when event is emitted', () => {
      const listener = vi.fn();
      bus.on('world:loaded', listener);
      bus.emit('world:loaded', 'world-1');

      expect(listener).toHaveBeenCalledWith('world-1');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should support multiple listeners for same event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      bus.on('world:loaded', listener1);
      bus.on('world:loaded', listener2);
      bus.emit('world:loaded', 'world-1');

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should pass all arguments to listener', () => {
      const listener = vi.fn();
      bus.on('world:changed', listener);
      bus.emit('world:changed', 'from-1', 'to-2');

      expect(listener).toHaveBeenCalledWith('from-1', 'to-2');
    });

    it('should not fail when emitting event with no listeners', () => {
      expect(() => bus.emit('world:loaded', 'world-1')).not.toThrow();
    });

    it('should handle error event with Error argument', () => {
      const listener = vi.fn();
      bus.on('error', listener);
      const error = new Error('test error');
      bus.emit('error', error);

      expect(listener).toHaveBeenCalledWith(error);
    });
  });

  describe('unsubscribe (return value of on)', () => {
    it('should unsubscribe when calling returned function', () => {
      const listener = vi.fn();
      const unsub = bus.on('world:loaded', listener);

      bus.emit('world:loaded', 'world-1');
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      bus.emit('world:loaded', 'world-2');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should clean up empty event sets after unsubscribe', () => {
      const listener = vi.fn();
      const unsub = bus.on('world:loaded', listener);
      unsub();

      expect(bus.listenerCount('world:loaded')).toBe(0);
    });
  });

  describe('off', () => {
    it('should remove a specific listener', () => {
      const listener = vi.fn();
      bus.on('world:loaded', listener);
      bus.off('world:loaded', listener);
      bus.emit('world:loaded', 'world-1');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should not fail when removing non-existent listener', () => {
      const listener = vi.fn();
      expect(() => bus.off('world:loaded', listener)).not.toThrow();
    });
  });

  describe('once', () => {
    it('should call listener only once', () => {
      const listener = vi.fn();
      bus.once('world:loaded', listener);

      bus.emit('world:loaded', 'world-1');
      bus.emit('world:loaded', 'world-2');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('world-1');
    });

    it('should return unsubscribe function that works before trigger', () => {
      const listener = vi.fn();
      const unsub = bus.once('world:loaded', listener);

      unsub();
      bus.emit('world:loaded', 'world-1');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('removeAll', () => {
    it('should remove all listeners for a specific event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      bus.on('world:loaded', listener1);
      bus.on('world:loaded', listener2);

      bus.removeAll('world:loaded');
      bus.emit('world:loaded', 'world-1');

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('should remove all listeners for all events', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      bus.on('world:loaded', listener1);
      bus.on('error', listener2);

      bus.removeAll();
      bus.emit('world:loaded', 'world-1');
      bus.emit('error', new Error('test'));

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('should return 0 for events with no listeners', () => {
      expect(bus.listenerCount('world:loaded')).toBe(0);
    });

    it('should return correct count', () => {
      bus.on('world:loaded', vi.fn());
      bus.on('world:loaded', vi.fn());
      expect(bus.listenerCount('world:loaded')).toBe(2);
    });
  });

  describe('error handling in listeners', () => {
    it('should catch and log errors in listeners without stopping other listeners', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const badListener = vi.fn(() => { throw new Error('bad'); });
      const goodListener = vi.fn();

      bus.on('world:loaded', badListener);
      bus.on('world:loaded', goodListener);
      bus.emit('world:loaded', 'world-1');

      expect(badListener).toHaveBeenCalledTimes(1);
      expect(goodListener).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
