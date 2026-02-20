import { useState, useEffect, useCallback } from 'react';
import { useCoReading } from './CoReadingProvider.js';

export interface RemoteInteraction {
  type: 'hotspot_tap' | 'emoji';
  x?: number;
  y?: number;
  hotspotId?: string;
  emoji?: string;
  timestamp: number;
}

/**
 * useRemoteInteractions — Hook para ver las interacciones del otro dispositivo.
 *
 * Útil para el narrador: ve dónde toca el hijo en la pantalla,
 * qué hotspots explora, qué emojis envía.
 *
 * Las interacciones se acumulan con un máximo configurable
 * y se desvanecen después de un timeout.
 */
export function useRemoteInteractions(options?: {
  maxInteractions?: number;
  fadeTimeoutMs?: number;
}) {
  const maxInteractions = options?.maxInteractions ?? 10;
  const fadeTimeoutMs = options?.fadeTimeoutMs ?? 5000;

  const { state } = useCoReading();
  const [interactions, setInteractions] = useState<RemoteInteraction[]>([]);

  // Escuchar eventos remotos del co-reading state
  useEffect(() => {
    if (state.lastEmoji) {
      const interaction: RemoteInteraction = {
        type: 'emoji',
        emoji: state.lastEmoji,
        timestamp: Date.now(),
      };
      setInteractions(prev => [...prev.slice(-maxInteractions + 1), interaction]);
    }
  }, [state.lastEmoji, maxInteractions]);

  // Limpiar interacciones antiguas
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - fadeTimeoutMs;
      setInteractions(prev => prev.filter(i => i.timestamp > cutoff));
    }, 1000);
    return () => clearInterval(interval);
  }, [fadeTimeoutMs]);

  const clearInteractions = useCallback(() => {
    setInteractions([]);
  }, []);

  return {
    interactions,
    clearInteractions,
    hasInteractions: interactions.length > 0,
  };
}
