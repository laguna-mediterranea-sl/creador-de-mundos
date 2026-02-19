import type { CSSProperties, ReactNode } from 'react';
import { sanitizeAssetUrl } from '@world-engine/core';
import { useWorldEngineContext } from './context.js';

export interface LoadingScreenProps {
  /** Custom loading content */
  children?: ReactNode;
  /** Additional CSS class */
  className?: string;
}

const overlayStyles: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 50,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--we-color-background)',
  transition: 'opacity 0.4s ease',
  pointerEvents: 'auto',
};

const spinnerStyles: CSSProperties = {
  width: '48px',
  height: '48px',
  border: '4px solid var(--we-color-text-dim)',
  borderTopColor: 'var(--we-color-primary)',
  borderRadius: '50%',
  animation: 'we-spin 0.8s linear infinite',
};

/**
 * LoadingScreen — Pantalla de carga mostrada mientras el mundo se renderiza.
 *
 * Usa CSS custom properties del tema para adaptarse al branding del producto.
 * Soporta contenido personalizado via children.
 */
export function LoadingScreen({ children, className }: LoadingScreenProps) {
  const { loading, theme } = useWorldEngineContext();

  if (!loading) return null;

  return (
    <div
      className={className}
      style={overlayStyles}
      data-testid="loading-screen"
      role="status"
      aria-label="Loading world"
    >
      {children ?? (
        <>
          <div style={spinnerStyles} />
          <p style={{
            marginTop: '16px',
            fontFamily: 'var(--we-font-body)',
            fontSize: '1rem',
            color: 'var(--we-color-text-dim)',
          }}>
            {theme.productName ? `Cargando ${theme.productName}...` : 'Cargando...'}
          </p>
          {theme.logo && (
            <img
              src={sanitizeAssetUrl(theme.logo)}
              alt={theme.productName}
              style={{
                marginTop: '24px',
                maxWidth: '120px',
                maxHeight: '60px',
                opacity: 0.6,
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
