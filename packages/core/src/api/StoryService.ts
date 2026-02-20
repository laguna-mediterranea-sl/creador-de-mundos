import type { ApiClient } from './ApiClient.js';
import type { StoryTemplate, PersonalizedStory, ChildProfile } from '../story/StoryPersonalization.js';

/**
 * StoryService — Servicio API para gestión de cuentos.
 *
 * Conecta el frontend con el backend para:
 * - Listar templates de cuentos disponibles
 * - Generar cuentos personalizados con IA
 * - Guardar/recuperar cuentos del usuario
 * - Compartir cuentos
 */
export class StoryService {
  constructor(private api: ApiClient) {}

  /**
   * Lista templates de cuentos disponibles.
   * Filtrable por categoría y rango de edad.
   */
  async getTemplates(filters?: {
    category?: string;
    age?: number;
  }): Promise<StoryTemplate[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.age !== undefined) params.set('age', String(filters.age));

    const query = params.toString();
    return this.api.get(`/api/stories/templates${query ? `?${query}` : ''}`);
  }

  /**
   * Obtiene un template específico por ID.
   */
  async getTemplate(templateId: string): Promise<StoryTemplate> {
    return this.api.get(`/api/stories/templates/${templateId}`);
  }

  /**
   * Genera un cuento personalizado con IA.
   * El backend usa el LLM para crear una historia basada en el perfil del niño.
   */
  async generateStory(request: {
    templateId?: string;
    profile: ChildProfile;
    theme?: string;
    length?: 'short' | 'medium' | 'long';
  }): Promise<PersonalizedStory> {
    return this.api.post('/api/stories/generate', request, {
      timeoutMs: 60000, // Generación con IA puede tardar
    });
  }

  /**
   * Lista los cuentos guardados del usuario.
   */
  async getMyStories(): Promise<PersonalizedStory[]> {
    return this.api.get('/api/stories/mine');
  }

  /**
   * Obtiene un cuento por ID.
   */
  async getStory(storyId: string): Promise<PersonalizedStory> {
    return this.api.get(`/api/stories/${storyId}`);
  }

  /**
   * Guarda un cuento personalizado.
   */
  async saveStory(story: PersonalizedStory): Promise<{ id: string }> {
    return this.api.post('/api/stories', story);
  }

  /**
   * Elimina un cuento guardado.
   */
  async deleteStory(storyId: string): Promise<void> {
    return this.api.delete(`/api/stories/${storyId}`);
  }

  /**
   * Genera la narración TTS para una página del cuento.
   */
  async generateNarration(storyId: string, pageIndex: number): Promise<{
    audioUrl: string;
    durationSecs: number;
  }> {
    return this.api.post(`/api/stories/${storyId}/narrate`, { pageIndex }, {
      timeoutMs: 30000,
    });
  }

  /**
   * Genera narración para TODAS las páginas de un cuento.
   */
  async generateAllNarrations(storyId: string): Promise<{
    generated: number;
    errors: string[];
  }> {
    return this.api.post(`/api/stories/${storyId}/narrate-all`, {}, {
      timeoutMs: 120000,
    });
  }
}
