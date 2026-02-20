import { type CSSProperties } from 'react';
import { useCoReading } from './CoReadingProvider.js';

export interface NarratorControlsProps {
  /** Número total de páginas del cuento */
  totalPages: number;
  /** Nombre del oyente (para mostrar estado) */
  listenerName?: string;
  /** Clase CSS adicional */
  className?: string;
  /** Estilos inline adicionales */
  style?: CSSProperties;
}

/**
 * NarratorControls — Controles para el padre/madre que lee el cuento.
 *
 * Muestra:
 * - Botón micrófono (mute/unmute)
 * - Navegación de páginas (anterior/siguiente)
 * - Indicador de conexión del oyente
 * - Indicador de emojis recibidos
 */
export function NarratorControls({
  totalPages,
  listenerName = 'el oyente',
  className,
  style,
}: NarratorControlsProps) {
  const { state, actions } = useCoReading();

  if (state.role !== 'narrator') return null;

  const isConnected = state.connectionState === 'connected';
  const hasListener = state.participantCount > 1;

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 20px',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        zIndex: 30,
        pointerEvents: 'auto',
        ...style,
      }}
      role="toolbar"
      aria-label="Controles del narrador"
    >
      {/* Indicador de presencia */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.8rem',
          color: hasListener ? '#4ade80' : '#94a3b8',
        }}
        aria-live="polite"
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: hasListener ? '#4ade80' : '#64748b',
            display: 'inline-block',
          }}
        />
        {hasListener ? `${listenerName} conectado` : 'Esperando...'}
      </div>

      {/* Separador */}
      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)' }} />

      {/* Botón micrófono */}
      <button
        onClick={() => actions.toggleMic()}
        disabled={!isConnected}
        aria-label={state.isMicEnabled ? 'Silenciar micrófono' : 'Activar micrófono'}
        style={{
          ...buttonStyle,
          background: state.isMicEnabled ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          color: state.isMicEnabled ? '#4ade80' : '#ef4444',
        }}
      >
        {state.isMicEnabled ? '\uD83C\uDF99\uFE0F' : '\uD83D\uDD07'}
      </button>

      {/* Navegación de páginas */}
      <button
        onClick={() => actions.changePage(Math.max(0, state.currentPage - 1))}
        disabled={!isConnected || state.currentPage <= 0}
        aria-label="Página anterior"
        style={buttonStyle}
      >
        {'\u25C0'}
      </button>

      <span style={{ color: '#e2e8f0', fontSize: '0.85rem', minWidth: '50px', textAlign: 'center' }}>
        {state.currentPage + 1} / {totalPages}
      </span>

      <button
        onClick={() => actions.changePage(Math.min(totalPages - 1, state.currentPage + 1))}
        disabled={!isConnected || state.currentPage >= totalPages - 1}
        aria-label="Página siguiente"
        style={buttonStyle}
      >
        {'\u25B6'}
      </button>

      {/* Emoji recibido (flotante) */}
      {state.lastEmoji && (
        <span
          style={{
            position: 'absolute',
            top: '-40px',
            right: '20px',
            fontSize: '2rem',
            animation: 'co-reading-float 3s ease-out forwards',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          {state.lastEmoji}
        </span>
      )}
    </div>
  );
}

const buttonStyle: CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255, 255, 255, 0.1)',
  color: '#e2e8f0',
  fontSize: '1.1rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s, opacity 0.2s',
};
