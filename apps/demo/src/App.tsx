import { useState, useEffect, useMemo } from 'react';
import {
  WorldViewer,
  LoadingScreen,
  ControlsBar,
  WorldSidebar,
  HotspotPanel,
  ProgressTracker,
  injectReactStyles,
} from '@world-engine/react';
import type { AudioConfig, RendererConfig } from '@world-engine/core';
import { generateTestPanorama } from './panorama.js';
import { createTestWorlds, aulasMagicasTheme } from './worlds.js';
import type { World } from '@world-engine/core';

// Inject CSS keyframes (spinner animation)
injectReactStyles();

const audioConfig: AudioConfig = {
  ttsProvider: 'webspeech',
  ttsLang: 'es-ES',
};

const rendererConfig: RendererConfig = {
  preferSplats: false,
  fallbackToPano: true,
  maxPixelRatio: 2,
  antialias: true,
};

export function App() {
  const [worlds, setWorlds] = useState<World[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Generate procedural test panoramas
        const [pano1, pano2] = await Promise.all([
          generateTestPanorama(2048, 1024, '#1a1a3e', '#4a3080', '#1a2a1a'),
          generateTestPanorama(2048, 1024, '#2a1a0a', '#8a4020', '#0a1a2a'),
        ]);

        if (cancelled) return;
        setWorlds(createTestWorlds(pano1, pano2));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const callbacks = useMemo(() => ({
    onWorldChange: (worldId: string) => {
      console.log('[Demo] World changed:', worldId);
    },
    onHotspotVisit: (hotspotId: string, worldId: string) => {
      console.log('[Demo] Hotspot visited:', hotspotId, 'in', worldId);
    },
    onQuizAnswer: (hotspotId: string, correct: boolean) => {
      console.log('[Demo] Quiz answered:', hotspotId, correct ? 'CORRECT' : 'WRONG');
    },
    onProgress: (visited: number, total: number) => {
      console.log(`[Demo] Progress: ${visited}/${total}`);
    },
    onError: (err: Error) => {
      console.error('[Demo] Engine error:', err);
    },
  }), []);

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: '#ef4444',
        fontFamily: 'monospace',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <div>
          <h1>Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!worlds) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: '#94a3b8',
        fontFamily: 'system-ui',
      }}>
        Generando panoramas de prueba...
      </div>
    );
  }

  return (
    <WorldViewer
      theme={aulasMagicasTheme}
      worlds={worlds}
      initialWorldId="mundo-bosque"
      audio={audioConfig}
      renderer={rendererConfig}
      itinerary={{
        title: 'Demo Itinerario',
        worldOrder: ['mundo-bosque', 'mundo-cueva'],
        enforceOrder: false,
      }}
      callbacks={callbacks}
      style={{ width: '100vw', height: '100vh' }}
    >
      <LoadingScreen />
      <HotspotPanel />
      <WorldSidebar worlds={worlds} showProgress />
      <ControlsBar showNavigation showAudioToggle />
      <ProgressTracker format="fraction" position="top-right" />
      <HelpToast />
    </WorldViewer>
  );
}

/**
 * Simple toast de ayuda que aparece al inicio.
 */
function HelpToast() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 100,
      background: 'rgba(12, 18, 32, 0.95)',
      border: '1px solid rgba(56, 189, 248, 0.3)',
      borderRadius: '12px',
      padding: '12px 20px',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '0.85rem',
      color: '#94a3b8',
      maxWidth: '400px',
      textAlign: 'center',
      pointerEvents: 'auto',
    }}>
      <strong style={{ color: '#38bdf8' }}>WorldEngine Demo</strong>
      <br />
      Arrastra para mirar alrededor. Haz clic en los hotspots para interactuar.
      <button
        onClick={() => setVisible(false)}
        style={{
          marginLeft: '12px',
          background: 'none',
          border: 'none',
          color: '#64748b',
          cursor: 'pointer',
          fontSize: '1rem',
        }}
      >
        {'\u00D7'}
      </button>
    </div>
  );
}
