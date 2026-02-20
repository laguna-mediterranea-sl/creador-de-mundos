import type { World } from '../types/World.js';
import { WorldBuilder } from './WorldBuilder.js';
import { HotspotTemplateRegistry, type HotspotTemplate } from './HotspotTemplates.js';

/**
 * Configuración para generar mundos via API (ej: Marble, DALL-E, Skybox).
 */
export interface GenerationConfig {
  /** URL base de la API de generación */
  apiBase: string;
  /** Token de autenticación */
  authToken: string;
  /** Timeout de generación en ms (default 120s — la generación puede tardar) */
  timeoutMs?: number;
}

/**
 * Request para generar una escena.
 */
export interface GenerateSceneRequest {
  /** Prompt descriptivo de la escena */
  prompt: string;
  /** Fuente de generación */
  source: 'text' | 'image';
  /** URL de imagen base (si source === 'image') */
  imageUrl?: string;
  /** Calidad de generación */
  quality?: 'draft' | 'standard' | 'high';
  /** Estilo visual */
  style?: 'realistic' | 'cartoon' | 'watercolor' | 'fantasy';
}

/**
 * Resultado de la generación.
 */
export interface GenerateSceneResult {
  success: boolean;
  /** URL del panorama 360° generado */
  panoramaUrl?: string;
  /** URL del thumbnail generado */
  thumbnailUrl?: string;
  /** ID del mundo generado en la API */
  externalId?: string;
  /** Error si la generación falló */
  error?: string;
}

/**
 * SceneGenerator — Genera escenas 360° y las convierte en mundos WorldEngine.
 *
 * Flujo:
 * 1. Admin describe la escena ("Un bosque encantado con un lago al atardecer")
 * 2. SceneGenerator envía el prompt a la API de generación
 * 3. La API devuelve una imagen panorámica 360°
 * 4. SceneGenerator crea un World con hotspots desde un template
 * 5. El admin rellena el contenido de cada hotspot
 */
export class SceneGenerator {
  private config: GenerationConfig;
  private templateRegistry: HotspotTemplateRegistry;

  constructor(config: GenerationConfig) {
    this.config = config;
    this.templateRegistry = new HotspotTemplateRegistry();
  }

  /**
   * Genera una escena 360° a partir de un prompt.
   */
  async generate(request: GenerateSceneRequest): Promise<GenerateSceneResult> {
    const timeout = this.config.timeoutMs ?? 120000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(`${this.config.apiBase}/api/scenes/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { success: false, error: `Generation failed: ${res.status} ${body}` };
      }

      return await res.json();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, error: `Generation timeout after ${timeout}ms` };
      }
      return { success: false, error: String(err) };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Crea un World completo a partir de una escena generada + template de hotspots.
   *
   * @param sceneResult Resultado de la generación
   * @param worldId ID para el nuevo mundo
   * @param title Título del mundo
   * @param templateId ID del template de hotspots a aplicar
   * @returns World listo para registrar en el engine
   */
  createWorldFromScene(
    sceneResult: GenerateSceneResult,
    worldId: string,
    title: string,
    templateId?: string
  ): World {
    if (!sceneResult.panoramaUrl) {
      throw new Error('Scene result has no panorama URL');
    }

    const builder = new WorldBuilder(worldId, title)
      .setAsset({
        type: 'panorama',
        url: sceneResult.panoramaUrl,
        format: 'jpg',
        thumbnail: sceneResult.thumbnailUrl,
      })
      .setCamera({
        initialLon: 180,
        initialLat: 0,
        autoRotate: true,
        autoRotateSpeed: -0.5,
      });

    // Aplicar template de hotspots si se especificó
    if (templateId) {
      const template = this.templateRegistry.get(templateId);
      if (template) {
        this.applyTemplate(builder, template);
      }
    }

    return builder.build();
  }

  /**
   * Aplica un template de hotspots a un WorldBuilder.
   * Crea hotspots con posiciones del template y contenido vacío (para rellenar).
   */
  applyTemplate(builder: WorldBuilder, template: HotspotTemplate): void {
    for (const pos of template.positions) {
      builder.addInfoHotspot(
        pos.position,
        pos.label,
        '', // Texto vacío — el admin lo rellena después
        { audioAutoGenerate: true }
      );
    }
  }

  /**
   * Acceso al registro de templates para consultar disponibles.
   */
  get templates(): HotspotTemplateRegistry {
    return this.templateRegistry;
  }

  /**
   * Genera una escena y crea el World en un solo paso.
   */
  async generateAndBuild(
    request: GenerateSceneRequest,
    worldId: string,
    title: string,
    templateId?: string
  ): Promise<{ world: World; generationResult: GenerateSceneResult }> {
    const result = await this.generate(request);
    if (!result.success || !result.panoramaUrl) {
      throw new Error(result.error ?? 'Scene generation failed');
    }

    const world = this.createWorldFromScene(result, worldId, title, templateId);
    return { world, generationResult: result };
  }
}
