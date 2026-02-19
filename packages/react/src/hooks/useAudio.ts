import { useState, useEffect, useCallback } from 'react';
import { useWorldEngineContext } from '../context.js';

export interface AudioState {
  /** Se está reproduciendo audio */
  isPlaying: boolean;
  /** ID del hotspot cuyo audio se reproduce */
  playingHotspotId: string | null;
  /** Audio silenciado */
  muted: boolean;
}

export interface AudioActions {
  /** Reproduce audio de un hotspot */
  playHotspotAudio: (hotspotId: string) => Promise<void>;
  /** Detiene el audio en curso */
  stopAudio: () => void;
  /** Silencia/activa audio */
  setMuted: (muted: boolean) => void;
  /** Establece volumen (0.0-1.0) */
  setVolume: (volume: number) => void;
}

/**
 * Hook que expone el estado y acciones de audio del engine.
 */
export function useAudio(): AudioState & AudioActions {
  const { engine } = useWorldEngineContext();

  const [isPlaying, setIsPlaying] = useState(false);
  const [playingHotspotId, setPlayingHotspotId] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    if (!engine) return;

    const unsubStarted = engine.on('audio:started', (hotspotId: string) => {
      setIsPlaying(true);
      setPlayingHotspotId(hotspotId);
    });

    const unsubEnded = engine.on('audio:ended', () => {
      setIsPlaying(false);
      setPlayingHotspotId(null);
    });

    return () => {
      unsubStarted();
      unsubEnded();
    };
  }, [engine]);

  const playHotspotAudio = useCallback(async (hotspotId: string) => {
    if (!engine) return;
    await engine.playHotspotAudio(hotspotId);
  }, [engine]);

  const stopAudio = useCallback(() => {
    engine?.stopAudio();
  }, [engine]);

  const setMuted = useCallback((value: boolean) => {
    engine?.setMuted(value);
    setMutedState(value);
  }, [engine]);

  const setVolume = useCallback((value: number) => {
    engine?.setVolume(value);
  }, [engine]);

  return {
    isPlaying,
    playingHotspotId,
    muted,
    playHotspotAudio,
    stopAudio,
    setMuted,
    setVolume,
  };
}
