import type { Hotspot, SphericalPosition } from './Hotspot.js';

/** Tipo de asset 3D del mundo */
export type AssetType = 'panorama' | 'splat';

/** Formato de archivo del asset */
export type AssetFormat = 'jpg' | 'png' | 'spz' | 'ply';

/** Configuración del asset visual del mundo */
export interface WorldAsset {
  type: AssetType;
  url: string;
  format: AssetFormat;
  /** URL de panorama alternativa si el splat falla */
  fallbackPano?: string;
  /** URL de imagen thumbnail */
  thumbnail?: string;
  resolution?: string;
  sizeBytes?: number;
}

/** Metadatos del mundo (educativos, temáticos, etc.) */
export interface WorldMetadata {
  materia?: string;
  nivel?: string;
  tema?: string;
  tags?: string[];
  curriculo?: string;
  ageRange?: [number, number];
  generatedWith?: string;
  generatedDate?: string;
}

/** Enlace a mundo conectado (portal) */
export interface LinkedWorld {
  worldId: string;
  label: string;
  position: SphericalPosition;
}

/** Configuración de cámara por defecto del mundo */
export interface WorldCamera {
  initialLon?: number;
  initialLat?: number;
  fov?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
}

/** Definición completa de un mundo 3D */
export interface World {
  id: string;
  title: string;
  description?: string;
  asset: WorldAsset;
  metadata: WorldMetadata;
  hotspots: Hotspot[];
  linkedWorlds?: LinkedWorld[];
  camera?: WorldCamera;
}
