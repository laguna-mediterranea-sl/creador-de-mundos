import { type CSSProperties } from 'react';
import { useCoReading } from './CoReadingProvider.js';
import { REACTION_EMOJIS } from '../types.js';

export interface ListenerOverlayProps {
  /** Nombre del narrador (para mostrar estado) */
  narratorName?: string;
  /** Clase CSS adicional */
  className?: string;
  /** Estilos inline adicionales */
  style?: CSSProperties;
}

/**
 * ListenerOverlay — Interfaz del oyente (hijo/a) durante la lectura compartida.
 *
 * Muestra:
 * - Indicador de que el narrador está hablando
 * - Barra de reacciones (emojis)
 * - Página actual (controlada por el narrador)
 * - Botón de micrófono (el oyente puede hablar/reír)
 */
export function ListenerOverlay({
  narratorName = 'el narrador',
  className,
  style,
}: ListenerOverlayProps) {
  const { state, actions } = useCoReading();

  if (state.role !== 'listener') return null;

  const isConnected = state.connectionState === 'connected';
  const isReconnecting = state.connectionState === 'reconnecting';

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 25,
        ...style,
      }}
    >
      {/* Estado de conexión superior */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          borderRadius: '20px',
          pointerEvents: 'auto',
        }}
        aria-live="polite"
      >
        {isReconnecting ? (
          <span style={{ color: '#fbbf24', fontSize: '0.8rem' }}>Reconectando...</span>
        ) : isConnected && state.isRemoteAudioActive ? (
          <>
            <span style={{ color: '#4ade80', fontSize: '0.8rem' }}>
              {'\uD83D\uDD0A'} Escuchando a {narratorName}
            </span>
          </>
        ) : isConnected ? (
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
            Esperando a {narratorName}...
          </span>
        ) : (
          <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Desconectado</span>
        )}
      </div>

      {/* Barra de reacciones inferior */}
      {isConnected && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(12px)',
            borderRadius: '24px',
            pointerEvents: 'auto',
          }}
          role="toolbar"
          aria-label="Reacciones"
        >
          {/* Botón micrófono del oyente */}
          <button
            onClick={() => actions.toggleMic()}
            aria-label={state.isMicEnabled ? 'Silenciar' : 'Hablar'}
            style={{
              ...emojiButtonStyle,
              background: state.isMicEnabled ? 'rgba(74, 222, 128, 0.25)' : 'rgba(255, 255, 255, 0.1)',
            }}
          >
            {state.isMicEnabled ? '\uD83C\uDF99\uFE0F' : '\uD83D\uDD07'}
          </button>

          {/* Separador */}
          <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.15)' }} />

          {/* Emojis de reacción */}
          {REACTION_EMOJIS.map(({ emoji, label }) => (
            <button
              key={label}
              onClick={() => actions.sendEmoji(emoji)}
              aria-label={`Enviar ${label}`}
              style={emojiButtonStyle}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Emoji flotante recibido */}
      {state.lastEmoji && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '4rem',
            pointerEvents: 'none',
            opacity: 0.9,
            animation: 'co-reading-float 3s ease-out forwards',
          }}
          aria-hidden="true"
        >
          {state.lastEmoji}
        </div>
      )}
    </div>
  );
}

const emojiButtonStyle: CSSProperties = {
  width: '42px',
  height: '42px',
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255, 255, 255, 0.1)',
  fontSize: '1.3rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.15s, background 0.2s',
  padding: 0,
};
