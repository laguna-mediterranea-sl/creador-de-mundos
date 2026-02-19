import { useState, useEffect, useCallback } from 'react';
import type { TransitionEffect } from '@world-engine/core';
import { useWorldEngineContext } from '../context.js';

export interface NavigationState {
  /** Se puede ir al siguiente mundo del itinerario */
  canGoNext: boolean;
  /** Se puede ir al mundo anterior del itinerario */
  canGoPrevious: boolean;
  /** Índice actual en el itinerario (0-based, -1 si no hay itinerario) */
  itineraryIndex: number;
  /** Total de mundos en el itinerario */
  itineraryTotal: number;
}

export interface NavigationActions {
  goToWorld: (worldId: string, transition?: TransitionEffect) => Promise<void>;
  nextWorld: () => Promise<void>;
  previousWorld: () => Promise<void>;
  goBack: () => Promise<void>;
}

/**
 * Hook que expone el estado y acciones de navegación entre mundos.
 */
export function useNavigation(): NavigationState & NavigationActions {
  const { engine } = useWorldEngineContext();

  const [navState, setNavState] = useState<NavigationState>({
    canGoNext: false,
    canGoPrevious: false,
    itineraryIndex: -1,
    itineraryTotal: 0,
  });

  const updateNavState = useCallback(() => {
    if (!engine) return;
    setNavState({
      canGoNext: engine.canGoNext,
      canGoPrevious: engine.canGoPrevious,
      itineraryIndex: engine.itineraryIndex,
      itineraryTotal: engine.itineraryTotal,
    });
  }, [engine]);

  useEffect(() => {
    if (!engine) return;

    const unsubLoaded = engine.on('world:loaded', () => updateNavState());
    const unsubChanged = engine.on('world:changed', () => updateNavState());

    updateNavState();

    return () => {
      unsubLoaded();
      unsubChanged();
    };
  }, [engine, updateNavState]);

  const goToWorld = useCallback(async (worldId: string, transition?: TransitionEffect) => {
    if (!engine) return;
    await engine.goToWorld(worldId, transition);
  }, [engine]);

  const nextWorld = useCallback(async () => {
    if (!engine) return;
    await engine.nextWorld();
  }, [engine]);

  const previousWorld = useCallback(async () => {
    if (!engine) return;
    await engine.previousWorld();
  }, [engine]);

  const goBack = useCallback(async () => {
    if (!engine) return;
    await engine.goBack();
  }, [engine]);

  return {
    ...navState,
    goToWorld,
    nextWorld,
    previousWorld,
    goBack,
  };
}
