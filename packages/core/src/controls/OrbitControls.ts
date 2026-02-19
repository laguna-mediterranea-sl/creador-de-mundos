import * as THREE from 'three';

/** Constantes de control */
const DEFAULT_ROTATE_SPEED = 0.25;
const DEFAULT_ZOOM_SPEED = 1.0;
const MIN_FOV = 30;
const MAX_FOV = 100;
const MIN_POLAR = 0.1;  // Prevent gimbal lock at poles
const MAX_POLAR = Math.PI - 0.1;
const AUTO_ROTATE_DEFAULT_SPEED = 0.02;
const INERTIA_DECAY = 0.92;
const INERTIA_THRESHOLD = 0.0001;

interface PointerState {
  isDown: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  pointerId: number | null;
}

interface PinchState {
  active: boolean;
  initialDistance: number;
  initialFov: number;
}

/**
 * Controles orbitales para panorama 360°.
 *
 * Permite al usuario mirar alrededor arrastrando con ratón o dedo,
 * y hacer zoom con rueda del ratón o pellizco (pinch).
 *
 * Funcionalidades:
 * - Arrastrar para rotar la vista (ratón + touch)
 * - Scroll / pinch para zoom (cambia FOV)
 * - Auto-rotación configurable
 * - Inercia suave al soltar
 * - Límites polares (no girar más allá de los polos)
 * - Navegable por teclado (flechas + +/-)
 */
export class OrbitControls {
  private lon = 0;
  private lat = 0;
  private targetFov: number;

  private pointer: PointerState = {
    isDown: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    pointerId: null,
  };

  private pinch: PinchState = {
    active: false,
    initialDistance: 0,
    initialFov: 75,
  };

  private velocityX = 0;
  private velocityY = 0;
  private autoRotate: boolean;
  private autoRotateSpeed: number;
  private enabled = true;
  private disposed = false;

  // Bound handlers for cleanup
  private boundOnPointerDown: (e: PointerEvent) => void;
  private boundOnPointerMove: (e: PointerEvent) => void;
  private boundOnPointerUp: (e: PointerEvent) => void;
  private boundOnWheel: (e: WheelEvent) => void;
  private boundOnKeyDown: (e: KeyboardEvent) => void;
  private boundOnTouchStart: (e: TouchEvent) => void;
  private boundOnTouchMove: (e: TouchEvent) => void;
  private boundOnTouchEnd: () => void;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private domElement: HTMLElement,
    options?: {
      autoRotate?: boolean;
      autoRotateSpeed?: number;
      initialLon?: number;
      initialLat?: number;
      rotateSpeed?: number;
      zoomSpeed?: number;
    }
  ) {
    this.autoRotate = options?.autoRotate ?? false;
    this.autoRotateSpeed = options?.autoRotateSpeed ?? AUTO_ROTATE_DEFAULT_SPEED;
    this.lon = options?.initialLon ?? 0;
    this.lat = options?.initialLat ?? 0;
    this.targetFov = camera.fov;

    // Bind handlers
    this.boundOnPointerDown = this.onPointerDown.bind(this);
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundOnTouchStart = this.onTouchStart.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchEnd = this.onTouchEnd.bind(this);

    this.attachListeners();

    // Make element focusable for keyboard controls
    if (!domElement.hasAttribute('tabindex')) {
      domElement.setAttribute('tabindex', '0');
    }
  }

  /**
   * Actualiza la cámara. Llamar en cada frame del render loop.
   */
  update(): void {
    if (!this.enabled || this.disposed) return;

    // Auto-rotation (stops if user is dragging)
    if (this.autoRotate && !this.pointer.isDown) {
      this.lon += this.autoRotateSpeed;
    }

    // Apply inertia
    if (!this.pointer.isDown) {
      this.lon += this.velocityX;
      this.lat += this.velocityY;
      this.velocityX *= INERTIA_DECAY;
      this.velocityY *= INERTIA_DECAY;

      if (Math.abs(this.velocityX) < INERTIA_THRESHOLD) this.velocityX = 0;
      if (Math.abs(this.velocityY) < INERTIA_THRESHOLD) this.velocityY = 0;
    }

    // Clamp latitude to avoid going over the poles
    this.lat = Math.max(-85, Math.min(85, this.lat));

    // Smooth zoom
    const fovDiff = this.targetFov - this.camera.fov;
    if (Math.abs(fovDiff) > 0.01) {
      this.camera.fov += fovDiff * 0.1;
      this.camera.fov = THREE.MathUtils.clamp(this.camera.fov, MIN_FOV, MAX_FOV);
      this.camera.updateProjectionMatrix();
    }

    // Convert lon/lat to spherical coordinates and look at target
    const phi = THREE.MathUtils.degToRad(90 - this.lat);
    const theta = THREE.MathUtils.degToRad(this.lon);

    const clampedPhi = THREE.MathUtils.clamp(phi, MIN_POLAR, MAX_POLAR);

    const target = new THREE.Vector3(
      500 * Math.sin(clampedPhi) * Math.cos(theta),
      500 * Math.cos(clampedPhi),
      500 * Math.sin(clampedPhi) * Math.sin(theta)
    );

    this.camera.lookAt(target);
  }

  /**
   * Establece la dirección de vista programáticamente.
   */
  setLookAt(lon: number, lat: number): void {
    this.lon = lon;
    this.lat = lat;
    this.velocityX = 0;
    this.velocityY = 0;
  }

  /**
   * Obtiene la dirección de vista actual.
   */
  getLookAt(): { lon: number; lat: number } {
    return { lon: this.lon, lat: this.lat };
  }

  /**
   * Activa/desactiva auto-rotación.
   */
  setAutoRotate(enabled: boolean, speed?: number): void {
    this.autoRotate = enabled;
    if (speed !== undefined) {
      this.autoRotateSpeed = speed;
    }
  }

  /**
   * Activa/desactiva los controles.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Libera todos los event listeners.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.detachListeners();
  }

  // --- Event Handlers ---

  private onPointerDown(e: PointerEvent): void {
    if (!this.enabled || e.button !== 0) return;

    this.pointer.isDown = true;
    this.pointer.startX = e.clientX;
    this.pointer.startY = e.clientY;
    this.pointer.lastX = e.clientX;
    this.pointer.lastY = e.clientY;
    this.pointer.pointerId = e.pointerId;

    // Stop inertia on new interaction
    this.velocityX = 0;
    this.velocityY = 0;

    this.domElement.setPointerCapture(e.pointerId);
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.enabled || !this.pointer.isDown) return;
    if (e.pointerId !== this.pointer.pointerId) return;

    const deltaX = e.clientX - this.pointer.lastX;
    const deltaY = e.clientY - this.pointer.lastY;

    this.lon -= deltaX * DEFAULT_ROTATE_SPEED;
    this.lat += deltaY * DEFAULT_ROTATE_SPEED;

    // Store velocity for inertia
    this.velocityX = -deltaX * DEFAULT_ROTATE_SPEED * 0.3;
    this.velocityY = deltaY * DEFAULT_ROTATE_SPEED * 0.3;

    this.pointer.lastX = e.clientX;
    this.pointer.lastY = e.clientY;
  }

  private onPointerUp(e: PointerEvent): void {
    if (e.pointerId !== this.pointer.pointerId) return;

    this.pointer.isDown = false;
    this.pointer.pointerId = null;

    this.domElement.releasePointerCapture(e.pointerId);
  }

  private onWheel(e: WheelEvent): void {
    if (!this.enabled) return;
    e.preventDefault();

    this.targetFov += e.deltaY * 0.05 * DEFAULT_ZOOM_SPEED;
    this.targetFov = THREE.MathUtils.clamp(this.targetFov, MIN_FOV, MAX_FOV);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;

    const KEYBOARD_SPEED = 2;
    switch (e.key) {
      case 'ArrowLeft':
        this.lon -= KEYBOARD_SPEED;
        e.preventDefault();
        break;
      case 'ArrowRight':
        this.lon += KEYBOARD_SPEED;
        e.preventDefault();
        break;
      case 'ArrowUp':
        this.lat += KEYBOARD_SPEED;
        e.preventDefault();
        break;
      case 'ArrowDown':
        this.lat -= KEYBOARD_SPEED;
        e.preventDefault();
        break;
      case '+':
      case '=':
        this.targetFov = Math.max(MIN_FOV, this.targetFov - 2);
        e.preventDefault();
        break;
      case '-':
        this.targetFov = Math.min(MAX_FOV, this.targetFov + 2);
        e.preventDefault();
        break;
    }
  }

  // --- Touch/Pinch Zoom ---

  private onTouchStart(e: TouchEvent): void {
    if (!this.enabled) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      const t0 = e.touches[0]!;
      const t1 = e.touches[1]!;
      this.pinch.active = true;
      this.pinch.initialDistance = Math.hypot(
        t1.clientX - t0.clientX,
        t1.clientY - t0.clientY
      );
      this.pinch.initialFov = this.camera.fov;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.enabled || !this.pinch.active || e.touches.length !== 2) return;
    e.preventDefault();

    const t0 = e.touches[0]!;
    const t1 = e.touches[1]!;
    const currentDistance = Math.hypot(
      t1.clientX - t0.clientX,
      t1.clientY - t0.clientY
    );
    const ratio = this.pinch.initialDistance / currentDistance;
    this.targetFov = THREE.MathUtils.clamp(
      this.pinch.initialFov * ratio,
      MIN_FOV,
      MAX_FOV
    );
  }

  private onTouchEnd(): void {
    this.pinch.active = false;
  }

  // --- Listener Management ---

  private attachListeners(): void {
    const el = this.domElement;
    el.addEventListener('pointerdown', this.boundOnPointerDown);
    el.addEventListener('pointermove', this.boundOnPointerMove);
    el.addEventListener('pointerup', this.boundOnPointerUp);
    el.addEventListener('pointercancel', this.boundOnPointerUp);
    el.addEventListener('wheel', this.boundOnWheel, { passive: false });
    el.addEventListener('keydown', this.boundOnKeyDown);
    el.addEventListener('touchstart', this.boundOnTouchStart, { passive: false });
    el.addEventListener('touchmove', this.boundOnTouchMove, { passive: false });
    el.addEventListener('touchend', this.boundOnTouchEnd);
  }

  private detachListeners(): void {
    const el = this.domElement;
    el.removeEventListener('pointerdown', this.boundOnPointerDown);
    el.removeEventListener('pointermove', this.boundOnPointerMove);
    el.removeEventListener('pointerup', this.boundOnPointerUp);
    el.removeEventListener('pointercancel', this.boundOnPointerUp);
    el.removeEventListener('wheel', this.boundOnWheel);
    el.removeEventListener('keydown', this.boundOnKeyDown);
    el.removeEventListener('touchstart', this.boundOnTouchStart);
    el.removeEventListener('touchmove', this.boundOnTouchMove);
    el.removeEventListener('touchend', this.boundOnTouchEnd);
  }
}
