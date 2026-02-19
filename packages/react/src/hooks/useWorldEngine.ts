import { useState, useEffect, useCallback, useRef } from 'react';
import type { WorldEngine, World, EngineConfig } from '@world-engine/core';

/**
 * Estado reactivo del WorldEngine expuesto a componentes React.
 */
export interface WorldEngineState {
  /** Mundo activo actual */
  activeWorld: World | null;
  /** ID del mundo activo */
  activeWorldId: string | null;
  /** Está cargando un mundo */
  loading: boolean;
  /** Error más reciente */
  error: Error | null;
  /** Lista de todos los mundos disponibles */
  worlds: World[];
}

/**
 * Acciones disponibles sobre el engine.
 */
export interface WorldEngineActions {
  /** Navega a un mundo por ID */
  goToWorld: (worldId: string) => Promise<void>;
  /** Va al siguiente mundo del itinerario */
  nextWorld: () => Promise<void>;
  /** Va al mundo anterior del itinerario */
  previousWorld: () => Promise<void>;
  /** Vuelve al mundo anterior en el historial */
  goBack: () => Promise<void>;
  /** Activa/desactiva auto-rotación */
  setAutoRotate: (enabled: boolean, speed?: number) => void;
  /** Silencia/activa audio */
  setMuted: (muted: boolean) => void;
  /** Establece volumen (0.0-1.0) */
  setVolume: (volume: number) => void;
}

/**
 * Hook principal que inicializa y gestiona el ciclo de vida del WorldEngine.
 *
 * Gestiona:
 * - Creación e inicialización del engine
 * - Estado reactivo (mundo activo, loading, error)
 * - Limpieza (dispose) al desmontar
 * - Escucha de eventos del engine para actualizar estado React
 */
export function useWorldEngine(
  containerRef: React.RefObject<HTMLElement | null>,
  config: Omit<EngineConfig, 'container'> | null
): { state: WorldEngineState; actions: WorldEngineActions; engine: WorldEngine | null } {
  const [state, setState] = useState<WorldEngineState>({
    activeWorld: null,
    activeWorldId: null,
    loading: true,
    error: null,
    worlds: [],
  });

  const engineRef = useRef<WorldEngine | null>(null);
  const initializingRef = useRef(false);

  // Initialize engine
  useEffect(() => {
    if (!containerRef.current || !config || initializingRef.current) return;
    if (engineRef.current) return; // Already initialized

    let disposed = false;
    initializingRef.current = true;

    const initEngine = async () => {
      try {
        // Dynamic import to avoid SSR issues with Three.js
        const { WorldEngine } = await import('@world-engine/core');

        if (disposed) return;

        const engine = new WorldEngine({
          ...config,
          container: containerRef.current!,
        });

        engineRef.current = engine;

        // Wire event listeners to React state
        engine.on('world:loaded', (worldId: string) => {
          if (disposed) return;
          setState(prev => ({
            ...prev,
            activeWorldId: worldId,
            activeWorld: engine.activeWorld,
            loading: false,
            error: null,
          }));
        });

        engine.on('error', (error: Error) => {
          if (disposed) return;
          setState(prev => ({ ...prev, error, loading: false }));
        });

        setState(prev => ({
          ...prev,
          worlds: config.worlds,
          loading: true,
        }));

        await engine.init();

        if (disposed) {
          engine.dispose();
          return;
        }

        setState(prev => ({
          ...prev,
          activeWorld: engine.activeWorld,
          activeWorldId: engine.activeWorldId,
          loading: false,
          worlds: engine.worlds,
        }));
      } catch (err) {
        if (disposed) return;
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err : new Error(String(err)),
          loading: false,
        }));
      } finally {
        initializingRef.current = false;
      }
    };

    initEngine();

    return () => {
      disposed = true;
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [config]); // containerRef.current is checked inside; config triggers re-run when provided

  // Actions (stable references)
  const goToWorld = useCallback(async (worldId: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    setState(prev => ({ ...prev, loading: true }));
    try {
      await engine.goToWorld(worldId);
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error(String(err)),
        loading: false,
      }));
    }
  }, []);

  const nextWorld = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    setState(prev => ({ ...prev, loading: true }));
    await engine.nextWorld();
  }, []);

  const previousWorld = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    setState(prev => ({ ...prev, loading: true }));
    await engine.previousWorld();
  }, []);

  const goBack = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    setState(prev => ({ ...prev, loading: true }));
    await engine.goBack();
  }, []);

  const setAutoRotate = useCallback((enabled: boolean, speed?: number) => {
    engineRef.current?.setAutoRotate(enabled, speed);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    engineRef.current?.setMuted(muted);
  }, []);

  const setVolume = useCallback((volume: number) => {
    engineRef.current?.setVolume(volume);
  }, []);

  const actions: WorldEngineActions = {
    goToWorld,
    nextWorld,
    previousWorld,
    goBack,
    setAutoRotate,
    setMuted,
    setVolume,
  };

  return { state, actions, engine: engineRef.current };
}
