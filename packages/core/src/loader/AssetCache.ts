/**
 * Cache en memoria para assets cargados (texturas, JSON mundos).
 *
 * Evita recargar assets ya descargados cuando el usuario
 * navega de vuelta a un mundo previamente visitado.
 *
 * Funciona como un LRU simple: si se supera maxEntries,
 * elimina la entrada más antigua.
 */
export class AssetCache {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private maxEntries: number;

  constructor(maxEntries = 50) {
    this.maxEntries = maxEntries;
  }

  /**
   * Almacena un valor en cache.
   */
  set<T>(key: string, value: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { data: value, timestamp: Date.now() });
  }

  /**
   * Obtiene un valor del cache, o undefined si no existe.
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data as T;
  }

  /**
   * Comprueba si existe una entrada en cache.
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Elimina una entrada específica.
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Limpia todo el cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Número de entradas en cache.
   */
  get size(): number {
    return this.cache.size;
  }
}
