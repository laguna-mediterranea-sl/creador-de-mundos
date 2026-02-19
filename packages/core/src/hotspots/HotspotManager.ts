import * as THREE from 'three';
import type { Hotspot, SphericalPosition, HotspotType } from '../types/Hotspot.js';
import type { EngineTheme } from '../types/Theme.js';
import { EventBus } from '../events/EventBus.js';
import { sanitizeColor, escapeAttr } from '../utils/sanitize.js';

/** Radius used for hotspot position calculations (must match sphere radius) */
const HOTSPOT_SPHERE_RADIUS = 500;

/** Size map in pixels for hotspot DOM elements */
const SIZE_MAP: Record<string, number> = {
  sm: 32,
  md: 44,
  lg: 56,
};

/** Screen position of a hotspot projected to 2D */
export interface ScreenPosition {
  x: number;
  y: number;
  visible: boolean;
}

/**
 * Gestiona hotspots interactivos en el mundo 3D.
 *
 * Responsabilidades:
 * - Almacena la lista de hotspots del mundo activo
 * - Convierte coordenadas esféricas (theta, phi) a posiciones 3D
 * - Proyecta posiciones 3D a coordenadas de pantalla 2D
 * - Crea/gestiona overlay HTML para cada hotspot
 * - Detecta clics en hotspots
 * - Lleva registro de hotspots visitados
 * - Soporta navegación por teclado (accesibilidad)
 */
export class HotspotManager {
  private hotspots: Hotspot[] = [];
  private visited = new Set<string>();
  private overlayContainer: HTMLElement | null = null;
  private hotspotElements = new Map<string, HTMLElement>();
  private activeHotspotId: string | null = null;

  // Reusable vectors for render-loop calculations (avoids GC pressure)
  private readonly tempVec3 = new THREE.Vector3();
  private readonly tempProjected = new THREE.Vector3();

  constructor(
    private eventBus: EventBus,
    private theme: EngineTheme
  ) {}

  /**
   * Inicializa el overlay HTML contenedor sobre el canvas.
   */
  init(parentContainer: HTMLElement): void {
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
      z-index: 10;
    `;
    this.overlayContainer.setAttribute('role', 'region');
    this.overlayContainer.setAttribute('aria-label', 'Interactive hotspots');
    parentContainer.appendChild(this.overlayContainer);
  }

  /**
   * Establece los hotspots del mundo activo.
   * Limpia los hotspots anteriores y crea los nuevos.
   */
  setHotspots(hotspots: Hotspot[]): void {
    this.clearHotspotElements();
    this.hotspots = hotspots;

    for (const hotspot of hotspots) {
      this.createHotspotElement(hotspot);
    }
  }

  /**
   * Convierte coordenadas esféricas a posición 3D (Vector3).
   */
  sphericalToCartesian(position: SphericalPosition): THREE.Vector3 {
    const { theta, phi } = position;
    return new THREE.Vector3(
      HOTSPOT_SPHERE_RADIUS * Math.cos(phi) * Math.sin(theta),
      HOTSPOT_SPHERE_RADIUS * Math.sin(phi),
      HOTSPOT_SPHERE_RADIUS * Math.cos(phi) * Math.cos(theta)
    );
  }

  /**
   * Proyecta posición 3D a coordenadas de pantalla 2D.
   */
  projectToScreen(
    position3D: THREE.Vector3,
    camera: THREE.PerspectiveCamera,
    containerWidth: number,
    containerHeight: number
  ): ScreenPosition {
    const projected = position3D.clone().project(camera);

    // Check if behind camera (z > 1 means behind)
    const visible = projected.z < 1;

    return {
      x: (projected.x * 0.5 + 0.5) * containerWidth,
      y: (-projected.y * 0.5 + 0.5) * containerHeight,
      visible,
    };
  }

  /**
   * Actualiza las posiciones de todos los hotspots en pantalla.
   * Debe llamarse en cada frame del render loop.
   * Usa vectores reutilizables para evitar presión de GC.
   */
  updatePositions(
    camera: THREE.PerspectiveCamera,
    containerWidth: number,
    containerHeight: number
  ): void {
    // Guard: skip if container has zero dimensions
    if (containerWidth === 0 || containerHeight === 0) return;

    for (const hotspot of this.hotspots) {
      const element = this.hotspotElements.get(hotspot.id);
      if (!element) continue;

      // Reuse temp vector for spherical→cartesian
      const { theta, phi } = hotspot.position;
      this.tempVec3.set(
        HOTSPOT_SPHERE_RADIUS * Math.cos(phi) * Math.sin(theta),
        HOTSPOT_SPHERE_RADIUS * Math.sin(phi),
        HOTSPOT_SPHERE_RADIUS * Math.cos(phi) * Math.cos(theta)
      );

      // Reuse temp vector for projection
      this.tempProjected.copy(this.tempVec3).project(camera);
      const visible = this.tempProjected.z < 1;

      if (visible) {
        const x = (this.tempProjected.x * 0.5 + 0.5) * containerWidth;
        const y = (-this.tempProjected.y * 0.5 + 0.5) * containerHeight;
        element.style.display = 'block';
        element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      } else {
        element.style.display = 'none';
      }
    }
  }

  /**
   * Marca un hotspot como visitado y emite evento.
   */
  markVisited(hotspotId: string, worldId: string): void {
    if (this.visited.has(hotspotId)) return;

    this.visited.add(hotspotId);
    this.eventBus.emit('hotspot:visited', hotspotId, worldId);
    this.eventBus.emit('progress:updated', this.visited.size, this.totalCount);

    // Update visual state
    const element = this.hotspotElements.get(hotspotId);
    if (element) {
      element.classList.add('we-hotspot--visited');
    }
  }

  /**
   * Establece el hotspot activo (seleccionado/abierto).
   */
  setActive(hotspotId: string | null): void {
    // Deactivate previous
    if (this.activeHotspotId) {
      const prev = this.hotspotElements.get(this.activeHotspotId);
      prev?.classList.remove('we-hotspot--active');
    }

    this.activeHotspotId = hotspotId;

    // Activate new
    if (hotspotId) {
      const element = this.hotspotElements.get(hotspotId);
      element?.classList.add('we-hotspot--active');
    }
  }

  /**
   * Busca un hotspot por ID.
   */
  getHotspot(id: string): Hotspot | undefined {
    return this.hotspots.find(h => h.id === id);
  }

  /**
   * Devuelve el ID del hotspot activo.
   */
  get activeId(): string | null {
    return this.activeHotspotId;
  }

  /**
   * Número total de hotspots en el mundo activo.
   */
  get totalCount(): number {
    return this.hotspots.length;
  }

  /**
   * Número de hotspots visitados.
   */
  get visitedCount(): number {
    return this.visited.size;
  }

  /**
   * Lista de IDs de hotspots visitados.
   */
  get visitedIds(): ReadonlySet<string> {
    return this.visited;
  }

  /**
   * Comprueba si un hotspot ha sido visitado.
   */
  isVisited(hotspotId: string): boolean {
    return this.visited.has(hotspotId);
  }

  /**
   * Limpia el registro de visitados (al cambiar de mundo o reiniciar).
   */
  resetVisited(): void {
    this.visited.clear();
  }

  /**
   * Libera todos los recursos.
   */
  dispose(): void {
    this.clearHotspotElements();
    if (this.overlayContainer?.parentElement) {
      this.overlayContainer.parentElement.removeChild(this.overlayContainer);
    }
    this.overlayContainer = null;
    this.hotspots = [];
    this.visited.clear();
    this.activeHotspotId = null;
  }

  /**
   * Crea el elemento DOM HTML para un hotspot individual.
   * Colores e inputs de usuario son sanitizados contra inyección CSS/XSS.
   */
  private createHotspotElement(hotspot: Hotspot): void {
    if (!this.overlayContainer) return;

    const element = document.createElement('button');
    const size = SIZE_MAP[hotspot.appearance?.size ?? 'md'] ?? SIZE_MAP['md']!;

    // Sanitize color against CSS injection
    const rawColor = hotspot.appearance?.color ?? this.getHotspotColor(hotspot.type);
    const color = sanitizeColor(rawColor);

    element.className = 'we-hotspot';
    element.dataset['hotspotId'] = hotspot.id;
    element.dataset['hotspotType'] = hotspot.type;

    element.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${color};
      border: 3px solid rgba(255, 255, 255, 0.9);
      cursor: pointer;
      pointer-events: auto;
      display: none;
      transition: transform 0.1s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      font-size: ${size * 0.45}px;
      line-height: ${size}px;
      text-align: center;
      color: white;
      padding: 0;
    `;

    // Icon/emoji content (textContent is safe — auto-escaped by browser)
    element.textContent = hotspot.appearance?.icon ?? this.getDefaultIcon(hotspot.type);

    // Accessibility — escape user content for aria-label
    const safeTitle = escapeAttr(hotspot.content.title);
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', `${hotspot.type}: ${safeTitle}`);
    element.setAttribute('tabindex', '0');

    // Pulse animation
    if (hotspot.appearance?.pulseAnimation !== false) {
      element.style.animation = 'we-pulse 2s ease-in-out infinite';
    }

    // Click handler
    element.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleHotspotClick(hotspot);
    });

    // Keyboard handler (Enter/Space)
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        this.handleHotspotClick(hotspot);
      }
    });

    this.hotspotElements.set(hotspot.id, element);
    this.overlayContainer.appendChild(element);
  }

  /**
   * Gestiona el clic en un hotspot.
   */
  private handleHotspotClick(hotspot: Hotspot): void {
    this.setActive(hotspot.id);
    this.eventBus.emit('hotspot:clicked', hotspot);
  }

  /**
   * Obtiene el color del tema para un tipo de hotspot.
   */
  private getHotspotColor(type: HotspotType): string {
    switch (type) {
      case 'info': return this.theme.colors.hotspotInfo;
      case 'portal': return this.theme.colors.hotspotPortal;
      case 'quiz': return this.theme.colors.hotspotQuiz;
      case 'media': return this.theme.colors.hotspotInfo;
    }
  }

  /**
   * Icono por defecto según tipo de hotspot.
   */
  private getDefaultIcon(type: HotspotType): string {
    switch (type) {
      case 'info': return 'i';
      case 'portal': return '\u2794'; // →
      case 'quiz': return '?';
      case 'media': return '\u25B6'; // ▶
    }
  }

  /**
   * Elimina todos los elementos DOM de hotspots.
   */
  private clearHotspotElements(): void {
    for (const element of this.hotspotElements.values()) {
      element.remove();
    }
    this.hotspotElements.clear();
  }
}
