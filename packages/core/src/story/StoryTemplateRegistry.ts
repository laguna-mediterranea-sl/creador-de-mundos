import type { StoryTemplate } from './StoryPersonalization.js';

/**
 * StoryTemplateRegistry — Registro de templates de cuentos disponibles.
 *
 * Los templates se pueden:
 * - Registrar desde JSON local (seed data)
 * - Cargar desde API remota
 * - Filtrar por categoría, edad, intereses
 */
export class StoryTemplateRegistry {
  private templates = new Map<string, StoryTemplate>();

  /**
   * Registra un template.
   */
  register(template: StoryTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Registra múltiples templates.
   */
  registerAll(templates: StoryTemplate[]): void {
    for (const t of templates) {
      this.register(t);
    }
  }

  /**
   * Obtiene un template por ID.
   */
  get(id: string): StoryTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Lista todos los templates.
   */
  getAll(): StoryTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Filtra templates por criterios.
   */
  filter(criteria: {
    category?: string;
    age?: number;
    interests?: string[];
  }): StoryTemplate[] {
    return this.getAll().filter(t => {
      if (criteria.category && t.category !== criteria.category) return false;
      if (criteria.age !== undefined) {
        if (criteria.age < t.ageRange.min || criteria.age > t.ageRange.max) return false;
      }
      return true;
    });
  }

  /**
   * Carga templates desde una URL remota.
   */
  async loadFromUrl(url: string): Promise<StoryTemplate[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Failed to load templates: ${res.status}`);
      const data = await res.json() as StoryTemplate[];
      this.registerAll(data);
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Número de templates registrados.
   */
  get count(): number {
    return this.templates.size;
  }

  /**
   * Limpia todos los templates.
   */
  clear(): void {
    this.templates.clear();
  }
}
