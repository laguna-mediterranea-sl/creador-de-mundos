/**
 * Inyecta los estilos CSS necesarios para los hotspots.
 * Se llama una sola vez al inicializar el HotspotManager.
 */
let stylesInjected = false;

export function injectHotspotStyles(): void {
  if (stylesInjected) return;
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.id = 'world-engine-hotspot-styles';
  style.textContent = `
    @keyframes we-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(255, 255, 255, 0); }
    }

    .we-hotspot:hover {
      transform: translate(-50%, -50%) scale(1.15) !important;
      z-index: 100;
    }

    .we-hotspot:focus-visible {
      outline: 3px solid #fff;
      outline-offset: 3px;
    }

    .we-hotspot--active {
      transform: translate(-50%, -50%) scale(1.2) !important;
      z-index: 100;
      animation: none !important;
    }

    .we-hotspot--visited {
      opacity: 0.7;
    }
  `;

  document.head.appendChild(style);
  stylesInjected = true;
}
