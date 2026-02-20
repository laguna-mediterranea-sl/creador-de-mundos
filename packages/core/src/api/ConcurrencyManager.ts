/**
 * ConcurrencyManager — Control de concurrencia para múltiples usuarios simultáneos.
 *
 * Diseñado para los escenarios críticos del sistema:
 * 1. Generación de contenidos (IA) — operaciones lentas que no deben saturar
 * 2. Sesiones WebRTC (co-reading) — conexiones simultáneas que necesitan gestión
 * 3. Uploads de media — subidas grandes concurrentes
 * 4. API requests generales — throttling para evitar sobrecargar el backend
 *
 * Patterns implementados:
 * - Semaphore: Limita ejecuciones concurrentes
 * - Queue: Cola FIFO con prioridad para operaciones pendientes
 * - Debounce: Agrupa operaciones repetidas
 * - Bulkhead: Aísla pools de recursos por tipo de operación
 */

/** Prioridad de ejecución */
export type TaskPriority = 'high' | 'normal' | 'low';

interface QueuedTask<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  priority: TaskPriority;
  timestamp: number;
  label?: string;
}

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

/**
 * Semaphore — Limita el número de operaciones concurrentes.
 */
export class Semaphore {
  private current = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrent: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.maxConcurrent) {
      this.current++;
      return;
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.current--;
    const next = this.queue.shift();
    if (next) {
      this.current++;
      next();
    }
  }

  get available(): number {
    return this.maxConcurrent - this.current;
  }

  get waiting(): number {
    return this.queue.length;
  }
}

/**
 * TaskPool — Pool de tareas con concurrencia limitada y priorización.
 *
 * Ejemplo: pool de generación de cuentos con máximo 3 simultáneos.
 */
export class TaskPool {
  private semaphore: Semaphore;
  private queue: QueuedTask<unknown>[] = [];
  private activeCount = 0;
  private totalProcessed = 0;
  private totalErrors = 0;

  constructor(
    /** Nombre del pool (para logging) */
    public readonly name: string,
    /** Máximo de tareas concurrentes */
    private maxConcurrent: number
  ) {
    this.semaphore = new Semaphore(maxConcurrent);
  }

  /**
   * Ejecuta una tarea en el pool.
   * Si el pool está lleno, la tarea se encola con prioridad.
   */
  async execute<T>(
    fn: () => Promise<T>,
    options?: { priority?: TaskPriority; label?: string }
  ): Promise<T> {
    const priority = options?.priority ?? 'normal';

    return new Promise<T>((resolve, reject) => {
      const task: QueuedTask<T> = {
        execute: fn,
        resolve: resolve as (v: unknown) => void,
        reject,
        priority,
        timestamp: Date.now(),
        label: options?.label,
      } as unknown as QueuedTask<T>;

      this.enqueue(task as QueuedTask<unknown>);
      this.processQueue();
    });
  }

  private enqueue(task: QueuedTask<unknown>): void {
    // Insertar en orden de prioridad (priority-queue simple)
    let inserted = false;
    for (let i = 0; i < this.queue.length; i++) {
      if (PRIORITY_WEIGHT[task.priority] < PRIORITY_WEIGHT[this.queue[i]!.priority]) {
        this.queue.splice(i, 0, task);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.queue.push(task);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) return;
    if (this.activeCount >= this.maxConcurrent) return;

    const task = this.queue.shift();
    if (!task) return;

    this.activeCount++;

    try {
      await this.semaphore.acquire();
      const result = await task.execute();
      task.resolve(result);
      this.totalProcessed++;
    } catch (err) {
      task.reject(err instanceof Error ? err : new Error(String(err)));
      this.totalErrors++;
    } finally {
      this.semaphore.release();
      this.activeCount--;
      // Procesar siguiente en cola
      this.processQueue();
    }
  }

  /** Estadísticas del pool */
  get stats() {
    return {
      name: this.name,
      active: this.activeCount,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      totalProcessed: this.totalProcessed,
      totalErrors: this.totalErrors,
    };
  }
}

/**
 * ConcurrencyManager — Gestor global de concurrencia con pools aislados.
 *
 * Cada tipo de operación tiene su propio pool (Bulkhead pattern):
 * - Generación de contenido (IA): máx 3 simultáneos
 * - Sesiones WebRTC: máx 100 simultáneas
 * - Uploads: máx 5 simultáneos
 * - API requests: máx 20 simultáneos
 *
 * Esto asegura que una sobrecarga en generación de contenidos
 * NO afecta a las sesiones WebRTC activas.
 */
export class ConcurrencyManager {
  private pools = new Map<string, TaskPool>();

  /** Pool por defecto para generación de contenidos IA */
  readonly contentGeneration: TaskPool;
  /** Pool por defecto para sesiones WebRTC (co-reading) */
  readonly webrtcSessions: TaskPool;
  /** Pool por defecto para subida de media */
  readonly mediaUploads: TaskPool;
  /** Pool por defecto para requests API generales */
  readonly apiRequests: TaskPool;

  constructor(config?: {
    maxContentGeneration?: number;
    maxWebRTCSessions?: number;
    maxMediaUploads?: number;
    maxApiRequests?: number;
  }) {
    this.contentGeneration = new TaskPool(
      'content-generation',
      config?.maxContentGeneration ?? 3
    );
    this.webrtcSessions = new TaskPool(
      'webrtc-sessions',
      config?.maxWebRTCSessions ?? 100
    );
    this.mediaUploads = new TaskPool(
      'media-uploads',
      config?.maxMediaUploads ?? 5
    );
    this.apiRequests = new TaskPool(
      'api-requests',
      config?.maxApiRequests ?? 20
    );

    this.pools.set(this.contentGeneration.name, this.contentGeneration);
    this.pools.set(this.webrtcSessions.name, this.webrtcSessions);
    this.pools.set(this.mediaUploads.name, this.mediaUploads);
    this.pools.set(this.apiRequests.name, this.apiRequests);
  }

  /**
   * Crea un pool custom con nombre y concurrencia.
   */
  createPool(name: string, maxConcurrent: number): TaskPool {
    const pool = new TaskPool(name, maxConcurrent);
    this.pools.set(name, pool);
    return pool;
  }

  /**
   * Obtiene un pool por nombre.
   */
  getPool(name: string): TaskPool | undefined {
    return this.pools.get(name);
  }

  /**
   * Estadísticas de todos los pools.
   */
  get stats() {
    return Array.from(this.pools.values()).map(p => p.stats);
  }

  /**
   * Estadísticas resumidas.
   */
  get summary() {
    const allStats = this.stats;
    return {
      totalActive: allStats.reduce((sum, s) => sum + s.active, 0),
      totalQueued: allStats.reduce((sum, s) => sum + s.queued, 0),
      totalProcessed: allStats.reduce((sum, s) => sum + s.totalProcessed, 0),
      totalErrors: allStats.reduce((sum, s) => sum + s.totalErrors, 0),
      pools: allStats,
    };
  }
}

/**
 * debounce — Utility para agrupar llamadas repetidas.
 * Útil para rate-limiting de operaciones del usuario (ej: typing, scrolling).
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * throttle — Utility para limitar la frecuencia de ejecución.
 * Ejecuta inmediatamente y luego ignora llamadas durante el intervalo.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  intervalMs: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= intervalMs) {
      lastCall = now;
      fn(...args);
    }
  };
}
