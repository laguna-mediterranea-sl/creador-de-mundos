import * as THREE from 'three';
import type { WorldCamera } from '../types/World.js';
import type { RendererConfig } from '../types/Config.js';
import { sanitizeAssetUrl } from '../utils/sanitize.js';

/** Radius of the panoramic sphere (large enough for camera inside) */
const SPHERE_RADIUS = 500;
const SPHERE_SEGMENTS_W = 60;
const SPHERE_SEGMENTS_H = 40;

/** Default camera FOV */
const DEFAULT_FOV = 75;
const NEAR_PLANE = 0.1;
const FAR_PLANE = 1100;

/**
 * Renderer de panoramas equirectangulares 360°.
 *
 * Crea una esfera invertida (BackSide) con la textura equirectangular
 * mapeada en su interior. La cámara se posiciona en el centro de la esfera.
 *
 * Patrón Three.js estándar:
 * - SphereGeometry con escala X invertida
 * - MeshBasicMaterial con side: BackSide
 * - TextureLoader para cargar equirectangular JPG/PNG
 * - PerspectiveCamera en el centro (0,0,0)
 */
export class PanoRenderer {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;

  private sphere: THREE.Mesh | null = null;
  private geometry: THREE.SphereGeometry;
  private material: THREE.MeshBasicMaterial;
  private textureLoader: THREE.TextureLoader;
  private currentTexture: THREE.Texture | null = null;
  private animationFrameId: number | null = null;
  private renderCallback: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private disposed = false;

  constructor(
    private container: HTMLElement,
    protected readonly rendererConfig: RendererConfig
  ) {
    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      DEFAULT_FOV,
      container.clientWidth / container.clientHeight,
      NEAR_PLANE,
      FAR_PLANE
    );
    // Camera starts at the center of the sphere
    this.camera.position.set(0, 0, 0);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: rendererConfig.antialias,
      alpha: false,
    });
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, rendererConfig.maxPixelRatio)
    );
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // Geometry — inverted sphere (camera looks at inside)
    this.geometry = new THREE.SphereGeometry(
      SPHERE_RADIUS,
      SPHERE_SEGMENTS_W,
      SPHERE_SEGMENTS_H
    );
    this.geometry.scale(-1, 1, 1); // Invert X to see inside

    // Material — will receive texture when panorama loads
    this.material = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      color: 0x000000, // Black until texture loads
    });

    // Texture loader
    this.textureLoader = new THREE.TextureLoader();

    // Resize observer
    this.setupResizeObserver();
  }

  /**
   * Carga una imagen equirectangular y la muestra en la esfera.
   */
  async loadPanorama(url: string, cameraConfig?: WorldCamera): Promise<void> {
    const safeUrl = sanitizeAssetUrl(url);
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        safeUrl,
        (texture) => {
          // Dispose previous texture
          if (this.currentTexture) {
            this.currentTexture.dispose();
          }

          // Configure texture for equirectangular
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.mapping = THREE.EquirectangularReflectionMapping;
          this.currentTexture = texture;

          // Apply to material
          this.material.map = texture;
          this.material.color.set(0xffffff); // White so texture shows correctly
          this.material.needsUpdate = true;

          // Create or update sphere mesh
          if (!this.sphere) {
            this.sphere = new THREE.Mesh(this.geometry, this.material);
            this.scene.add(this.sphere);
          }

          // Apply camera config
          if (cameraConfig) {
            this.applyCameraConfig(cameraConfig);
          }

          resolve();
        },
        undefined, // onProgress (not used)
        (error) => {
          reject(new Error(`Failed to load panorama from ${url}: ${String(error)}`));
        }
      );
    });
  }

  /**
   * Aplica configuración de cámara (FOV, posición inicial, auto-rotate).
   */
  applyCameraConfig(config: WorldCamera): void {
    if (config.fov !== undefined) {
      this.camera.fov = config.fov;
      this.camera.updateProjectionMatrix();
    }

    if (config.initialLon !== undefined || config.initialLat !== undefined) {
      const lon = THREE.MathUtils.degToRad(config.initialLon ?? 0);
      const lat = THREE.MathUtils.degToRad(config.initialLat ?? 0);

      // Convert spherical to look-at target
      const target = new THREE.Vector3(
        SPHERE_RADIUS * Math.cos(lat) * Math.cos(lon),
        SPHERE_RADIUS * Math.sin(lat),
        SPHERE_RADIUS * Math.cos(lat) * Math.sin(lon)
      );
      this.camera.lookAt(target);
    }
  }

  /**
   * Inicia el render loop.
   * @param onFrame callback opcional ejecutado cada frame (para controles, etc.)
   */
  startRenderLoop(onFrame?: () => void): void {
    if (this.disposed) return;

    this.renderCallback = onFrame ?? null;
    const animate = () => {
      if (this.disposed) return;
      this.animationFrameId = requestAnimationFrame(animate);
      this.renderCallback?.();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  /**
   * Detiene el render loop.
   */
  stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.renderCallback = null;
  }

  /**
   * Renderiza un solo frame (útil para snapshots).
   */
  renderFrame(): void {
    if (this.disposed) return;
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Redimensiona el renderer al tamaño del contenedor.
   */
  resize(): void {
    if (this.disposed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Obtiene el canvas DOM del renderer.
   */
  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /**
   * Libera todos los recursos GPU y DOM.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.stopRenderLoop();

    // Disconnect ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Remove canvas from DOM
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }

    // Dispose Three.js resources
    this.currentTexture?.dispose();
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();

    this.sphere = null;
    this.currentTexture = null;
  }

  /**
   * Observa cambios de tamaño del contenedor.
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(this.container);
  }
}
