import { EventBus } from '../events/EventBus.js';
import type { World, Hotspot } from '../types/index.js';

/**
 * Personalización del cuento: nombre del niño, preferencias, edad.
 *
 * StoryPersonalization recibe un cuento genérico (template) y genera
 * una versión personalizada reemplazando placeholders por datos del niño.
 */

/** Perfil del niño para personalización */
export interface ChildProfile {
  /** Nombre del niño */
  name: string;
  /** Edad del niño (afecta vocabulario y complejidad) */
  age: number;
  /** Género preferido para pronombres (opciones: 'masculino' | 'femenino' | 'neutro') */
  gender: 'masculino' | 'femenino' | 'neutro';
  /** Intereses del niño (ej: 'dinosaurios', 'princesas', 'espacio') */
  interests: string[];
  /** Color favorito (para temas visuales) */
  favoriteColor?: string;
  /** Nombre de su mascota (si tiene, para incluir en historias) */
  petName?: string;
  /** Nombre de mejor amigo/a */
  bestFriendName?: string;
}

/** Template de cuento con placeholders */
export interface StoryTemplate {
  id: string;
  title: string;
  /** Título con placeholder: "Las aventuras de {nombre}" */
  titleTemplate: string;
  /** Descripción del template */
  description: string;
  /** Rango de edad recomendado */
  ageRange: { min: number; max: number };
  /** Categoría temática */
  category: string;
  /** Páginas del cuento con placeholders */
  pages: StoryPage[];
  /** Mundos 3D asociados (pueden tener hotspots con placeholders) */
  worlds: World[];
  /** Imagen de portada */
  coverUrl?: string;
}

/** Página del cuento */
export interface StoryPage {
  /** Índice de la página (0-based) */
  index: number;
  /** Texto narrativo con placeholders: "{nombre} voló sobre el {color} castillo" */
  textTemplate: string;
  /** Texto personalizado (generado) */
  text?: string;
  /** URL de la ilustración */
  illustrationUrl?: string;
  /** ID del mundo 3D asociado a esta página (si es escena interactiva) */
  worldId?: string;
  /** Audio de narración (generado o pre-grabado) */
  audioUrl?: string;
}

/** Cuento personalizado resultante */
export interface PersonalizedStory {
  id: string;
  templateId: string;
  title: string;
  profile: ChildProfile;
  pages: StoryPage[];
  worlds: World[];
  createdAt: number;
}

/** Placeholders soportados en templates */
const PLACEHOLDER_MAP: Record<string, (profile: ChildProfile) => string> = {
  '{nombre}': (p) => p.name,
  '{edad}': (p) => String(p.age),
  '{color}': (p) => p.favoriteColor ?? 'mágico',
  '{mascota}': (p) => p.petName ?? 'amigo peludo',
  '{amigo}': (p) => p.bestFriendName ?? 'mejor amigo',
  '{interes}': (p) => p.interests[0] ?? 'aventuras',
  // Pronombres según género
  '{el_ella}': (p) => p.gender === 'femenino' ? 'ella' : p.gender === 'masculino' ? 'él' : 'elle',
  '{El_Ella}': (p) => p.gender === 'femenino' ? 'Ella' : p.gender === 'masculino' ? 'Él' : 'Elle',
  '{niño_niña}': (p) => p.gender === 'femenino' ? 'niña' : p.gender === 'masculino' ? 'niño' : 'peque',
  '{héroe_heroína}': (p) => p.gender === 'femenino' ? 'heroína' : p.gender === 'masculino' ? 'héroe' : 'héroe',
  '{valiente}': (p) => p.gender === 'femenino' ? 'valiente' : 'valiente',
};

/**
 * StoryPersonalization — Motor de personalización de cuentos.
 *
 * Toma un template de cuento y un perfil de niño, y genera
 * una versión personalizada con:
 * - Nombre del niño en la narrativa
 * - Pronombres correctos según género
 * - Intereses integrados en la historia
 * - Vocabulario adaptado a la edad
 * - Hotspots personalizados con datos del niño
 */
export class StoryPersonalization {
  constructor(private eventBus?: EventBus) {}

  /**
   * Personaliza un cuento completo a partir de un template y un perfil.
   */
  personalize(template: StoryTemplate, profile: ChildProfile): PersonalizedStory {
    // Validar que la edad esté en el rango del template
    if (profile.age < template.ageRange.min || profile.age > template.ageRange.max) {
      console.warn(
        `[StoryPersonalization] Age ${profile.age} outside recommended range ` +
        `(${template.ageRange.min}-${template.ageRange.max}) for template "${template.id}"`
      );
    }

    const personalizedTitle = this.replacePlaceholders(template.titleTemplate, profile);

    const personalizedPages = template.pages.map(page => ({
      ...page,
      text: this.replacePlaceholders(page.textTemplate, profile),
    }));

    const personalizedWorlds = template.worlds.map(world =>
      this.personalizeWorld(world, profile)
    );

    const story: PersonalizedStory = {
      id: `story-${template.id}-${Date.now()}`,
      templateId: template.id,
      title: personalizedTitle,
      profile,
      pages: personalizedPages,
      worlds: personalizedWorlds,
      createdAt: Date.now(),
    };

    this.eventBus?.emit('story:personalized' as Parameters<typeof this.eventBus.emit>[0], story as never);

    return story;
  }

  /**
   * Personaliza un mundo individual (título y hotspots).
   */
  personalizeWorld(world: World, profile: ChildProfile): World {
    const personalizedHotspots = world.hotspots.map(hotspot =>
      this.personalizeHotspot(hotspot, profile)
    );

    return {
      ...world,
      title: this.replacePlaceholders(world.title, profile),
      description: world.description
        ? this.replacePlaceholders(world.description, profile)
        : undefined,
      hotspots: personalizedHotspots,
    };
  }

  /**
   * Personaliza un hotspot individual.
   */
  personalizeHotspot(hotspot: Hotspot, profile: ChildProfile): Hotspot {
    return {
      ...hotspot,
      content: {
        ...hotspot.content,
        title: this.replacePlaceholders(hotspot.content.title, profile),
        text: hotspot.content.text
          ? this.replacePlaceholders(hotspot.content.text, profile)
          : undefined,
      },
      quiz: hotspot.quiz ? {
        ...hotspot.quiz,
        question: this.replacePlaceholders(hotspot.quiz.question, profile),
        explanation: this.replacePlaceholders(hotspot.quiz.explanation, profile),
      } : undefined,
    };
  }

  /**
   * Reemplaza todos los placeholders en un texto.
   */
  replacePlaceholders(text: string, profile: ChildProfile): string {
    let result = text;
    for (const [placeholder, resolver] of Object.entries(PLACEHOLDER_MAP)) {
      result = result.replaceAll(placeholder, resolver(profile));
    }
    return result;
  }

  /**
   * Valida un template y devuelve los placeholders que contiene.
   */
  analyzeTemplate(template: StoryTemplate): {
    placeholders: string[];
    requiredFields: string[];
  } {
    const allText = [
      template.titleTemplate,
      ...template.pages.map(p => p.textTemplate),
    ].join(' ');

    const found = new Set<string>();
    for (const placeholder of Object.keys(PLACEHOLDER_MAP)) {
      if (allText.includes(placeholder)) {
        found.add(placeholder);
      }
    }

    // Determinar qué campos del perfil son necesarios
    const requiredFields: string[] = ['name'];
    if (found.has('{edad}')) requiredFields.push('age');
    if (found.has('{color}')) requiredFields.push('favoriteColor');
    if (found.has('{mascota}')) requiredFields.push('petName');
    if (found.has('{amigo}')) requiredFields.push('bestFriendName');
    if (found.has('{interes}')) requiredFields.push('interests');
    if (found.has('{el_ella}') || found.has('{El_Ella}') || found.has('{niño_niña}') || found.has('{héroe_heroína}')) {
      requiredFields.push('gender');
    }

    return {
      placeholders: Array.from(found),
      requiredFields,
    };
  }

  /**
   * Adapta el vocabulario según la edad del niño.
   * Simplifica palabras complejas para niños más pequeños.
   */
  static adaptVocabulary(text: string, age: number): string {
    if (age >= 8) return text; // Sin simplificación para mayores de 8

    const simplifications: Record<string, string> = {
      'extraordinario': 'increíble',
      'protagonista': 'héroe',
      'aventurarse': 'explorar',
      'determinación': 'valentía',
      'perspicaz': 'listo',
      'formidable': 'enorme',
      'peculiar': 'especial',
      'espléndido': 'bonito',
      'intrépido': 'valiente',
      'majestuoso': 'grande y bonito',
    };

    let result = text;
    for (const [complex, simple] of Object.entries(simplifications)) {
      result = result.replaceAll(complex, simple);
      // También mayúsculas
      result = result.replaceAll(
        complex.charAt(0).toUpperCase() + complex.slice(1),
        simple.charAt(0).toUpperCase() + simple.slice(1)
      );
    }

    return result;
  }
}
