import type { ReactNode } from 'react';
import type { EngineTheme, WorldEngine } from '@world-engine/core';
import { WorldEngineContext, type WorldEngineContextValue } from '../src/context.js';

/**
 * Mock theme matching the Aulas Mágicas spec for testing.
 */
export const mockTheme: EngineTheme = {
  colors: {
    primary: '#38bdf8',
    secondary: '#818cf8',
    accent: '#f59e0b',
    background: '#0a0e17',
    surface: 'rgba(12, 18, 32, 0.92)',
    text: '#e2e8f0',
    textDim: '#94a3b8',
    hotspotInfo: '#38bdf8',
    hotspotPortal: '#f59e0b',
    hotspotQuiz: '#34d399',
  },
  fonts: {
    display: 'Georgia, serif',
    body: 'system-ui, sans-serif',
  },
  borderRadius: '14px',
  panelPosition: 'right',
  sidebarPosition: 'left',
  showProgress: true,
  showVRButton: true,
  logo: '/logos/test-logo.svg',
  productName: 'Test Product',
  autoRotate: true,
  showHelpToast: false,
  controlsStyle: 'full',
};

/**
 * Creates a mock engine for testing React components without real WebGL.
 */
export function createMockEngine(overrides: Partial<MockEngine> = {}): WorldEngine {
  return {
    activeWorld: null,
    activeWorldId: null,
    activeHotspotId: null,
    visitedCount: 0,
    totalHotspots: 0,
    canGoNext: false,
    canGoPrevious: false,
    itineraryIndex: -1,
    itineraryTotal: 0,
    worlds: [],
    on: () => () => {},
    once: () => () => {},
    off: () => {},
    goToWorld: async () => {},
    nextWorld: async () => false,
    previousWorld: async () => false,
    goBack: async () => false,
    playHotspotAudio: async () => {},
    stopAudio: () => {},
    setMuted: () => {},
    setVolume: () => {},
    setAutoRotate: () => {},
    getHotspot: () => undefined,
    deselectHotspot: () => {},
    submitQuizAnswer: () => {},
    dispose: () => {},
    init: async () => {},
    ...overrides,
  } as unknown as WorldEngine;
}

type MockEngine = ReturnType<typeof createMockEngine>;

/**
 * Wrapper that provides WorldEngine context for testing.
 */
export function createTestWrapper(
  overrides?: Partial<WorldEngineContextValue>
) {
  const contextValue: WorldEngineContextValue = {
    engine: createMockEngine(),
    theme: mockTheme,
    loading: false,
    error: null,
    ...overrides,
  };

  return function TestWrapper({ children }: { children: ReactNode }) {
    return (
      <WorldEngineContext.Provider value={contextValue}>
        {children}
      </WorldEngineContext.Provider>
    );
  };
}
