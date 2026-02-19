import type { RendererConfig } from '../types/Config.js';
import type { WorldAsset } from '../types/World.js';
import { PanoRenderer } from './PanoRenderer.js';

/**
 * Tipo de renderer activo.
 * En Fase 1 solo soportamos 'panorama'.
 * En Fase 3 se añadirá 'splat' (SparkJS).
 */
export type ActiveRendererType = 'panorama' | 'splat';

/**
 * Factoría que selecciona el renderer adecuado según el tipo de asset.
 *
 * Lógica de selección:
 * 1. Si asset.type === 'splat' y config.preferSplats → SplatRenderer (Fase 3)
 * 2. Si splat falla y config.fallbackToPano → PanoRenderer con fallbackPano
 * 3. Si asset.type === 'panorama' → PanoRenderer
 *
 * En Fase 1, siempre devuelve PanoRenderer.
 */
export class RendererFactory {
  /**
   * Determina qué tipo de renderer usar para un asset dado.
   */
  static detectRendererType(
    asset: WorldAsset,
    config: RendererConfig
  ): ActiveRendererType {
    if (asset.type === 'splat' && config.preferSplats) {
      // Fase 3: intentar splat
      // Por ahora, si hay fallback a pano, usamos panorama directamente
      if (config.fallbackToPano && asset.fallbackPano) {
        return 'panorama';
      }
      // Sin implementación de splats aún → caer a panorama si hay fallback
      return 'panorama';
    }
    return 'panorama';
  }

  /**
   * Obtiene la URL del asset a cargar según el renderer detectado.
   */
  static getAssetUrl(
    asset: WorldAsset,
    rendererType: ActiveRendererType
  ): string {
    if (rendererType === 'panorama' && asset.type === 'splat' && asset.fallbackPano) {
      return asset.fallbackPano;
    }
    return asset.url;
  }

  /**
   * Crea una instancia de PanoRenderer.
   * En Fase 3 este método gestionará también SplatRenderer.
   */
  static createRenderer(
    container: HTMLElement,
    config: RendererConfig
  ): PanoRenderer {
    return new PanoRenderer(container, config);
  }
}
