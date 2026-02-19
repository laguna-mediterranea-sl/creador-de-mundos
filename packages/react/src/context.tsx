import { createContext, useContext } from 'react';
import type { WorldEngine, EngineTheme } from '@world-engine/core';

/** State shared via context between WorldViewer and child components */
export interface WorldEngineContextValue {
  engine: WorldEngine | null;
  theme: EngineTheme;
  loading: boolean;
  error: Error | null;
}

export const WorldEngineContext = createContext<WorldEngineContextValue | null>(null);

/**
 * Accesses the WorldEngine context. Throws if used outside WorldViewer.
 */
export function useWorldEngineContext(): WorldEngineContextValue {
  const ctx = useContext(WorldEngineContext);
  if (!ctx) {
    throw new Error(
      '[WorldEngine] useWorldEngineContext must be used within a <WorldViewer> component.'
    );
  }
  return ctx;
}
