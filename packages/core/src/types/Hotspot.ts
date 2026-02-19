/**
 * Posición en coordenadas esféricas.
 * Usada para posicionar hotspots en la esfera panorámica.
 */
export interface SphericalPosition {
  /** Ángulo horizontal (radianes, 0 a 2π) */
  theta: number;
  /** Ángulo vertical (radianes, -π/2 a π/2) */
  phi: number;
}

/** Tipos de hotspot disponibles */
export type HotspotType = 'info' | 'portal' | 'quiz' | 'media';

/** Tamaños de hotspot */
export type HotspotSize = 'sm' | 'md' | 'lg';

/** Efectos de transición entre mundos */
export type TransitionEffect = 'fade' | 'warp' | 'dissolve';

/** Contenido asociado a un hotspot */
export interface HotspotContent {
  title: string;
  text?: string;
  image?: string;
  video?: string;
  audioUrl?: string;
  audioAutoGenerate?: boolean;
}

/** Configuración de portal (solo para type: 'portal') */
export interface HotspotPortal {
  targetWorldId: string;
  transitionEffect?: TransitionEffect;
}

/** Configuración de quiz (solo para type: 'quiz') */
export interface HotspotQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/** Apariencia visual del hotspot */
export interface HotspotAppearance {
  icon?: string;
  color?: string;
  size?: HotspotSize;
  pulseAnimation?: boolean;
}

/** Definición completa de un hotspot interactivo */
export interface Hotspot {
  id: string;
  type: HotspotType;
  position: SphericalPosition;
  content: HotspotContent;
  portal?: HotspotPortal;
  quiz?: HotspotQuiz;
  appearance?: HotspotAppearance;
}
