import type { SphericalPosition } from '../types/Hotspot.js';

/**
 * Posición de un hotspot dentro de un template.
 */
export interface TemplatePosition {
  /** Posición esférica (theta/phi para WorldEngine, pitch/yaw para Pannellum) */
  position: SphericalPosition;
  /** Etiqueta descriptiva ("Frente", "Derecha", etc.) */
  label: string;
  /** Pitch/Yaw para compatibilidad con Pannellum */
  pitch?: number;
  yaw?: number;
}

/**
 * Template de distribución de hotspots.
 * Define posiciones predefinidas para distribuir hotspots en una escena.
 */
export interface HotspotTemplate {
  id: string;
  name: string;
  description: string;
  pointCount: number;
  positions: TemplatePosition[];
  isDefault: boolean;
}

/**
 * Convierte coordenadas Pannellum (pitch/yaw en grados) a esféricas (theta/phi en radianes).
 * Pannellum: pitch = -90(abajo) a +90(arriba), yaw = -180 a +180
 * WorldEngine: theta = 0 a 2π, phi = -π/2 a π/2
 */
function pannellumToSpherical(pitch: number, yaw: number): SphericalPosition {
  const phi = (pitch * Math.PI) / 180;
  let theta = ((yaw + 180) * Math.PI) / 180;
  if (theta < 0) theta += 2 * Math.PI;
  if (theta >= 2 * Math.PI) theta -= 2 * Math.PI;
  return { theta, phi };
}

/**
 * Templates predefinidos para distribución de hotspots.
 * Compatibles tanto con WorldEngine (theta/phi) como Pannellum (pitch/yaw).
 */
export const DEFAULT_TEMPLATES: HotspotTemplate[] = [
  {
    id: 'standard-5',
    name: '5 puntos estándar',
    description: 'Distribución equilibrada 360° — la más versátil',
    pointCount: 5,
    isDefault: true,
    positions: [
      { position: pannellumToSpherical(5, 0), label: 'Frente', pitch: 5, yaw: 0 },
      { position: pannellumToSpherical(10, 72), label: 'Derecha', pitch: 10, yaw: 72 },
      { position: pannellumToSpherical(-5, 144), label: 'Derecha-trasera', pitch: -5, yaw: 144 },
      { position: pannellumToSpherical(15, -72), label: 'Izquierda', pitch: 15, yaw: -72 },
      { position: pannellumToSpherical(0, -144), label: 'Izquierda-trasera', pitch: 0, yaw: -144 },
    ],
  },
  {
    id: 'immersive-6',
    name: '6 puntos envolvente',
    description: 'Cobertura completa con variación vertical',
    pointCount: 6,
    isDefault: true,
    positions: [
      { position: pannellumToSpherical(0, 0), label: 'Frente', pitch: 0, yaw: 0 },
      { position: pannellumToSpherical(20, 60), label: 'Superior-derecha', pitch: 20, yaw: 60 },
      { position: pannellumToSpherical(-10, 120), label: 'Inferior-derecha', pitch: -10, yaw: 120 },
      { position: pannellumToSpherical(5, 180), label: 'Trasera', pitch: 5, yaw: 180 },
      { position: pannellumToSpherical(15, -120), label: 'Superior-izquierda', pitch: 15, yaw: -120 },
      { position: pannellumToSpherical(-15, -60), label: 'Inferior-izquierda', pitch: -15, yaw: -60 },
    ],
  },
  {
    id: 'frontal-3',
    name: '3 puntos frontal',
    description: 'Para escenas simples con foco frontal',
    pointCount: 3,
    isDefault: true,
    positions: [
      { position: pannellumToSpherical(0, 0), label: 'Centro', pitch: 0, yaw: 0 },
      { position: pannellumToSpherical(5, 45), label: 'Derecha', pitch: 5, yaw: 45 },
      { position: pannellumToSpherical(5, -45), label: 'Izquierda', pitch: 5, yaw: -45 },
    ],
  },
  {
    id: 'compass-4',
    name: '4 puntos cardinales',
    description: 'Norte, Sur, Este, Oeste — ideal para interiores',
    pointCount: 4,
    isDefault: true,
    positions: [
      { position: pannellumToSpherical(0, 0), label: 'Norte', pitch: 0, yaw: 0 },
      { position: pannellumToSpherical(0, 90), label: 'Este', pitch: 0, yaw: 90 },
      { position: pannellumToSpherical(0, 180), label: 'Sur', pitch: 0, yaw: 180 },
      { position: pannellumToSpherical(0, -90), label: 'Oeste', pitch: 0, yaw: -90 },
    ],
  },
  {
    id: 'vertical-4',
    name: '4 puntos verticales',
    description: 'Distribución vertical — ideal para torres, cañones',
    pointCount: 4,
    isDefault: true,
    positions: [
      { position: pannellumToSpherical(60, 0), label: 'Cenit', pitch: 60, yaw: 0 },
      { position: pannellumToSpherical(20, 0), label: 'Superior', pitch: 20, yaw: 0 },
      { position: pannellumToSpherical(-10, 0), label: 'Horizonte', pitch: -10, yaw: 0 },
      { position: pannellumToSpherical(-45, 0), label: 'Inferior', pitch: -45, yaw: 0 },
    ],
  },
];

/**
 * HotspotTemplateRegistry — Registro de templates de hotspots.
 */
export class HotspotTemplateRegistry {
  private templates = new Map<string, HotspotTemplate>();

  constructor() {
    // Cargar templates por defecto
    for (const t of DEFAULT_TEMPLATES) {
      this.templates.set(t.id, t);
    }
  }

  /** Obtiene un template por ID. */
  get(id: string): HotspotTemplate | undefined {
    return this.templates.get(id);
  }

  /** Lista todos los templates. */
  getAll(): HotspotTemplate[] {
    return Array.from(this.templates.values());
  }

  /** Registra un template custom. */
  register(template: HotspotTemplate): void {
    this.templates.set(template.id, template);
  }

  /** Elimina un template (solo custom, no defaults). */
  remove(id: string): boolean {
    const t = this.templates.get(id);
    if (t?.isDefault) return false;
    return this.templates.delete(id);
  }

  /** Número de templates registrados. */
  get count(): number {
    return this.templates.size;
  }
}
