import { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — Captura errores de renderizado en componentes hijos.
 *
 * Evita que un crash en un subcomponente (HotspotPanel, WorldSidebar, etc.)
 * destruya toda la aplicación. Muestra un fallback recuperable.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[WorldEngine] Component error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

function DefaultErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div
      role="alert"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
        color: '#f1f5f9',
        fontFamily: 'system-ui, sans-serif',
        padding: '24px',
        zIndex: 100,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '12px' }}>!</div>
      <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>Algo ha ido mal</h3>
      <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#94a3b8', maxWidth: '320px' }}>
        {error.message}
      </p>
      <button
        onClick={onReset}
        style={{
          padding: '8px 20px',
          background: '#7c3aed',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.9rem',
        }}
      >
        Reintentar
      </button>
    </div>
  );
}
