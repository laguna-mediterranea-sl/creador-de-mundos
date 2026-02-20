/**
 * ApiClient — Cliente HTTP genérico con retry, timeout, y rate limiting.
 *
 * Base para todas las conexiones API del SDK:
 * - Co-reading (LiveKit tokens, invitaciones)
 * - Story personalization (templates, generación IA)
 * - Scene generation (Marble, Skybox)
 * - TTS narration (Kokoro)
 * - Progress tracking
 */

export interface ApiClientConfig {
  /** URL base de la API (sin trailing slash) */
  baseUrl: string;
  /** Token de autenticación JWT */
  authToken?: string;
  /** Timeout por defecto en ms (default 15000) */
  defaultTimeoutMs?: number;
  /** Número máximo de reintentos en error de red (default 3) */
  maxRetries?: number;
  /** Factor de backoff exponencial en ms (default 1000) */
  retryBackoffMs?: number;
  /** Callback para refrescar el token cuando expira */
  onTokenExpired?: () => Promise<string | null>;
  /** Callback para errores globales */
  onError?: (error: ApiError) => void;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  retryable: boolean;
}

export interface RequestOptions {
  /** Override timeout para esta petición */
  timeoutMs?: number;
  /** Headers adicionales */
  headers?: Record<string, string>;
  /** No incluir token de autenticación */
  skipAuth?: boolean;
  /** Signal para abortar la petición */
  signal?: AbortSignal;
}

/**
 * ApiClient con retry, timeout, y manejo automático de tokens.
 *
 * Features:
 * - Timeout configurable por petición
 * - Retry con backoff exponencial para errores de red
 * - Refresh automático de token JWT cuando expira (401)
 * - Rate limiting del lado del cliente
 * - Parsing automático de JSON
 */
export class ApiClient {
  private config: Required<Omit<ApiClientConfig, 'authToken' | 'onTokenExpired' | 'onError'>> & Pick<ApiClientConfig, 'authToken' | 'onTokenExpired' | 'onError'>;
  private requestCount = 0;
  private requestTimestamps: number[] = [];

  /** Máximo de requests por segundo (client-side throttle) */
  private static readonly MAX_RPS = 50;

  constructor(config: ApiClientConfig) {
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''),
      authToken: config.authToken,
      defaultTimeoutMs: config.defaultTimeoutMs ?? 15000,
      maxRetries: config.maxRetries ?? 3,
      retryBackoffMs: config.retryBackoffMs ?? 1000,
      onTokenExpired: config.onTokenExpired,
      onError: config.onError,
    };
  }

  /** Actualiza el token de autenticación */
  setAuthToken(token: string): void {
    this.config.authToken = token;
  }

  /** GET request */
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  /** POST request */
  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  /** PUT request */
  async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, body, options);
  }

  /** PATCH request */
  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, body, options);
  }

  /** DELETE request */
  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  /**
   * Request genérico con retry y timeout.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    await this.throttle();

    const url = `${this.config.baseUrl}${path}`;
    const timeout = options?.timeoutMs ?? this.config.defaultTimeoutMs;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      if (attempt > 0) {
        // Backoff exponencial
        const delay = this.config.retryBackoffMs * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Combinar signals si hay uno externo
      if (options?.signal?.aborted) {
        throw new Error('Request aborted');
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...options?.headers,
        };

        if (this.config.authToken && !options?.skipAuth) {
          headers['Authorization'] = `Bearer ${this.config.authToken}`;
        }

        const res = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Token expirado — intentar refresh
        if (res.status === 401 && this.config.onTokenExpired && attempt === 0) {
          const newToken = await this.config.onTokenExpired();
          if (newToken) {
            this.config.authToken = newToken;
            continue; // Reintentar con nuevo token
          }
        }

        if (!res.ok) {
          const errorBody = await res.text().catch(() => '');
          const apiError: ApiError = {
            status: res.status,
            message: errorBody || res.statusText,
            retryable: res.status >= 500 || res.status === 429,
          };

          this.config.onError?.(apiError);

          if (apiError.retryable && attempt < this.config.maxRetries) {
            lastError = new Error(`API error ${res.status}: ${apiError.message}`);
            continue;
          }

          throw new Error(`API error ${res.status}: ${apiError.message}`);
        }

        // Respuesta vacía (204 No Content)
        if (res.status === 204) {
          return undefined as T;
        }

        return await res.json();
      } catch (err) {
        clearTimeout(timeoutId);

        if (err instanceof Error && err.name === 'AbortError') {
          lastError = new Error(`Request timeout after ${timeout}ms: ${method} ${path}`);
          if (attempt < this.config.maxRetries) continue;
          throw lastError;
        }

        // Error de red — reintentar
        if (err instanceof TypeError && attempt < this.config.maxRetries) {
          lastError = err;
          continue;
        }

        throw err;
      }
    }

    throw lastError ?? new Error(`Request failed after ${this.config.maxRetries} retries`);
  }

  /**
   * Throttle del lado del cliente para no exceder MAX_RPS.
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 1000);

    if (this.requestTimestamps.length >= ApiClient.MAX_RPS) {
      const oldestInWindow = this.requestTimestamps[0]!;
      const waitMs = 1000 - (now - oldestInWindow);
      if (waitMs > 0) {
        await new Promise(r => setTimeout(r, waitMs));
      }
    }

    this.requestTimestamps.push(Date.now());
    this.requestCount++;
  }

  /** Número total de requests realizados */
  get totalRequests(): number {
    return this.requestCount;
  }
}
