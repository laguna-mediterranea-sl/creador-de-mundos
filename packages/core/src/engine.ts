import type { EngineConfig } from './types/Config.js';
import type { EngineEventMap, EngineEvent } from './types/Events.js';
import type { Hotspot, TransitionEffect } from './types/Hotspot.js';
import type { World } from './types/World.js';
import { EventBus } from './events/EventBus.js';
import { PanoRenderer } from './renderer/PanoRenderer.js';
import { RendererFactory } from './renderer/RendererFactory.js';
import { HotspotManager } from './hotspots/HotspotManager.js';
import { injectHotspotStyles } from './hotspots/HotspotStyles.js';
import { OrbitControls } from './controls/OrbitControls.js';
import { AudioManager } from './audio/AudioManager.js';
import { WorldLoader } from './loader/WorldLoader.js';
import { Navigator } from './navigation/Navigator.js';

/**
 * WorldEngine — Motor 3D compartido para mundos inmersivos.
 *
 * Esta es la clase principal del SDK. Orquesta todos los módulos:
 * - PanoRenderer: renderizado de panoramas 360°
 * - HotspotManager: hotspots interactivos
 * - OrbitControls: controles de cámara (ratón + touch)
 * - AudioManager: TTS y audio pregenerado
 * - WorldLoader: carga de mundos
 * - Navigator: navegación entre mundos
 * - EventBus: comunicación con el Shell
 *
 * El SDK NO sabe en qué producto está. Solo recibe configuración y renderiza.
 *
 * Uso:
 *   const engine = new WorldEngine(config);
 *   await engine.init();
 *   engine.on('hotspot:clicked', (hotspot) => { ... });
 */
export class WorldEngine {
  private readonly eventBus: EventBus;
  private readonly panoRenderer: PanoRenderer;
  private readonly hotspotManager: HotspotManager;
  private readonly controls: OrbitControls;
  private readonly audioManager: AudioManager;
  private readonly worldLoader: WorldLoader;
  private readonly navigator: Navigator;
  private readonly container: HTMLElement;

  private currentWorld: World | null = null;
  private initialized = false;
  private disposed = false;
  private loadingWorldId: string | null = null;

  constructor(private readonly config: EngineConfig) {
    // Resolve container
    this.container = this.resolveContainer(config.container);
    this.ensureContainerStyle();

    // Initialize modules
    this.eventBus = new EventBus();
    this.worldLoader = new WorldLoader();
    this.navigator = new Navigator(this.eventBus);
    this.audioManager = new AudioManager(config.audio, this.eventBus);

    // Renderer
    this.panoRenderer = RendererFactory.createRenderer(
      this.container,
      config.renderer
    );

    // Hotspot manager
    this.hotspotManager = new HotspotManager(this.eventBus, config.theme);

    // Controls
    this.controls = new OrbitControls(
      this.panoRenderer.camera,
      this.panoRenderer.domElement,
      {
        autoRotate: config.theme.autoRotate,
      }
    );

    // Wire up callbacks from config
    this.wireCallbacks();

    // Wire up internal event handling
    this.wireInternalEvents();
  }

  /**
   * Inicializa el engine: carga mundos, renderiza el primero, inicia render loop.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // Inject CSS
    injectHotspotStyles();

    // Register worlds
    this.worldLoader.registerWorlds(this.config.worlds);

    // Initialize navigator
    const worldIds = this.config.worlds.map(w => w.id);
    this.navigator.init(worldIds, this.config.itinerary);

    // Initialize hotspot overlay
    this.hotspotManager.init(this.container);

    // Start render loop
    this.panoRenderer.startRenderLoop(() => {
      this.controls.update();
      this.hotspotManager.updatePositions(
        this.panoRenderer.camera,
        this.container.clientWidth,
        this.container.clientHeight
      );
    });

    // Load initial world
    const initialId = this.config.initialWorldId ?? this.config.worlds[0]?.id;
    if (initialId) {
      await this.goToWorld(initialId);
    }

    this.initialized = true;
  }

  /**
   * Navega a un mundo específico por ID.
   */
  async goToWorld(worldId: string, transition?: TransitionEffect): Promise<void> {
    if (this.disposed) return;

    // Prevent concurrent loads — last one wins
    this.loadingWorldId = worldId;

    const navigated = await this.navigator.navigateTo(worldId, transition);
    if (!navigated) return;

    const world = await this.worldLoader.getWorld(worldId);

    // Check if another navigation started while we were loading
    if (this.loadingWorldId !== worldId) return;

    this.currentWorld = world;

    // Determine asset URL
    const rendererType = RendererFactory.detectRendererType(
      world.asset,
      this.config.renderer
    );
    const assetUrl = RendererFactory.getAssetUrl(world.asset, rendererType);

    // Load panorama
    await this.panoRenderer.loadPanorama(assetUrl, world.camera);

    // Apply camera config to controls
    if (world.camera) {
      this.controls.setLookAt(
        world.camera.initialLon ?? 0,
        world.camera.initialLat ?? 0
      );
      if (world.camera.autoRotate !== undefined) {
        this.controls.setAutoRotate(
          world.camera.autoRotate,
          world.camera.autoRotateSpeed
        );
      }
    }

    // Set hotspots
    this.hotspotManager.setHotspots(world.hotspots);
  }

  // --- Public API: Events ---

  /**
   * Registra un listener para un evento del engine.
   * @returns función para desuscribirse
   */
  on<E extends EngineEvent>(event: E, listener: EngineEventMap[E]): () => void {
    return this.eventBus.on(event, listener);
  }

  /**
   * Registra un listener que solo se ejecuta una vez.
   */
  once<E extends EngineEvent>(event: E, listener: EngineEventMap[E]): () => void {
    return this.eventBus.once(event, listener);
  }

  /**
   * Elimina un listener.
   */
  off<E extends EngineEvent>(event: E, listener: EngineEventMap[E]): void {
    this.eventBus.off(event, listener);
  }

  // --- Public API: Navigation ---

  /** Navega al siguiente mundo del itinerario */
  async nextWorld(): Promise<boolean> {
    return this.navigator.goNext();
  }

  /** Navega al mundo anterior del itinerario */
  async previousWorld(): Promise<boolean> {
    return this.navigator.goPrevious();
  }

  /** Navega al mundo anterior en el historial */
  async goBack(): Promise<boolean> {
    const result = await this.navigator.goBack();
    if (result && this.navigator.currentWorld) {
      await this.goToWorld(this.navigator.currentWorld);
    }
    return result;
  }

  // --- Public API: Audio ---

  /** Reproduce audio de un hotspot */
  async playHotspotAudio(hotspotId: string): Promise<void> {
    const hotspot = this.hotspotManager.getHotspot(hotspotId);
    if (!hotspot) return;
    await this.audioManager.playForHotspot(hotspotId, hotspot.content);
  }

  /** Detiene el audio en curso */
  stopAudio(): void {
    this.audioManager.stop();
  }

  /** Silencia/activa el audio */
  setMuted(muted: boolean): void {
    this.audioManager.setMuted(muted);
  }

  /** Establece el volumen (0.0 - 1.0) */
  setVolume(volume: number): void {
    this.audioManager.setVolume(volume);
  }

  // --- Public API: Quiz ---

  /** Emite el evento quiz:answered para que el Shell procese la respuesta */
  submitQuizAnswer(hotspotId: string, answerIndex: number, correct: boolean): void {
    this.eventBus.emit('quiz:answered', hotspotId, answerIndex, correct);
  }

  // --- Public API: State ---

  /** Mundo activo actual */
  get activeWorld(): World | null {
    return this.currentWorld;
  }

  /** ID del mundo activo */
  get activeWorldId(): string | null {
    return this.navigator.currentWorld;
  }

  /** Hotspot activo (seleccionado) */
  get activeHotspotId(): string | null {
    return this.hotspotManager.activeId;
  }

  /** Deselecciona el hotspot activo y emite hotspot:dismissed */
  deselectHotspot(): void {
    if (this.hotspotManager.activeId) {
      this.hotspotManager.setActive(null);
      this.eventBus.emit('hotspot:dismissed');
    }
  }

  /** Obtiene un hotspot por ID */
  getHotspot(id: string): Hotspot | undefined {
    return this.hotspotManager.getHotspot(id);
  }

  /** Número de hotspots visitados */
  get visitedCount(): number {
    return this.hotspotManager.visitedCount;
  }

  /** Número total de hotspots */
  get totalHotspots(): number {
    return this.hotspotManager.totalCount;
  }

  /** Si se puede ir al siguiente mundo en el itinerario */
  get canGoNext(): boolean {
    return this.navigator.canGoNext;
  }

  /** Si se puede ir al mundo anterior en el itinerario */
  get canGoPrevious(): boolean {
    return this.navigator.canGoPrevious;
  }

  /** Índice actual en el itinerario */
  get itineraryIndex(): number {
    return this.navigator.currentItineraryIndex;
  }

  /** Total de mundos en el itinerario */
  get itineraryTotal(): number {
    return this.navigator.itineraryLength;
  }

  /** Todos los mundos registrados */
  get worlds(): World[] {
    return this.worldLoader.getAllWorlds();
  }

  // --- Public API: Controls ---

  /** Activa/desactiva auto-rotación */
  setAutoRotate(enabled: boolean, speed?: number): void {
    this.controls.setAutoRotate(enabled, speed);
  }

  // --- Lifecycle ---

  /**
   * Libera todos los recursos y limpia el DOM.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.panoRenderer.dispose();
    this.hotspotManager.dispose();
    this.controls.dispose();
    this.audioManager.dispose();
    this.worldLoader.dispose();
    this.navigator.dispose();
    this.eventBus.removeAll();
  }

  // --- Internal ---

  /**
   * Resuelve el contenedor DOM desde HTMLElement o selector CSS.
   */
  private resolveContainer(container: HTMLElement | string): HTMLElement {
    if (typeof container === 'string') {
      const element = document.querySelector(container);
      if (!element || !(element instanceof HTMLElement)) {
        throw new Error(`Container element not found: "${container}"`);
      }
      return element;
    }
    return container;
  }

  /**
   * Asegura que el contenedor tiene position relative para el overlay.
   */
  private ensureContainerStyle(): void {
    const style = window.getComputedStyle(this.container);
    if (style.position === 'static') {
      this.container.style.position = 'relative';
    }
    this.container.style.overflow = 'hidden';
  }

  /**
   * Conecta callbacks del Shell a eventos del EventBus.
   */
  private wireCallbacks(): void {
    const cb = this.config.callbacks;
    if (!cb) return;

    if (cb.onWorldChange) {
      this.eventBus.on('world:loaded', cb.onWorldChange);
    }
    if (cb.onHotspotVisit) {
      this.eventBus.on('hotspot:visited', cb.onHotspotVisit);
    }
    if (cb.onQuizAnswer) {
      this.eventBus.on('quiz:answered', (hotspotId, _answer, correct) => {
        cb.onQuizAnswer!(hotspotId, correct);
      });
    }
    if (cb.onProgress) {
      this.eventBus.on('progress:updated', cb.onProgress);
    }
    if (cb.onError) {
      this.eventBus.on('error', cb.onError);
    }
  }

  /**
   * Conecta eventos internos entre módulos.
   */
  private wireInternalEvents(): void {
    // When a hotspot is clicked, mark as visited and handle portal navigation
    this.eventBus.on('hotspot:clicked', (hotspot: Hotspot) => {
      if (this.currentWorld) {
        this.hotspotManager.markVisited(hotspot.id, this.currentWorld.id);
      }

      // Auto-play audio if available
      if (hotspot.content.audioUrl || hotspot.content.audioAutoGenerate) {
        this.audioManager.playForHotspot(hotspot.id, hotspot.content).catch((error) => {
          this.eventBus.emit('error', error instanceof Error ? error : new Error(String(error)));
        });
      }

      // Portal: navigate to target world
      if (hotspot.type === 'portal' && hotspot.portal?.targetWorldId) {
        this.goToWorld(
          hotspot.portal.targetWorldId,
          hotspot.portal.transitionEffect
        ).catch((error) => {
          this.eventBus.emit('error', error instanceof Error ? error : new Error(String(error)));
        });
      }
    });
  }
}
