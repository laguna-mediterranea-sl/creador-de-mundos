import type { EngineTheme } from '@world-engine/core';
import type { CSSProperties } from 'react';

/**
 * Convierte un EngineTheme en CSS custom properties.
 *
 * Cada producto (Tu Cuento Mágico, Aulas Mágicas) pasa su propio tema.
 * Los componentes del SDK usan estas variables CSS, logrando
 * un styling desacoplado del producto.
 *
 * Ejemplo resultado:
 *   --we-color-primary: #7c3aed;
 *   --we-font-display: 'Baloo 2', cursive;
 *   --we-border-radius: 20px;
 */
export function themeToCSS(theme: EngineTheme): CSSProperties {
  return {
    // Colors
    '--we-color-primary': theme.colors.primary,
    '--we-color-secondary': theme.colors.secondary,
    '--we-color-accent': theme.colors.accent,
    '--we-color-background': theme.colors.background,
    '--we-color-surface': theme.colors.surface,
    '--we-color-text': theme.colors.text,
    '--we-color-text-dim': theme.colors.textDim,
    '--we-color-hotspot-info': theme.colors.hotspotInfo,
    '--we-color-hotspot-portal': theme.colors.hotspotPortal,
    '--we-color-hotspot-quiz': theme.colors.hotspotQuiz,
    // Fonts
    '--we-font-display': theme.fonts.display,
    '--we-font-body': theme.fonts.body,
    // UI
    '--we-border-radius': theme.borderRadius,
  } as CSSProperties;
}

/**
 * CSS base para el contenedor root del WorldViewer.
 */
export const rootStyles: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  fontFamily: 'var(--we-font-body)',
  color: 'var(--we-color-text)',
  backgroundColor: 'var(--we-color-background)',
};
