import type { CSSProperties, ReactNode } from 'react';
import type { World } from '@world-engine/core';
import { sanitizeAssetUrl } from '@world-engine/core';
import { useNavigation } from './hooks/useNavigation.js';
import { useWorldEngineContext } from './context.js';

export interface WorldSidebarProps {
  /** Custom render of each world item */
  children?: (world: World, isCurrent: boolean) => ReactNode;
  /** All worlds to display in the sidebar */
  worlds: World[];
  /** Position override (default from theme) */
  position?: 'left' | 'right';
  /** Show itinerary progress */
  showProgress?: boolean;
  /** Additional CSS class */
  className?: string;
}

const sidebarBase: CSSProperties = {
  position: 'absolute',
  top: '16px',
  bottom: '16px',
  width: '260px',
  maxWidth: 'calc(100% - 32px)',
  zIndex: 15,
  pointerEvents: 'auto',
  background: 'var(--we-color-surface)',
  borderRadius: 'var(--we-border-radius)',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  overflowY: 'auto',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
};

/**
 * WorldSidebar — Sidebar de navegación entre mundos.
 *
 * Muestra la lista de mundos disponibles con indicador del mundo actual.
 * Soporta render prop para personalización de cada item.
 */
export function WorldSidebar({
  children,
  worlds,
  position,
  showProgress,
  className,
}: WorldSidebarProps) {
  const { theme } = useWorldEngineContext();
  const { goToWorld, activeWorldId, itineraryIndex, itineraryTotal } = useNavigation();

  const sidePos = position ?? theme.sidebarPosition;
  if (sidePos === 'hidden') return null;

  return (
    <nav
      className={className}
      style={{
        ...sidebarBase,
        [sidePos === 'left' ? 'left' : 'right']: '16px',
      }}
      data-testid="world-sidebar"
      aria-label="World navigation"
    >
      {/* Header */}
      <h4 style={{
        margin: '0 0 8px 0',
        fontFamily: 'var(--we-font-display)',
        fontSize: '1rem',
        color: 'var(--we-color-text)',
      }}>
        {theme.labels?.worldsHeader ?? 'Mundos'}
      </h4>

      {/* Progress indicator */}
      {showProgress && itineraryTotal > 0 && (
        <div style={{
          fontSize: '0.8rem',
          color: 'var(--we-color-text-dim)',
          marginBottom: '8px',
          fontFamily: 'var(--we-font-body)',
        }}>
          {itineraryIndex + 1} / {itineraryTotal}
        </div>
      )}

      {/* World list */}
      {worlds.map((world) => {
        const isCurrent = world.id === activeWorldId;

        if (children) {
          return (
            <div key={world.id} onClick={() => goToWorld(world.id)}>
              {children(world, isCurrent)}
            </div>
          );
        }

        return (
          <button
            key={world.id}
            onClick={() => goToWorld(world.id)}
            style={{
              padding: '10px 12px',
              background: isCurrent ? 'var(--we-color-primary)' : 'transparent',
              color: isCurrent ? '#fff' : 'var(--we-color-text)',
              border: isCurrent ? 'none' : '1px solid var(--we-color-text-dim)',
              borderRadius: 'calc(var(--we-border-radius) / 2)',
              cursor: 'pointer',
              fontFamily: 'var(--we-font-body)',
              fontSize: '0.85rem',
              textAlign: 'left',
              transition: 'background 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            aria-current={isCurrent ? 'true' : undefined}
          >
            {/* Thumbnail */}
            {world.asset.thumbnail && (
              <img
                src={sanitizeAssetUrl(world.asset.thumbnail)}
                alt=""
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
            )}
            <span>{world.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
