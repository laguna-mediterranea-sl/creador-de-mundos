import { describe, it, expect, vi } from 'vitest';
import { sanitizeColor, sanitizeAssetUrl, escapeAttr } from '../src/utils/sanitize.js';

describe('sanitizeColor', () => {
  it('should accept valid hex colors', () => {
    expect(sanitizeColor('#ff0000')).toBe('#ff0000');
    expect(sanitizeColor('#FFF')).toBe('#FFF');
    expect(sanitizeColor('#7c3aed')).toBe('#7c3aed');
    expect(sanitizeColor('#ff000080')).toBe('#ff000080');
  });

  it('should accept valid rgb/rgba colors', () => {
    expect(sanitizeColor('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)');
    expect(sanitizeColor('rgba(255, 0, 0, 0.5)')).toBe('rgba(255, 0, 0, 0.5)');
  });

  it('should accept named colors', () => {
    expect(sanitizeColor('red')).toBe('red');
    expect(sanitizeColor('blue')).toBe('blue');
    expect(sanitizeColor('transparent')).toBe('transparent');
  });

  it('should reject CSS injection attempts', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(sanitizeColor('red; content: url(evil)')).toBe('#666666');
    expect(sanitizeColor('expression(alert())')).toBe('#666666');
    expect(sanitizeColor('url(javascript:alert())')).toBe('#666666');
    expect(sanitizeColor('; background-image: url(evil)')).toBe('#666666');

    consoleSpy.mockRestore();
  });

  it('should use custom fallback when provided', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(sanitizeColor('invalid', '#000')).toBe('#000');
    consoleSpy.mockRestore();
  });
});

describe('sanitizeAssetUrl', () => {
  it('should accept relative URLs', () => {
    expect(sanitizeAssetUrl('/worlds/scene.jpg')).toBe('/worlds/scene.jpg');
    expect(sanitizeAssetUrl('./assets/pano.png')).toBe('./assets/pano.png');
    expect(sanitizeAssetUrl('../shared/world.json')).toBe('../shared/world.json');
    expect(sanitizeAssetUrl('worlds/scene.jpg')).toBe('worlds/scene.jpg');
  });

  it('should accept https URLs', () => {
    expect(sanitizeAssetUrl('https://cdn.example.com/world.jpg')).toBe('https://cdn.example.com/world.jpg');
  });

  it('should accept http URLs', () => {
    expect(sanitizeAssetUrl('http://localhost:3000/world.jpg')).toBe('http://localhost:3000/world.jpg');
  });

  it('should reject javascript: URLs', () => {
    expect(() => sanitizeAssetUrl('javascript:alert(1)')).toThrow('Blocked unsafe URL');
  });

  it('should reject data: URLs', () => {
    expect(() => sanitizeAssetUrl('data:text/html,<script>alert(1)</script>')).toThrow('Blocked unsafe URL');
  });

  it('should reject ftp: URLs', () => {
    expect(() => sanitizeAssetUrl('ftp://files.example.com/world.jpg')).toThrow('Blocked unsafe URL');
  });
});

describe('escapeAttr', () => {
  it('should escape HTML special characters', () => {
    expect(escapeAttr('Hello & World')).toBe('Hello &amp; World');
    expect(escapeAttr('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escapeAttr("it's")).toBe("it&#39;s");
    expect(escapeAttr('<script>')).toBe('&lt;script&gt;');
  });

  it('should leave normal text unchanged', () => {
    expect(escapeAttr('Simple text')).toBe('Simple text');
    expect(escapeAttr('Estratos sedimentarios')).toBe('Estratos sedimentarios');
  });
});
