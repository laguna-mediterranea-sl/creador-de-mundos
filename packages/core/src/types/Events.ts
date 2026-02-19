import type { Hotspot } from './Hotspot.js';

/**
 * Mapa de eventos que emite el WorldEngine.
 * Tipado fuerte: cada evento tiene su firma exacta de argumentos.
 */
export interface EngineEventMap {
  'world:loaded': (worldId: string) => void;
  'world:changed': (fromId: string, toId: string) => void;
  'hotspot:clicked': (hotspot: Hotspot) => void;
  'hotspot:visited': (hotspotId: string, worldId: string) => void;
  'portal:entered': (targetWorldId: string) => void;
  'quiz:answered': (hotspotId: string, answer: number, correct: boolean) => void;
  'audio:started': (hotspotId: string) => void;
  'audio:ended': (hotspotId: string) => void;
  'progress:updated': (visited: number, total: number) => void;
  'vr:entered': () => void;
  'vr:exited': () => void;
  'error': (error: Error) => void;
}

/** Nombres de eventos válidos */
export type EngineEvent = keyof EngineEventMap;
