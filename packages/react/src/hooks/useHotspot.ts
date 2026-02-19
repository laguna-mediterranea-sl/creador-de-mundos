import { useState, useEffect } from 'react';
import type { Hotspot } from '@world-engine/core';
import { useWorldEngineContext } from '../context.js';

export interface HotspotState {
  /** Hotspot actualmente seleccionado/abierto */
  activeHotspot: Hotspot | null;
  /** Número de hotspots visitados en el mundo actual */
  visitedCount: number;
  /** Número total de hotspots en el mundo actual */
  totalCount: number;
}

/**
 * Hook que expone el estado reactivo del hotspot activo.
 *
 * Escucha los eventos del engine para actualizar:
 * - El hotspot seleccionado (al hacer clic)
 * - El progreso de visitados
 */
export function useHotspot(): HotspotState {
  const { engine } = useWorldEngineContext();

  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
  const [visitedCount, setVisitedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!engine) return;

    const unsubClick = engine.on('hotspot:clicked', (hotspot: Hotspot) => {
      setActiveHotspot(hotspot);
    });

    const unsubProgress = engine.on('progress:updated', (visited: number, total: number) => {
      setVisitedCount(visited);
      setTotalCount(total);
    });

    const unsubWorldLoaded = engine.on('world:loaded', () => {
      setActiveHotspot(null);
      setTotalCount(engine.totalHotspots);
      setVisitedCount(engine.visitedCount);
    });

    // Initial state
    setTotalCount(engine.totalHotspots);
    setVisitedCount(engine.visitedCount);

    return () => {
      unsubClick();
      unsubProgress();
      unsubWorldLoaded();
    };
  }, [engine]);

  return { activeHotspot, visitedCount, totalCount };
}
