import type { EngineTheme } from './Theme.js';
import type { World } from './World.js';

/** Proveedor de Text-to-Speech */
export type TTSProvider = 'webspeech' | 'kokoro-local' | 'kokoro-api';

/** Configuración de audio */
export interface AudioConfig {
  ttsProvider: TTSProvider;
  ttsLang: string;
  ttsVoice?: string;
  spatialAudio?: boolean;
}

/** Configuración del renderer */
export interface RendererConfig {
  preferSplats: boolean;
  fallbackToPano: boolean;
  maxPixelRatio: number;
  antialias: boolean;
}

/** Itinerario ordenado de mundos (Aulas Mágicas) */
export interface Itinerary {
  title: string;
  description?: string;
  worldOrder: string[];
  enforceOrder?: boolean;
}

/** Callbacks que el Shell registra para recibir eventos del engine */
export interface EngineCallbacks {
  onWorldChange?: (worldId: string) => void;
  onHotspotVisit?: (hotspotId: string, worldId: string) => void;
  onQuizAnswer?: (hotspotId: string, correct: boolean) => void;
  onProgress?: (visited: number, total: number) => void;
  onError?: (error: Error) => void;
}

/**
 * Configuración principal del WorldEngine.
 * El Shell (producto) pasa esta configuración al inicializar el engine.
 */
export interface EngineConfig {
  /** Elemento DOM contenedor o selector CSS */
  container: HTMLElement | string;
  theme: EngineTheme;
  worlds: World[];
  initialWorldId?: string;
  itinerary?: Itinerary;
  audio: AudioConfig;
  renderer: RendererConfig;
  callbacks?: EngineCallbacks;
}
