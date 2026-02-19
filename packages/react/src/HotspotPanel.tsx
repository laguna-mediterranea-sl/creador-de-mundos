import { type CSSProperties, type ReactNode } from 'react';
import type { Hotspot } from '@world-engine/core';
import { sanitizeAssetUrl } from '@world-engine/core';
import { useHotspot } from './hooks/useHotspot.js';
import { useAudio } from './hooks/useAudio.js';
import { useWorldEngineContext } from './context.js';

export interface HotspotPanelProps {
  /** Render prop for fully custom panel content */
  children?: (hotspot: Hotspot, actions: HotspotPanelActions) => ReactNode;
  /** Position of the panel */
  position?: 'right' | 'left' | 'bottom';
  /** Show close button */
  showClose?: boolean;
  /** Show audio play button */
  showAudio?: boolean;
  /** Additional CSS class */
  className?: string;
}

export interface HotspotPanelActions {
  close: () => void;
  playAudio: () => void;
  stopAudio: () => void;
  isPlaying: boolean;
}

const panelPositionStyles: Record<string, CSSProperties> = {
  right: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    bottom: '16px',
    width: '360px',
    maxWidth: 'calc(100% - 32px)',
  },
  left: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    bottom: '16px',
    width: '360px',
    maxWidth: 'calc(100% - 32px)',
  },
  bottom: {
    position: 'absolute',
    left: '16px',
    right: '16px',
    bottom: '16px',
    maxHeight: '50%',
  },
};

/**
 * HotspotPanel — Panel de información del hotspot activo.
 *
 * Muestra el contenido del hotspot seleccionado: título, texto,
 * imagen, vídeo, y botón de audio TTS.
 *
 * Puede usarse con contenido por defecto o con un render prop
 * para personalización completa por parte del producto.
 */
export function HotspotPanel({
  children,
  position,
  showClose = true,
  showAudio = true,
  className,
}: HotspotPanelProps) {
  const { theme } = useWorldEngineContext();
  const { activeHotspot } = useHotspot();
  const { playHotspotAudio, stopAudio, isPlaying } = useAudio();

  const panelPos = position ?? theme.panelPosition;

  if (!activeHotspot) return null;

  const actions: HotspotPanelActions = {
    close: () => {
      // Deselect hotspot — this is handled via engine events
      // The parent can implement close logic
    },
    playAudio: () => playHotspotAudio(activeHotspot.id),
    stopAudio,
    isPlaying,
  };

  // Custom render prop — product controls the entire panel content
  if (children) {
    return (
      <div
        className={className}
        style={{
          ...panelPositionStyles[panelPos],
          zIndex: 20,
          pointerEvents: 'auto',
        }}
        data-testid="hotspot-panel"
        role="dialog"
        aria-label={activeHotspot.content.title}
      >
        {children(activeHotspot, actions)}
      </div>
    );
  }

  // Default panel rendering
  return (
    <div
      className={className}
      style={{
        ...panelPositionStyles[panelPos],
        zIndex: 20,
        pointerEvents: 'auto',
        background: 'var(--we-color-surface)',
        borderRadius: 'var(--we-border-radius)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
      data-testid="hotspot-panel"
      role="dialog"
      aria-label={activeHotspot.content.title}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3
          style={{
            margin: 0,
            fontFamily: 'var(--we-font-display)',
            fontSize: '1.25rem',
            color: 'var(--we-color-text)',
          }}
        >
          {activeHotspot.content.title}
        </h3>
        {showClose && (
          <button
            onClick={actions.close}
            aria-label="Close panel"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--we-color-text-dim)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            {'\u00D7'}
          </button>
        )}
      </div>

      {/* Image */}
      {activeHotspot.content.image && (
        <img
          src={sanitizeAssetUrl(activeHotspot.content.image)}
          alt={activeHotspot.content.title}
          style={{
            width: '100%',
            borderRadius: 'calc(var(--we-border-radius) / 2)',
            objectFit: 'cover',
            maxHeight: '200px',
          }}
        />
      )}

      {/* Text */}
      {activeHotspot.content.text && (
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--we-font-body)',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            color: 'var(--we-color-text)',
          }}
        >
          {activeHotspot.content.text}
        </p>
      )}

      {/* Video */}
      {activeHotspot.content.video && (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
          <iframe
            src={sanitizeAssetUrl(activeHotspot.content.video)}
            title={activeHotspot.content.title}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: 'calc(var(--we-border-radius) / 2)',
            }}
            allowFullScreen
          />
        </div>
      )}

      {/* Audio button */}
      {showAudio && (activeHotspot.content.audioUrl || activeHotspot.content.audioAutoGenerate) && (
        <button
          onClick={isPlaying ? stopAudio : () => playHotspotAudio(activeHotspot.id)}
          style={{
            padding: '10px 16px',
            background: 'var(--we-color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'calc(var(--we-border-radius) / 2)',
            cursor: 'pointer',
            fontFamily: 'var(--we-font-body)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          aria-label={isPlaying ? 'Stop audio' : 'Play audio'}
        >
          <span>{isPlaying ? '\u23F9' : '\u25B6'}</span>
          <span>{isPlaying ? 'Detener' : 'Escuchar'}</span>
        </button>
      )}

      {/* Quiz */}
      {activeHotspot.type === 'quiz' && activeHotspot.quiz && (
        <QuizSection hotspot={activeHotspot} />
      )}
    </div>
  );
}

// --- Internal quiz component ---

function QuizSection({ hotspot }: { hotspot: Hotspot }) {
  const handleAnswer = (_index: number) => {
    // Quiz evaluation is handled by the Shell via EngineCallbacks.onQuizAnswer.
    // The HotspotPanel only renders the UI — the Shell wires the logic.
    // In a future iteration, this component can manage answer state
    // and display correct/incorrect feedback.
  };

  if (!hotspot.quiz) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{
        margin: 0,
        fontWeight: 600,
        color: 'var(--we-color-text)',
        fontFamily: 'var(--we-font-body)',
      }}>
        {hotspot.quiz.question}
      </p>
      {hotspot.quiz.options.map((option, i) => (
        <button
          key={i}
          onClick={() => handleAnswer(i)}
          style={{
            padding: '10px 16px',
            background: 'var(--we-color-background)',
            color: 'var(--we-color-text)',
            border: '1px solid var(--we-color-text-dim)',
            borderRadius: 'calc(var(--we-border-radius) / 2)',
            cursor: 'pointer',
            fontFamily: 'var(--we-font-body)',
            fontSize: '0.9rem',
            textAlign: 'left',
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
