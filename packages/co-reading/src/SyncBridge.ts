import type { EventBus } from '@world-engine/core';
import type { CoReadingSession } from './CoReadingSession.js';
import type { SyncEvent, SyncEventType, SessionRole } from './types.js';

/**
 * Eventos del EventBus local que se sincronizan remotamente.
 * Mapeo: nombre EventBus local → tipo SyncEvent
 */
const EVENT_MAP: Record<string, SyncEventType> = {
  'page:change': 'page_change',
  'hotspot:tap': 'hotspot_tap',
  'reaction:send': 'emoji_reaction',
  'story:complete': 'story_complete',
};

/** Eventos que SOLO el narrador puede emitir remotamente */
const NARRATOR_ONLY_EVENTS = new Set(['page:change', 'story:complete']);

/**
 * SyncBridge — Puente entre el EventBus local (WorldEngine) y LiveKit.
 *
 * Sincroniza eventos bidireccionales entre dos dispositivos:
 * - LOCAL → REMOTO: Eventos locales del motor se envían al otro dispositivo
 * - REMOTO → LOCAL: Eventos del otro dispositivo se reinyectan en el bus local
 *
 * Filtros de seguridad:
 * - El listener no puede enviar page_change ni story_complete (solo el narrador)
 * - Eventos remotos se marcan con prefijo 'remote:' para distinguirlos
 * - Se evitan bucles infinitos (eventos remotos no se reenvían)
 */
export class SyncBridge {
  private unsubscribers: Array<() => void> = [];
  private started = false;

  constructor(
    private session: CoReadingSession,
    private localBus: EventBus,
    private role: SessionRole
  ) {}

  /**
   * Activa la sincronización bidireccional.
   * Debe llamarse después de que la sesión esté conectada.
   */
  start(): void {
    if (this.started) return;
    this.started = true;

    // LOCAL → REMOTO: Capturar eventos locales y enviarlos
    for (const [localEvent, syncType] of Object.entries(EVENT_MAP)) {
      // Filtrar: listener no puede emitir eventos narrator-only
      if (this.role === 'listener' && NARRATOR_ONLY_EVENTS.has(localEvent)) {
        continue;
      }

      // Use cast for dynamic event names that may not be in EngineEventMap
      const bus = this.localBus as unknown as {
        on(event: string, listener: (...args: unknown[]) => void): () => void;
      };

      const unsub = bus.on(localEvent, (...args: unknown[]) => {
        // Evitar reenviar eventos que vinieron del remoto
        const payload = args[0];
        if (payload && typeof payload === 'object' && '_remote' in payload) {
          return;
        }

        this.session.sendEvent({
          type: syncType,
          payload: this.serializePayload(args),
        }).catch((err) => {
          console.warn('[SyncBridge] Failed to send event:', err);
        });
      });

      this.unsubscribers.push(unsub);
    }
  }

  /**
   * Procesa un evento recibido del dispositivo remoto.
   * Lo reinyecta en el EventBus local con prefijo 'remote:'.
   *
   * Debe conectarse al callback onRemoteEvent de CoReadingSession.
   */
  handleRemoteEvent(event: SyncEvent): void {
    const localPayload = {
      ...event.payload,
      _remote: true,
      _sender: event.sender,
      _timestamp: event.timestamp,
    };

    // Emitir en el bus local con prefijo para que los componentes lo distingan.
    // Usamos cast a unknown porque los eventos remotos no están definidos en EngineEventMap
    // (son eventos dinámicos con prefijo 'remote:'). El EventBus los ignora silenciosamente
    // si no hay listeners registrados.
    try {
      (this.localBus as unknown as { emit(event: string, ...args: unknown[]): void })
        .emit(`remote:${event.type}`, localPayload);
    } catch {
      // Silenciar errores de eventos no registrados
    }
  }

  /**
   * Detiene la sincronización y limpia los listeners.
   */
  stop(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.started = false;
  }

  /**
   * Serializa los argumentos del evento para envío por data channel.
   */
  private serializePayload(args: unknown[]): Record<string, unknown> {
    if (args.length === 0) return {};
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      return args[0] as Record<string, unknown>;
    }
    return { args };
  }
}
