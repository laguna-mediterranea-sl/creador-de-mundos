import type { ApiClient } from './ApiClient.js';
import type { World } from '../types/World.js';
import type { Hotspot, SphericalPosition } from '../types/Hotspot.js';
import type { HotspotTemplate } from '../editor/HotspotTemplates.js';

/**
 * WorldService — Servicio API para gestión de mundos y hotspots.
 *
 * CRUD completo para:
 * - Mundos (crear, editar, listar, eliminar)
 * - Hotspots (crear, editar, mover, eliminar)
 * - Templates de hotspots
 * - Generación de escenas con IA
 */
export class WorldService {
  constructor(private api: ApiClient) {}

  // --- Mundos ---

  async getWorlds(moduleId?: string): Promise<World[]> {
    const params = moduleId ? `?moduleId=${moduleId}` : '';
    return this.api.get(`/api/worlds${params}`);
  }

  async getWorld(worldId: string): Promise<World> {
    return this.api.get(`/api/worlds/${worldId}`);
  }

  async createWorld(world: Omit<World, 'hotspots'>): Promise<World> {
    return this.api.post('/api/worlds', world);
  }

  async updateWorld(worldId: string, updates: Partial<World>): Promise<World> {
    return this.api.put(`/api/worlds/${worldId}`, updates);
  }

  async deleteWorld(worldId: string): Promise<void> {
    return this.api.delete(`/api/worlds/${worldId}`);
  }

  // --- Hotspots ---

  async getHotspots(worldId: string): Promise<Hotspot[]> {
    return this.api.get(`/api/worlds/${worldId}/hotspots`);
  }

  async createHotspot(worldId: string, hotspot: Omit<Hotspot, 'id'>): Promise<Hotspot> {
    return this.api.post(`/api/worlds/${worldId}/hotspots`, hotspot);
  }

  async updateHotspot(hotspotId: string, updates: Partial<Hotspot>): Promise<Hotspot> {
    return this.api.put(`/api/hotspots/${hotspotId}`, updates);
  }

  async moveHotspot(hotspotId: string, position: SphericalPosition): Promise<void> {
    return this.api.patch(`/api/hotspots/${hotspotId}/position`, position);
  }

  async deleteHotspot(hotspotId: string): Promise<void> {
    return this.api.delete(`/api/hotspots/${hotspotId}`);
  }

  /** Crea hotspots en batch desde un template. */
  async createHotspotsFromTemplate(worldId: string, templateId: string): Promise<Hotspot[]> {
    return this.api.post(`/api/worlds/${worldId}/hotspots/from-template`, { templateId });
  }

  // --- Templates ---

  async getTemplates(): Promise<HotspotTemplate[]> {
    return this.api.get('/api/hotspot-templates');
  }

  async createTemplate(template: Omit<HotspotTemplate, 'id'>): Promise<HotspotTemplate> {
    return this.api.post('/api/hotspot-templates', template);
  }

  async deleteTemplate(templateId: string): Promise<void> {
    return this.api.delete(`/api/hotspot-templates/${templateId}`);
  }

  // --- Generación de escenas ---

  async generateScene(request: {
    prompt: string;
    style?: string;
    quality?: string;
  }): Promise<{
    panoramaUrl: string;
    thumbnailUrl?: string;
    externalId?: string;
  }> {
    return this.api.post('/api/worlds/generate', request, {
      timeoutMs: 120000,
    });
  }

  // --- Narración TTS ---

  async generateNarration(hotspotId: string): Promise<{
    narrationUrl: string;
    durationSecs: number;
  }> {
    return this.api.post('/api/tts/generate', { hotspotId }, {
      timeoutMs: 30000,
    });
  }

  async generateAllNarrations(worldId: string): Promise<{
    generated: number;
    errors: string[];
  }> {
    return this.api.post('/api/tts/generate-batch', { worldId }, {
      timeoutMs: 120000,
    });
  }

  // --- Media upload ---

  async getPresignedUploadUrl(filename: string, contentType: string, size: number): Promise<{
    uploadUrl: string;
    publicUrl: string;
    key: string;
  }> {
    return this.api.post('/api/media/presigned-url', { filename, contentType, size });
  }
}
