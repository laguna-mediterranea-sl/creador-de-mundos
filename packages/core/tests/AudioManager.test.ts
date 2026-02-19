import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioManager } from '../src/audio/AudioManager.js';
import { EventBus } from '../src/events/EventBus.js';
import type { AudioConfig } from '../src/types/Config.js';

const mockConfig: AudioConfig = {
  ttsProvider: 'webspeech',
  ttsLang: 'es-ES',
};

describe('AudioManager', () => {
  let manager: AudioManager;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    manager = new AudioManager(mockConfig, eventBus);
  });

  describe('initial state', () => {
    it('should not be playing initially', () => {
      expect(manager.isPlaying).toBe(false);
    });

    it('should have no active hotspot', () => {
      expect(manager.playingHotspotId).toBeNull();
    });
  });

  describe('setMuted', () => {
    it('should prevent playback when muted', async () => {
      manager.setMuted(true);

      // Should not throw, just return without playing
      await manager.playForHotspot('h1', {
        title: 'Test',
        text: 'Hello',
        audioAutoGenerate: true,
      });

      expect(manager.isPlaying).toBe(false);
    });
  });

  describe('setVolume', () => {
    it('should clamp volume between 0 and 1', () => {
      manager.setVolume(-0.5);
      manager.setVolume(2.0);
      // No error, volume is internally clamped
    });
  });

  describe('stop', () => {
    it('should not throw when nothing is playing', () => {
      expect(() => manager.stop()).not.toThrow();
    });
  });

  describe('pause / resume', () => {
    it('should not throw when nothing is playing', () => {
      expect(() => manager.pause()).not.toThrow();
      expect(() => manager.resume()).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('should prevent further playback', async () => {
      manager.dispose();

      await manager.playForHotspot('h1', {
        title: 'Test',
        text: 'Hello',
        audioAutoGenerate: true,
      });

      expect(manager.isPlaying).toBe(false);
    });

    it('should not throw when disposed multiple times', () => {
      manager.dispose();
      expect(() => manager.dispose()).not.toThrow();
    });
  });

  describe('playForHotspot with audio file', () => {
    it('should play pre-generated audio when audioUrl is provided', async () => {
      // Mock HTMLAudioElement
      const mockPlay = vi.fn().mockResolvedValue(undefined);
      const mockPause = vi.fn();

      const listeners: Record<string, EventListenerOrEventListenerObject> = {};

      vi.stubGlobal('Audio', vi.fn().mockImplementation(() => ({
        play: mockPlay,
        pause: mockPause,
        addEventListener: (event: string, handler: EventListenerOrEventListenerObject) => {
          listeners[event] = handler;
        },
        removeEventListener: vi.fn(),
        volume: 1,
        currentTime: 0,
        paused: false,
      })));

      const startedListener = vi.fn();
      eventBus.on('audio:started', startedListener);

      const playPromise = manager.playForHotspot('h1', {
        title: 'Test',
        audioUrl: 'https://cdn.example.com/audio.mp3',
      });

      // Simulate 'play' event
      if (typeof listeners['play'] === 'function') {
        listeners['play'](new Event('play'));
      }

      // Simulate 'ended' event
      if (typeof listeners['ended'] === 'function') {
        listeners['ended'](new Event('ended'));
      }

      await playPromise;

      expect(mockPlay).toHaveBeenCalled();
      expect(startedListener).toHaveBeenCalledWith('h1');

      vi.unstubAllGlobals();
    });
  });
});
