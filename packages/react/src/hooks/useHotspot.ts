import { useState, useEffect, useCallback } from 'react';
import type { Hotspot } from '@world-engine/core';
import { useWorldEngineContext } from '../context.js';

export interface HotspotState {
  /** Hotspot actualmente seleccionado/abierto */
  activeHotspot: Hotspot | null;
  /** Número de hotspots visitados en el mundo actual */
  visitedCount: number;
  /** Número total de hotspots en el mundo actual */
  totalCount: number;
  /** Deselecciona el hotspot activo (cierra el panel) */
  dismiss: () => void;
}

/**
 * Hook que expone el estado reactivo del hotspot activo.
 *
 * Escucha los eventos del engine para actualizar:
 * - El hotspot seleccionado (al hacer clic)
 * - El progreso de visitados
 * - La deselección del hotspot (dismiss)
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

    const unsubDismiss = engine.on('hotspot:dismissed', () => {
      setActiveHotspot(null);
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
      unsubDismiss();
      unsubProgress();
      unsubWorldLoaded();
    };
  }, [engine]);

  const dismiss = useCallback(() => {
    engine?.deselectHotspot();
  }, [engine]);

  return { activeHotspot, visitedCount, totalCount, dismiss };
}
