import type { EngineEventMap, EngineEvent } from '../types/Events.js';

type Listener<E extends EngineEvent> = EngineEventMap[E];

/**
 * Bus de eventos tipado para comunicación SDK ↔ Shell.
 *
 * Implementa un patrón pub/sub con tipado fuerte:
 * cada evento tiene una firma de argumentos exacta definida en EngineEventMap.
 *
 * Uso desde el Shell:
 *   engine.on('hotspot:clicked', (hotspot) => { ... });
 *
 * Uso interno del SDK:
 *   this.eventBus.emit('hotspot:clicked', hotspot);
 */
export class EventBus {
  private listeners = new Map<EngineEvent, Set<Listener<EngineEvent>>>();

  /**
   * Registra un listener para un evento.
   * @returns función para desuscribirse
   */
  on<E extends EngineEvent>(event: E, listener: EngineEventMap[E]): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as Listener<EngineEvent>);

    return () => {
      set.delete(listener as Listener<EngineEvent>);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * Registra un listener que solo se ejecuta una vez.
   * @returns función para desuscribirse (antes de que se ejecute)
   */
  once<E extends EngineEvent>(event: E, listener: EngineEventMap[E]): () => void {
    const wrapper = ((...args: Parameters<EngineEventMap[E]>) => {
      unsubscribe();
      (listener as (...a: Parameters<EngineEventMap[E]>) => void)(...args);
    }) as EngineEventMap[E];

    const unsubscribe = this.on(event, wrapper);
    return unsubscribe;
  }

  /**
   * Emite un evento con los argumentos tipados correspondientes.
   */
  emit<E extends EngineEvent>(event: E, ...args: Parameters<EngineEventMap[E]>): void {
    const set = this.listeners.get(event);
    if (!set) return;

    for (const listener of set) {
      try {
        (listener as (...a: Parameters<EngineEventMap[E]>) => void)(...args);
      } catch (error) {
        console.error(`[WorldEngine] Error in event listener for "${event}":`, error);
      }
    }
  }

  /**
   * Elimina un listener específico de un evento.
   */
  off<E extends EngineEvent>(event: E, listener: EngineEventMap[E]): void {
    const set = this.listeners.get(event);
    if (!set) return;

    set.delete(listener as Listener<EngineEvent>);
    if (set.size === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Elimina todos los listeners (de un evento o de todos).
   */
  removeAll(event?: EngineEvent): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Número de listeners registrados para un evento.
   */
  listenerCount(event: EngineEvent): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
