import {
  useRef,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from 'react';
import type {
  EngineTheme,
  World,
  AudioConfig,
  RendererConfig,
  Itinerary,
  EngineCallbacks,
  Hotspot,
} from '@world-engine/core';
import { WorldEngineContext } from './context.js';
import { useWorldEngine } from './hooks/useWorldEngine.js';
import { themeToCSS, rootStyles } from './theme.js';

// --- Sub-component types for slot pattern ---

/** Render prop for the hotspot panel slot */
export type PanelRenderProp = (hotspot: Hotspot | null) => ReactNode;

/** Props for WorldViewer.Panel */
export interface PanelSlotProps {
  children: PanelRenderProp;
}

/** Props for WorldViewer.Sidebar */
export interface SidebarSlotProps {
  children: ReactNode;
}

// --- Main component props ---

export interface WorldViewerProps {
  /** Theme from the product (Tu Cuento Mágico, Aulas Mágicas) */
  theme: EngineTheme;
  /** World definitions to load */
  worlds: World[];
  /** ID of the initial world to display */
  initialWorldId?: string;
  /** Audio configuration */
  audio: AudioConfig;
  /** Renderer configuration */
  renderer: RendererConfig;
  /** Ordered itinerary (optional, for Aulas Mágicas) */
  itinerary?: Itinerary;
  /** Callbacks for Shell integration */
  callbacks?: EngineCallbacks;
  /** Slot children: WorldViewer.Panel, WorldViewer.Sidebar, etc. */
  children?: ReactNode;
  /** Additional CSS class for the root container */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
}

/**
 * WorldViewer — Componente React principal del SDK.
 *
 * Renderiza el visor 3D y expone slots para que cada producto
 * personalice el panel de información y la sidebar.
 *
 * Uso:
 * ```tsx
 * <WorldViewer theme={myTheme} worlds={worlds} audio={audioConfig} renderer={rendererConfig}>
 *   <WorldViewer.Panel>
 *     {(hotspot) => <MyCustomPanel hotspot={hotspot} />}
 *   </WorldViewer.Panel>
 *   <WorldViewer.Sidebar>
 *     <MySidebar />
 *   </WorldViewer.Sidebar>
 * </WorldViewer>
 * ```
 */
export function WorldViewer({
  theme,
  worlds,
  initialWorldId,
  audio,
  renderer,
  itinerary,
  callbacks,
  children,
  className,
  style,
}: WorldViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize config to avoid re-creating engine on every render
  const config = useMemo(() => ({
    theme,
    worlds,
    initialWorldId,
    audio,
    renderer,
    itinerary,
    callbacks,
  }), [theme, worlds, initialWorldId, audio, renderer, itinerary, callbacks]);

  const { state, engine } = useWorldEngine(containerRef, config);

  const cssVars = useMemo(() => themeToCSS(theme), [theme]);

  const contextValue = useMemo(() => ({
    engine,
    theme,
    loading: state.loading,
    error: state.error,
  }), [engine, theme, state.loading, state.error]);

  return (
    <WorldEngineContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={className}
        style={{
          ...rootStyles,
          ...cssVars,
          ...style,
        }}
        data-testid="world-viewer"
      >
        {/* Slot children are rendered as overlays on top of the 3D canvas */}
        {children}
      </div>
    </WorldEngineContext.Provider>
  );
}

// --- Slot sub-components ---

/**
 * Slot para el panel de información del hotspot activo.
 * Recibe un render prop con el hotspot actualmente seleccionado (o null).
 */
function Panel({ children }: PanelSlotProps) {
  // The actual rendering is handled by HotspotPanel component
  // This is a structural slot — it receives the render prop from the product
  return <>{children(null)}</>;
}

/**
 * Slot para la sidebar de navegación entre mundos.
 */
function Sidebar({ children }: SidebarSlotProps) {
  return <>{children}</>;
}

// Attach sub-components to WorldViewer for dot-notation pattern
WorldViewer.Panel = Panel;
WorldViewer.Sidebar = Sidebar;
