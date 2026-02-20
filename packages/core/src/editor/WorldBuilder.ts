import type { World, WorldAsset, WorldCamera } from '../types/World.js';
import type { Hotspot, SphericalPosition, HotspotType, HotspotContent } from '../types/Hotspot.js';

/**
 * WorldBuilder — API fluida para crear mundos programáticamente.
 *
 * Usado por:
 * - Panel admin para crear mundos desde editor visual
 * - API de generación automática (Marble, IA)
 * - Seeds y tests
 *
 * Ejemplo:
 *   const world = new WorldBuilder('mi-mundo', 'Mi Mundo')
 *     .setAsset({ type: 'panorama', url: 'scene.jpg', format: 'jpg' })
 *     .addHotspot('info', { theta: 0, phi: 0 }, { title: 'Punto 1' })
 *     .setCamera({ initialLon: 180 })
 *     .build();
 */
export class WorldBuilder {
  private world: Partial<World>;
  private hotspots: Hotspot[] = [];
  private hotspotCounter = 0;

  constructor(id: string, title: string) {
    this.world = {
      id,
      title,
      description: undefined,
      metadata: {},
      hotspots: [],
      linkedWorlds: [],
    };
  }

  /** Establece la descripción del mundo. */
  setDescription(description: string): this {
    this.world.description = description;
    return this;
  }

  /** Establece el asset (panorama o splat). */
  setAsset(asset: WorldAsset): this {
    this.world.asset = asset;
    return this;
  }

  /** Establece la configuración de cámara. */
  setCamera(camera: Partial<WorldCamera>): this {
    this.world.camera = camera as WorldCamera;
    return this;
  }

  /** Establece metadata adicional. */
  setMetadata(metadata: Record<string, unknown>): this {
    this.world.metadata = metadata;
    return this;
  }

  /**
   * Añade un hotspot al mundo.
   * @returns el ID generado del hotspot
   */
  addHotspot(
    type: HotspotType,
    position: SphericalPosition,
    content: HotspotContent,
    options?: {
      id?: string;
      portal?: { targetWorldId: string; transitionEffect?: string };
      quiz?: {
        question: string;
        options: string[];
        correctIndex: number;
        explanation: string;
      };
      appearance?: {
        color?: string;
        size?: 'sm' | 'md' | 'lg';
        icon?: string;
        pulseAnimation?: boolean;
      };
    }
  ): string {
    this.hotspotCounter++;
    const id = options?.id ?? `${type}-${this.world.id}-${this.hotspotCounter}`;

    const hotspot: Hotspot = {
      id,
      type,
      position,
      content,
      portal: options?.portal ? {
        targetWorldId: options.portal.targetWorldId,
        transitionEffect: (options.portal.transitionEffect as Hotspot['portal'] extends { transitionEffect?: infer T } ? T : never) ?? undefined,
      } : undefined,
      quiz: options?.quiz,
      appearance: options?.appearance,
    };

    this.hotspots.push(hotspot);
    return id;
  }

  /**
   * Añade un hotspot de tipo info.
   */
  addInfoHotspot(
    position: SphericalPosition,
    title: string,
    text?: string,
    options?: { image?: string; audioUrl?: string; audioAutoGenerate?: boolean }
  ): string {
    return this.addHotspot('info', position, {
      title,
      text,
      image: options?.image,
      audioUrl: options?.audioUrl,
      audioAutoGenerate: options?.audioAutoGenerate,
    });
  }

  /**
   * Añade un hotspot de tipo portal.
   */
  addPortalHotspot(
    position: SphericalPosition,
    title: string,
    targetWorldId: string
  ): string {
    return this.addHotspot('portal', position, { title }, {
      portal: { targetWorldId },
    });
  }

  /**
   * Añade un hotspot de tipo quiz.
   */
  addQuizHotspot(
    position: SphericalPosition,
    title: string,
    quiz: {
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }
  ): string {
    return this.addHotspot('quiz', position, { title }, { quiz });
  }

  /**
   * Elimina un hotspot por ID.
   */
  removeHotspot(id: string): this {
    this.hotspots = this.hotspots.filter(h => h.id !== id);
    return this;
  }

  /**
   * Actualiza la posición de un hotspot.
   */
  moveHotspot(id: string, position: SphericalPosition): this {
    const hotspot = this.hotspots.find(h => h.id === id);
    if (hotspot) {
      hotspot.position = position;
    }
    return this;
  }

  /**
   * Actualiza el contenido de un hotspot.
   */
  updateHotspotContent(id: string, content: Partial<HotspotContent>): this {
    const hotspot = this.hotspots.find(h => h.id === id);
    if (hotspot) {
      hotspot.content = { ...hotspot.content, ...content };
    }
    return this;
  }

  /**
   * Construye el mundo final.
   * Valida que todos los campos requeridos estén presentes.
   */
  build(): World {
    if (!this.world.id) throw new Error('World id is required');
    if (!this.world.title) throw new Error('World title is required');
    if (!this.world.asset) throw new Error('World asset is required');

    return {
      id: this.world.id,
      title: this.world.title,
      description: this.world.description,
      asset: this.world.asset,
      metadata: this.world.metadata ?? {},
      hotspots: [...this.hotspots],
      linkedWorlds: this.world.linkedWorlds,
      camera: this.world.camera,
    } as World;
  }

  /**
   * Serializa el mundo a JSON (para guardar en BD o enviar a API).
   */
  toJSON(): string {
    return JSON.stringify(this.build(), null, 2);
  }

  /**
   * Crea un WorldBuilder desde un mundo existente (para edición).
   */
  static fromWorld(world: World): WorldBuilder {
    const builder = new WorldBuilder(world.id, world.title);
    builder.world = { ...world };
    builder.hotspots = world.hotspots.map(h => ({ ...h }));
    builder.hotspotCounter = world.hotspots.length;
    return builder;
  }
}
