/**
 * Utilidades de sanitización para prevenir inyección CSS/URL.
 * Protegen contra XSS, inyección CSS y carga de recursos maliciosos.
 */

/** Regex para formatos de color CSS válidos (sin named colors — esos se validan aparte) */
const CSS_COLOR_FORMAT_REGEX = /^(#[0-9a-fA-F]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)|rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[\d.]+\s*\)|hsl\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*\)|hsla\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*,\s*[\d.]+\s*\))$/;

/** Named CSS colors (subset of most common) */
const NAMED_COLORS = new Set([
  'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
  'pink', 'gray', 'grey', 'brown', 'cyan', 'magenta', 'lime', 'olive',
  'navy', 'teal', 'maroon', 'aqua', 'fuchsia', 'silver', 'transparent',
]);

/**
 * Valida que un string sea un color CSS seguro.
 * Devuelve el color validado o un fallback seguro.
 */
export function sanitizeColor(color: string, fallback = '#666666'): string {
  const trimmed = color.trim();

  // Named color — must be in our allowlist
  if (NAMED_COLORS.has(trimmed.toLowerCase())) {
    return trimmed;
  }

  // Regex match for hex, rgb, rgba, hsl, hsla
  if (CSS_COLOR_FORMAT_REGEX.test(trimmed)) {
    return trimmed;
  }

  console.warn(`[WorldEngine] Invalid CSS color rejected: "${trimmed}". Using fallback.`);
  return fallback;
}

/** Protocolos peligrosos que bloquear explícitamente */
const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'blob:'];

/** Protocolos permitidos para cargar assets */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Valida que una URL sea segura para cargar como recurso (imagen, audio, JSON).
 * Bloquea javascript:, data:, vbscript:, blob: y protocolos desconocidos.
 */
export function sanitizeAssetUrl(url: string): string {
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  // Block dangerous protocols early (before relative URL check)
  for (const protocol of DANGEROUS_PROTOCOLS) {
    if (lower.startsWith(protocol)) {
      throw new Error(`[WorldEngine] Blocked unsafe URL: "${trimmed}". Only http/https and relative URLs allowed.`);
    }
  }

  // Relative URLs are safe (resolved against page origin)
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return trimmed;
  }

  // Relative URL without prefix (e.g., "worlds/scene.jpg")
  if (!trimmed.includes('://')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return trimmed;
    }
  } catch {
    // Invalid URL — fall through to error
  }

  throw new Error(`[WorldEngine] Blocked unsafe URL: "${trimmed}". Only http/https and relative URLs allowed.`);
}

/**
 * Escapa texto para uso seguro en atributos HTML.
 */
export function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
