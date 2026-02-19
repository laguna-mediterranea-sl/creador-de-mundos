import type { CSSProperties } from 'react';
import { useHotspot } from './hooks/useHotspot.js';
import { useWorldEngineContext } from './context.js';

export interface ProgressTrackerProps {
  /** Position on screen */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Show percentage or fraction */
  format?: 'percent' | 'fraction';
  /** Additional CSS class */
  className?: string;
}

const positionMap: Record<string, CSSProperties> = {
  'top-left': { top: '16px', left: '16px' },
  'top-right': { top: '16px', right: '16px' },
  'bottom-left': { bottom: '80px', left: '16px' },
  'bottom-right': { bottom: '80px', right: '16px' },
};

/**
 * ProgressTracker — Indicador visual de progreso de exploración.
 *
 * Muestra cuántos hotspots se han visitado del total.
 * Configurable en posición y formato de display.
 */
export function ProgressTracker({
  position = 'top-right',
  format = 'fraction',
  className,
}: ProgressTrackerProps) {
  const { theme } = useWorldEngineContext();
  const { visitedCount, totalCount } = useHotspot();

  if (!theme.showProgress || totalCount === 0) return null;

  const percentage = Math.round((visitedCount / totalCount) * 100);
  const label = format === 'percent'
    ? `${percentage}%`
    : `${visitedCount} / ${totalCount}`;

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        ...positionMap[position],
        zIndex: 15,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
      }}
      data-testid="progress-tracker"
      role="status"
      aria-label={`Progress: ${visitedCount} of ${totalCount} visited`}
    >
      {/* Progress bar */}
      <div style={{
        width: '80px',
        height: '6px',
        borderRadius: '3px',
        background: 'var(--we-color-background)',
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: 'var(--we-color-accent)',
          borderRadius: '3px',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Label */}
      <span style={{
        fontFamily: 'var(--we-font-body)',
        fontSize: '0.75rem',
        color: 'var(--we-color-text-dim)',
        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
      }}>
        {label}
      </span>
    </div>
  );
}
