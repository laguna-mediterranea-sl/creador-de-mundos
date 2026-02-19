import type { Itinerary } from '../types/Config.js';
import type { TransitionEffect } from '../types/Hotspot.js';
import { EventBus } from '../events/EventBus.js';

/**
 * Gestiona la navegación entre mundos.
 *
 * Funcionalidades:
 * - Cambio de mundo activo
 * - Historial de navegación (atrás/adelante)
 * - Itinerario ordenado (Aulas Mágicas: enforceOrder)
 * - Emisión de eventos de navegación
 * - Transiciones visuales (fade/warp/dissolve delegado al renderer)
 */
export class Navigator {
  private currentWorldId: string | null = null;
  private history: string[] = [];
  private historyIndex = -1;
  private itinerary: Itinerary | null = null;
  private availableWorldIds = new Set<string>();
  private transitioning = false;

  constructor(private eventBus: EventBus) {}

  /**
   * Configura los mundos disponibles y el itinerario (si existe).
   */
  init(worldIds: string[], itinerary?: Itinerary): void {
    this.availableWorldIds = new Set(worldIds);
    this.itinerary = itinerary ?? null;
  }

  /**
   * Navega a un mundo específico.
   *
   * @param worldId ID del mundo destino
   * @param transition Efecto de transición (delegado al renderer)
   * @returns true si la navegación se realizó, false si fue bloqueada
   */
  async navigateTo(
    worldId: string,
    transition?: TransitionEffect
  ): Promise<boolean> {
    if (this.transitioning) return false;

    // Validate world exists
    if (!this.availableWorldIds.has(worldId)) {
      this.eventBus.emit('error', new Error(`World "${worldId}" not available`));
      return false;
    }

    // Check itinerary order enforcement
    if (this.itinerary?.enforceOrder) {
      if (!this.canNavigateInItinerary(worldId)) {
        this.eventBus.emit('error', new Error(
          `Cannot navigate to "${worldId}": itinerary order enforced. Complete current world first.`
        ));
        return false;
      }
    }

    // Same world — no-op
    if (worldId === this.currentWorldId) return true;

    this.transitioning = true;

    const fromId = this.currentWorldId;

    // Update history
    if (this.currentWorldId) {
      // Truncate forward history if we navigated back then forward
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push(this.currentWorldId);
      this.historyIndex = this.history.length - 1;
    }

    this.currentWorldId = worldId;

    // Emit events
    if (fromId) {
      this.eventBus.emit('world:changed', fromId, worldId);
    }
    this.eventBus.emit('world:loaded', worldId);

    if (transition) {
      this.eventBus.emit('portal:entered', worldId);
    }

    this.transitioning = false;
    return true;
  }

  /**
   * Navega al mundo anterior en el historial.
   */
  async goBack(): Promise<boolean> {
    if (!this.canGoBack) return false;

    const prevWorldId = this.history[this.historyIndex];
    if (!prevWorldId) return false;

    this.historyIndex--;
    const fromId = this.currentWorldId;
    this.currentWorldId = prevWorldId;

    if (fromId) {
      this.eventBus.emit('world:changed', fromId, prevWorldId);
    }
    this.eventBus.emit('world:loaded', prevWorldId);

    return true;
  }

  /**
   * Navega al siguiente mundo en el itinerario.
   */
  async goNext(): Promise<boolean> {
    if (!this.itinerary) return false;

    const currentIndex = this.currentWorldId
      ? this.itinerary.worldOrder.indexOf(this.currentWorldId)
      : -1;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= this.itinerary.worldOrder.length) return false;

    const nextWorldId = this.itinerary.worldOrder[nextIndex];
    if (!nextWorldId) return false;

    return this.navigateTo(nextWorldId);
  }

  /**
   * Navega al mundo anterior en el itinerario.
   */
  async goPrevious(): Promise<boolean> {
    if (!this.itinerary) return false;

    const currentIndex = this.currentWorldId
      ? this.itinerary.worldOrder.indexOf(this.currentWorldId)
      : -1;

    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) return false;

    const prevWorldId = this.itinerary.worldOrder[prevIndex];
    if (!prevWorldId) return false;

    return this.navigateTo(prevWorldId);
  }

  /**
   * ID del mundo activo actual.
   */
  get currentWorld(): string | null {
    return this.currentWorldId;
  }

  /**
   * Indica si se puede navegar hacia atrás en el historial.
   */
  get canGoBack(): boolean {
    return this.historyIndex >= 0;
  }

  /**
   * Indica si hay un siguiente mundo en el itinerario.
   */
  get canGoNext(): boolean {
    if (!this.itinerary) return false;
    const currentIndex = this.currentWorldId
      ? this.itinerary.worldOrder.indexOf(this.currentWorldId)
      : -1;
    return currentIndex < this.itinerary.worldOrder.length - 1;
  }

  /**
   * Indica si hay un mundo previo en el itinerario.
   */
  get canGoPrevious(): boolean {
    if (!this.itinerary) return false;
    const currentIndex = this.currentWorldId
      ? this.itinerary.worldOrder.indexOf(this.currentWorldId)
      : -1;
    return currentIndex > 0;
  }

  /**
   * Índice del mundo actual en el itinerario (0-based, -1 si no hay itinerario).
   */
  get currentItineraryIndex(): number {
    if (!this.itinerary || !this.currentWorldId) return -1;
    return this.itinerary.worldOrder.indexOf(this.currentWorldId);
  }

  /**
   * Número total de mundos en el itinerario.
   */
  get itineraryLength(): number {
    return this.itinerary?.worldOrder.length ?? 0;
  }

  /**
   * Indica si hay una transición en curso.
   */
  get isTransitioning(): boolean {
    return this.transitioning;
  }

  /**
   * Libera recursos.
   */
  dispose(): void {
    this.currentWorldId = null;
    this.history = [];
    this.historyIndex = -1;
    this.itinerary = null;
    this.availableWorldIds.clear();
  }

  /**
   * Comprueba si se permite navegar a un mundo según el itinerario.
   * El usuario puede ir al mundo actual o al siguiente desbloqueado.
   */
  private canNavigateInItinerary(targetWorldId: string): boolean {
    if (!this.itinerary) return true;

    const targetIndex = this.itinerary.worldOrder.indexOf(targetWorldId);
    if (targetIndex === -1) return false; // Not in itinerary

    const currentIndex = this.currentWorldId
      ? this.itinerary.worldOrder.indexOf(this.currentWorldId)
      : -1;

    // Can go to current world, next world, or any previous world
    return targetIndex <= currentIndex + 1;
  }
}
