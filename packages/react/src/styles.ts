/**
 * Inyecta los estilos CSS base necesarios para los componentes React del SDK.
 * Se llama automáticamente al montar WorldViewer.
 */
let injected = false;

export function injectReactStyles(): void {
  if (injected) return;
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.id = 'world-engine-react-styles';
  style.textContent = `
    @keyframes we-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
  injected = true;
}
