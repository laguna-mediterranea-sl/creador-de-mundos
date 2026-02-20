/**
 * ConnectionManager — Gestión de conectividad para alta concurrencia.
 *
 * Proporciona:
 * - Detección online/offline
 * - Cola de requests pendientes cuando offline
 * - Reconexión automática con backoff exponencial
 * - Circuit breaker para prevenir cascadas de fallos
 * - Heartbeat para detectar pérdida de conexión silenciosa
 */

export type ConnectionStatus = 'online' | 'offline' | 'degraded';

export interface ConnectionManagerConfig {
  /** URL de health check (GET → 200 = OK) */
  healthCheckUrl: string;
  /** Intervalo de heartbeat en ms (default 30000) */
  heartbeatIntervalMs?: number;
  /** Máximo de requests en cola cuando offline (default 50) */
  maxQueueSize?: number;
  /** Threshold de fallos para circuit breaker (default 5) */
  circuitBreakerThreshold?: number;
  /** Tiempo de reset del circuit breaker en ms (default 30000) */
  circuitBreakerResetMs?: number;
  /** Callbacks */
  onStatusChange?: (status: ConnectionStatus) => void;
  onQueueDrained?: (count: number) => void;
}

interface QueuedRequest {
  execute: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * ConnectionManager con circuit breaker y cola de requests.
 *
 * Patterns implementados:
 * 1. Circuit Breaker: Tras N fallos consecutivos, deja de enviar requests
 *    durante un período de enfriamiento. Previene sobrecargar un servidor caído.
 *
 * 2. Request Queue: Cuando offline, las peticiones se encolan y se ejecutan
 *    automáticamente al recuperar conexión.
 *
 * 3. Heartbeat: Ping periódico al health endpoint para detectar
 *    pérdida de conexión silenciosa (ej: WiFi conectado pero sin internet).
 */
export class ConnectionManager {
  private status: ConnectionStatus = 'online';
  private queue: QueuedRequest[] = [];
  private consecutiveFailures = 0;
  private circuitOpen = false;
  private circuitOpenedAt = 0;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private disposed = false;

  private readonly config: Required<Omit<ConnectionManagerConfig, 'onStatusChange' | 'onQueueDrained'>> & Pick<ConnectionManagerConfig, 'onStatusChange' | 'onQueueDrained'>;

  constructor(config: ConnectionManagerConfig) {
    this.config = {
      healthCheckUrl: config.healthCheckUrl,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 30000,
      maxQueueSize: config.maxQueueSize ?? 50,
      circuitBreakerThreshold: config.circuitBreakerThreshold ?? 5,
      circuitBreakerResetMs: config.circuitBreakerResetMs ?? 30000,
      onStatusChange: config.onStatusChange,
      onQueueDrained: config.onQueueDrained,
    };

    this.setupBrowserListeners();
  }

  /** Estado actual de la conexión */
  get currentStatus(): ConnectionStatus {
    return this.status;
  }

  /** Si está online y el circuit breaker está cerrado */
  get isReady(): boolean {
    return this.status === 'online' && !this.circuitOpen;
  }

  /** Número de requests en cola */
  get queueSize(): number {
    return this.queue.length;
  }

  /**
   * Inicia el monitoreo de conexión (heartbeat).
   */
  start(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat().catch(() => {});
    }, this.config.heartbeatIntervalMs);

    // Heartbeat inicial
    this.performHeartbeat().catch(() => {});
  }

  /**
   * Ejecuta una función con gestión de conectividad.
   * Si offline o circuit open, encola la petición.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Si está online y circuit cerrado, ejecutar directamente
    if (this.isReady) {
      try {
        const result = await fn();
        this.recordSuccess();
        return result;
      } catch (err) {
        this.recordFailure();
        throw err;
      }
    }

    // Check circuit breaker reset
    if (this.circuitOpen && Date.now() - this.circuitOpenedAt > this.config.circuitBreakerResetMs) {
      this.circuitOpen = false;
      this.consecutiveFailures = 0;

      // Intentar ejecutar (half-open state)
      try {
        const result = await fn();
        this.recordSuccess();
        return result;
      } catch (err) {
        this.recordFailure();
        throw err;
      }
    }

    // Encolar request
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error('Request queue full. Too many pending requests.');
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: fn as () => Promise<unknown>,
        resolve: resolve as (v: unknown) => void,
        reject,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Registra un éxito — resetea el circuit breaker.
   */
  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    if (this.circuitOpen) {
      this.circuitOpen = false;
    }
    if (this.status !== 'online') {
      this.setStatus('online');
    }
  }

  /**
   * Registra un fallo — puede abrir el circuit breaker.
   */
  private recordFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.config.circuitBreakerThreshold) {
      this.circuitOpen = true;
      this.circuitOpenedAt = Date.now();
      this.setStatus('degraded');
    }
  }

  /**
   * Heartbeat: ping al health endpoint.
   */
  private async performHeartbeat(): Promise<void> {
    if (this.disposed) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(this.config.healthCheckUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        this.recordSuccess();
        // Drenar cola si hay requests pendientes
        await this.drainQueue();
      } else {
        this.recordFailure();
      }
    } catch {
      this.recordFailure();
    }
  }

  /**
   * Procesa la cola de requests pendientes.
   */
  private async drainQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    const toProcess = [...this.queue];
    this.queue = [];
    let processed = 0;

    for (const item of toProcess) {
      // Descartar requests muy antiguas (más de 60s)
      if (Date.now() - item.timestamp > 60000) {
        item.reject(new Error('Request expired while queued'));
        continue;
      }

      try {
        const result = await item.execute();
        item.resolve(result);
        processed++;
      } catch (err) {
        item.reject(err instanceof Error ? err : new Error(String(err)));
      }
    }

    if (processed > 0) {
      this.config.onQueueDrained?.(processed);
    }
  }

  /**
   * Configura listeners del navegador para online/offline.
   */
  private setupBrowserListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.setStatus('online');
      this.performHeartbeat().catch(() => {});
    });

    window.addEventListener('offline', () => {
      this.setStatus('offline');
    });
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.config.onStatusChange?.(status);
  }

  /**
   * Detiene el monitoreo y limpia recursos.
   */
  dispose(): void {
    this.disposed = true;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    // Rechazar requests pendientes
    for (const item of this.queue) {
      item.reject(new Error('ConnectionManager disposed'));
    }
    this.queue = [];
  }
}
