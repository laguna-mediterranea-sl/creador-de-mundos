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

  /** Default fetch timeout in milliseconds */
  private static readonly FETCH_TIMEOUT_MS = 15000;

  /**
   * Carga un mundo desde una URL JSON remota.
   * Incluye timeout de 15s para evitar bloqueos en conexiones lentas.
   */
  async loadFromUrl(url: string): Promise<World> {
    // Check cache
    const cached = this.cache.get<World>(`url:${url}`);
    if (cached) return cached;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WorldLoader.FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`World load timeout (${WorldLoader.FETCH_TIMEOUT_MS}ms): ${url}`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

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

    // Validate individual hotspots
    const hotspots = obj['hotspots'] as unknown[];
    for (let i = 0; i < hotspots.length; i++) {
      this.validateHotspot(hotspots[i], i);
    }

    // Ensure metadata exists
    if (!obj['metadata'] || typeof obj['metadata'] !== 'object') {
      (obj as Record<string, unknown>)['metadata'] = {};
    }

    return data as World;
  }

  /**
   * Valida un hotspot individual dentro de un mundo.
   * Comprueba id, type, position bounds y quiz integrity.
   */
  private validateHotspot(data: unknown, index: number): void {
    if (!data || typeof data !== 'object') {
      throw new Error(`Invalid hotspot at index ${index}: expected object`);
    }

    const h = data as Record<string, unknown>;

    if (typeof h['id'] !== 'string' || h['id'].length === 0) {
      throw new Error(`Hotspot at index ${index} missing or empty "id"`);
    }

    const validTypes = ['info', 'portal', 'quiz', 'media'];
    if (typeof h['type'] !== 'string' || !validTypes.includes(h['type'])) {
      throw new Error(`Hotspot "${h['id']}" has invalid type: "${h['type']}". Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate position
    if (!h['position'] || typeof h['position'] !== 'object') {
      throw new Error(`Hotspot "${h['id']}" missing "position" object`);
    }
    const pos = h['position'] as Record<string, unknown>;
    if (typeof pos['theta'] !== 'number' || isNaN(pos['theta'])) {
      throw new Error(`Hotspot "${h['id']}" has invalid position.theta`);
    }
    if (typeof pos['phi'] !== 'number' || isNaN(pos['phi'])) {
      throw new Error(`Hotspot "${h['id']}" has invalid position.phi`);
    }

    // Validate content exists
    if (!h['content'] || typeof h['content'] !== 'object') {
      throw new Error(`Hotspot "${h['id']}" missing "content" object`);
    }
    const content = h['content'] as Record<string, unknown>;
    if (typeof content['title'] !== 'string' || content['title'].length === 0) {
      throw new Error(`Hotspot "${h['id']}" missing content.title`);
    }

    // Validate quiz-specific fields
    if (h['type'] === 'quiz') {
      if (!h['quiz'] || typeof h['quiz'] !== 'object') {
        throw new Error(`Quiz hotspot "${h['id']}" missing "quiz" object`);
      }
      const quiz = h['quiz'] as Record<string, unknown>;
      if (!Array.isArray(quiz['options']) || quiz['options'].length < 2) {
        throw new Error(`Quiz hotspot "${h['id']}" needs at least 2 options`);
      }
      if (typeof quiz['correctIndex'] !== 'number' || quiz['correctIndex'] < 0 || quiz['correctIndex'] >= (quiz['options'] as unknown[]).length) {
        throw new Error(`Quiz hotspot "${h['id']}" has invalid correctIndex`);
      }
    }

    // Validate portal-specific fields
    if (h['type'] === 'portal') {
      if (!h['portal'] || typeof h['portal'] !== 'object') {
        throw new Error(`Portal hotspot "${h['id']}" missing "portal" object`);
      }
      const portal = h['portal'] as Record<string, unknown>;
      if (typeof portal['targetWorldId'] !== 'string' || portal['targetWorldId'].length === 0) {
        throw new Error(`Portal hotspot "${h['id']}" missing portal.targetWorldId`);
      }
    }
  }
}
