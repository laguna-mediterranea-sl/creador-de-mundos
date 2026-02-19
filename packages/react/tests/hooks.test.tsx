import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHotspot } from '../src/hooks/useHotspot.js';
import { useNavigation } from '../src/hooks/useNavigation.js';
import { useAudio } from '../src/hooks/useAudio.js';
import { createTestWrapper, createMockEngine } from './test-utils.js';
import type { Hotspot } from '@world-engine/core';

const mockHotspot: Hotspot = {
  id: 'h1',
  type: 'info',
  position: { theta: 0.5, phi: 0.1 },
  content: { title: 'Test Hotspot', text: 'Description' },
};

describe('useHotspot', () => {
  it('should return initial state', () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useHotspot(), { wrapper });

    expect(result.current.activeHotspot).toBeNull();
    expect(result.current.visitedCount).toBe(0);
    expect(result.current.totalCount).toBe(0);
  });

  it('should update when hotspot:clicked event fires', () => {
    const listeners = new Map<string, Function>();
    const engine = createMockEngine({
      on: ((event: string, listener: Function) => {
        listeners.set(event, listener);
        return () => listeners.delete(event);
      }) as ReturnType<typeof createMockEngine>['on'],
      totalHotspots: 5,
      visitedCount: 2,
    });

    const wrapper = createTestWrapper({ engine });
    const { result } = renderHook(() => useHotspot(), { wrapper });

    expect(result.current.totalCount).toBe(5);

    // Simulate hotspot click
    act(() => {
      const clickHandler = listeners.get('hotspot:clicked');
      if (clickHandler) clickHandler(mockHotspot);
    });

    expect(result.current.activeHotspot).toEqual(mockHotspot);
  });

  it('should update progress when progress:updated event fires', () => {
    const listeners = new Map<string, Function>();
    const engine = createMockEngine({
      on: ((event: string, listener: Function) => {
        listeners.set(event, listener);
        return () => listeners.delete(event);
      }) as ReturnType<typeof createMockEngine>['on'],
    });

    const wrapper = createTestWrapper({ engine });
    const { result } = renderHook(() => useHotspot(), { wrapper });

    act(() => {
      const progressHandler = listeners.get('progress:updated');
      if (progressHandler) progressHandler(3, 10);
    });

    expect(result.current.visitedCount).toBe(3);
    expect(result.current.totalCount).toBe(10);
  });
});

describe('useNavigation', () => {
  it('should return initial navigation state', () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useNavigation(), { wrapper });

    expect(result.current.canGoNext).toBe(false);
    expect(result.current.canGoPrevious).toBe(false);
    expect(result.current.itineraryIndex).toBe(-1);
    expect(result.current.itineraryTotal).toBe(0);
  });

  it('should expose navigation actions', () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useNavigation(), { wrapper });

    expect(typeof result.current.goToWorld).toBe('function');
    expect(typeof result.current.nextWorld).toBe('function');
    expect(typeof result.current.previousWorld).toBe('function');
    expect(typeof result.current.goBack).toBe('function');
  });

  it('should call engine.goToWorld when navigating', async () => {
    const goToWorld = vi.fn().mockResolvedValue(undefined);
    const engine = createMockEngine({ goToWorld });
    const wrapper = createTestWrapper({ engine });
    const { result } = renderHook(() => useNavigation(), { wrapper });

    await act(async () => {
      await result.current.goToWorld('world-2');
    });

    expect(goToWorld).toHaveBeenCalledWith('world-2', undefined);
  });
});

describe('useAudio', () => {
  it('should return initial audio state', () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useAudio(), { wrapper });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.playingHotspotId).toBeNull();
    expect(result.current.muted).toBe(false);
  });

  it('should update when audio:started event fires', () => {
    const listeners = new Map<string, Function>();
    const engine = createMockEngine({
      on: ((event: string, listener: Function) => {
        listeners.set(event, listener);
        return () => listeners.delete(event);
      }) as ReturnType<typeof createMockEngine>['on'],
    });

    const wrapper = createTestWrapper({ engine });
    const { result } = renderHook(() => useAudio(), { wrapper });

    act(() => {
      const handler = listeners.get('audio:started');
      if (handler) handler('h1');
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.playingHotspotId).toBe('h1');
  });

  it('should update when audio:ended event fires', () => {
    const listeners = new Map<string, Function>();
    const engine = createMockEngine({
      on: ((event: string, listener: Function) => {
        listeners.set(event, listener);
        return () => listeners.delete(event);
      }) as ReturnType<typeof createMockEngine>['on'],
    });

    const wrapper = createTestWrapper({ engine });
    const { result } = renderHook(() => useAudio(), { wrapper });

    // Start playing
    act(() => {
      const started = listeners.get('audio:started');
      if (started) started('h1');
    });

    // End playing
    act(() => {
      const ended = listeners.get('audio:ended');
      if (ended) ended('h1');
    });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.playingHotspotId).toBeNull();
  });

  it('should call engine.setMuted when toggling mute', () => {
    const setMuted = vi.fn();
    const engine = createMockEngine({ setMuted });
    const wrapper = createTestWrapper({ engine });
    const { result } = renderHook(() => useAudio(), { wrapper });

    act(() => {
      result.current.setMuted(true);
    });

    expect(setMuted).toHaveBeenCalledWith(true);
    expect(result.current.muted).toBe(true);
  });
});
