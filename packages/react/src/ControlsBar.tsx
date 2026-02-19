import type { CSSProperties } from 'react';
import { useNavigation } from './hooks/useNavigation.js';
import { useAudio } from './hooks/useAudio.js';
import { useWorldEngineContext } from './context.js';

/** Default labels (Spanish — both target products are Spanish) */
const DEFAULT_LABELS = {
  previousWorld: 'Mundo anterior',
  nextWorld: 'Siguiente mundo',
  muteAudio: 'Silenciar audio',
  unmuteAudio: 'Activar audio',
  enterVR: 'Modo VR',
} as const;

export interface ControlsBarProps {
  /** Show navigation buttons (prev/next) */
  showNavigation?: boolean;
  /** Show audio mute toggle */
  showAudioToggle?: boolean;
  /** Show VR button */
  showVR?: boolean;
  /** Callback when VR button is clicked (Phase 5 — placeholder) */
  onVRClick?: () => void;
  /** Additional CSS class */
  className?: string;
}

const barStyles: CSSProperties = {
  position: 'absolute',
  bottom: '16px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 20,
  pointerEvents: 'auto',
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  padding: '8px 16px',
  background: 'var(--we-color-surface)',
  borderRadius: 'var(--we-border-radius)',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
};

const btnStyles: CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--we-color-text-dim)',
  color: 'var(--we-color-text)',
  borderRadius: 'calc(var(--we-border-radius) / 2)',
  padding: '8px 12px',
  cursor: 'pointer',
  fontSize: '1rem',
  fontFamily: 'var(--we-font-body)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '40px',
  height: '40px',
  transition: 'background 0.15s ease',
};

const btnActiveStyles: CSSProperties = {
  ...btnStyles,
  background: 'var(--we-color-primary)',
  borderColor: 'var(--we-color-primary)',
  color: '#fff',
};

/**
 * ControlsBar — Barra de controles inferior del visor.
 *
 * Muestra botones de navegación (anterior/siguiente),
 * toggle de audio, y botón VR.
 */
export function ControlsBar({
  showNavigation = true,
  showAudioToggle = true,
  showVR,
  onVRClick,
  className,
}: ControlsBarProps) {
  const { theme } = useWorldEngineContext();
  const { canGoNext, canGoPrevious, nextWorld, previousWorld } = useNavigation();
  const { muted, setMuted } = useAudio();

  const showVRButton = showVR ?? theme.showVRButton;
  const labels = theme.labels;

  if (theme.controlsStyle === 'hidden') return null;
  const minimal = theme.controlsStyle === 'minimal';

  return (
    <div
      className={className}
      style={barStyles}
      data-testid="controls-bar"
      role="toolbar"
      aria-label="Viewer controls"
    >
      {/* Navigation: Previous */}
      {showNavigation && !minimal && (
        <button
          onClick={() => previousWorld()}
          disabled={!canGoPrevious}
          style={{
            ...btnStyles,
            opacity: canGoPrevious ? 1 : 0.4,
            cursor: canGoPrevious ? 'pointer' : 'default',
          }}
          aria-label={labels?.previousWorld ?? DEFAULT_LABELS.previousWorld}
        >
          {'\u2190'}
        </button>
      )}

      {/* Audio toggle */}
      {showAudioToggle && (
        <button
          onClick={() => setMuted(!muted)}
          style={muted ? btnActiveStyles : btnStyles}
          aria-label={muted
            ? (labels?.unmuteAudio ?? DEFAULT_LABELS.unmuteAudio)
            : (labels?.muteAudio ?? DEFAULT_LABELS.muteAudio)}
        >
          {muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
        </button>
      )}

      {/* VR button */}
      {showVRButton && (
        <button
          onClick={onVRClick}
          style={btnStyles}
          aria-label={labels?.enterVR ?? DEFAULT_LABELS.enterVR}
        >
          VR
        </button>
      )}

      {/* Navigation: Next */}
      {showNavigation && !minimal && (
        <button
          onClick={() => nextWorld()}
          disabled={!canGoNext}
          style={{
            ...btnStyles,
            opacity: canGoNext ? 1 : 0.4,
            cursor: canGoNext ? 'pointer' : 'default',
          }}
          aria-label={labels?.nextWorld ?? DEFAULT_LABELS.nextWorld}
        >
          {'\u2192'}
        </button>
      )}
    </div>
  );
}
