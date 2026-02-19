import type { World } from '../types/World.js';
import { AssetCache } from './AssetCache.js';

/**
 * Carga definiciones de mundos y sus assets.
 *
 * Fuentes de carga:
 * 1. Mundos pasados inline en EngineConfig.worlds (ya resueltos)
 * 2. JSON remoto (URL que devuelve un World)
 *
 * El WorldLoader NO carga texturas Three.js (eso lo hace PanoRenderer).
 * Solo resuelve las definiciones JSON de mundos.
 */
export class WorldLoader {
  private worlds = new Map<string, World>();
  private cache: AssetCache;

  constructor(cacheMaxEntries = 50) {
    this.cache = new AssetCache(cacheMaxEntries);
  }

  /**
   * Registra mundos ya resueltos (pasados inline en la config).
   */
  registerWorlds(worlds: World[]): void {
    for (const world of worlds) {
      this.worlds.set(world.id, world);
    }
  }

  /**
   * Carga un mundo por ID. Primero busca en mundos registrados,
   * luego en cache remoto.
   */
  async getWorld(worldId: string): Promise<World> {
    // Check registered worlds
    const registered = this.worlds.get(worldId);
    if (registered) return registered;

    // Check cache
    const cached = this.cache.get<World>(`world:${worldId}`);
    if (cached) return cached;

    throw new Error(`World "${worldId}" not found. Register it via config or load from URL.`);
  }

  /**
   * Carga un mundo desde una URL JSON remota.
   */
  async loadFromUrl(url: string): Promise<World> {
    // Check cache
    const cached = this.cache.get<World>(`url:${url}`);
    if (cached) return cached;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load world from ${url}: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();
    const world = this.validateWorldData(data);

    // Cache and register
    this.cache.set(`url:${url}`, world);
    this.worlds.set(world.id, world);

    return world;
  }

  /**
   * Obtiene todos los mundos registrados.
   */
  getAllWorlds(): World[] {
    return Array.from(this.worlds.values());
  }

  /**
   * Obtiene un mundo registrado por ID (síncrono, solo registrados).
   */
  getRegisteredWorld(worldId: string): World | undefined {
    return this.worlds.get(worldId);
  }

  /**
   * Comprueba si un mundo está registrado.
   */
  hasWorld(worldId: string): boolean {
    return this.worlds.has(worldId);
  }

  /**
   * Número de mundos registrados.
   */
  get worldCount(): number {
    return this.worlds.size;
  }

  /**
   * Limpia mundos registrados y cache.
   */
  dispose(): void {
    this.worlds.clear();
    this.cache.clear();
  }

  /**
   * Valida que los datos cargados cumplan la interfaz World mínima.
   * No usamos un schema validator externo — validación manual ligera.
   */
  private validateWorldData(data: unknown): World {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid world data: expected object');
    }

    const obj = data as Record<string, unknown>;

    if (typeof obj['id'] !== 'string' || obj['id'].length === 0) {
      throw new Error('Invalid world data: missing or empty "id"');
    }
    if (typeof obj['title'] !== 'string' || obj['title'].length === 0) {
      throw new Error('Invalid world data: missing or empty "title"');
    }
    if (!obj['asset'] || typeof obj['asset'] !== 'object') {
      throw new Error('Invalid world data: missing "asset" object');
    }

    const asset = obj['asset'] as Record<string, unknown>;
    if (typeof asset['type'] !== 'string' || !['panorama', 'splat'].includes(asset['type'])) {
      throw new Error('Invalid world data: asset.type must be "panorama" or "splat"');
    }
    if (typeof asset['url'] !== 'string' || asset['url'].length === 0) {
      throw new Error('Invalid world data: missing or empty "asset.url"');
    }

    // Ensure hotspots is an array (default to empty)
    if (!Array.isArray(obj['hotspots'])) {
      (obj as Record<string, unknown>)['hotspots'] = [];
    }

    // Ensure metadata exists
    if (!obj['metadata'] || typeof obj['metadata'] !== 'object') {
      (obj as Record<string, unknown>)['metadata'] = {};
    }

    return data as World;
  }
}
