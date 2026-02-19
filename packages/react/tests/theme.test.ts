import { describe, it, expect } from 'vitest';
import { themeToCSS } from '../src/theme.js';
import { mockTheme } from './test-utils.js';

describe('themeToCSS', () => {
  it('should convert theme colors to CSS custom properties', () => {
    const css = themeToCSS(mockTheme);

    expect(css['--we-color-primary' as keyof typeof css]).toBe('#38bdf8');
    expect(css['--we-color-secondary' as keyof typeof css]).toBe('#818cf8');
    expect(css['--we-color-accent' as keyof typeof css]).toBe('#f59e0b');
    expect(css['--we-color-background' as keyof typeof css]).toBe('#0a0e17');
    expect(css['--we-color-surface' as keyof typeof css]).toBe('rgba(12, 18, 32, 0.92)');
    expect(css['--we-color-text' as keyof typeof css]).toBe('#e2e8f0');
    expect(css['--we-color-text-dim' as keyof typeof css]).toBe('#94a3b8');
  });

  it('should convert theme fonts to CSS custom properties', () => {
    const css = themeToCSS(mockTheme);

    expect(css['--we-font-display' as keyof typeof css]).toBe('Georgia, serif');
    expect(css['--we-font-body' as keyof typeof css]).toBe('system-ui, sans-serif');
  });

  it('should convert border radius', () => {
    const css = themeToCSS(mockTheme);

    expect(css['--we-border-radius' as keyof typeof css]).toBe('14px');
  });

  it('should convert hotspot colors', () => {
    const css = themeToCSS(mockTheme);

    expect(css['--we-color-hotspot-info' as keyof typeof css]).toBe('#38bdf8');
    expect(css['--we-color-hotspot-portal' as keyof typeof css]).toBe('#f59e0b');
    expect(css['--we-color-hotspot-quiz' as keyof typeof css]).toBe('#34d399');
  });
});
