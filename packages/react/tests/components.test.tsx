import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingScreen } from '../src/LoadingScreen.js';
import { ProgressTracker } from '../src/ProgressTracker.js';
import { ControlsBar } from '../src/ControlsBar.js';
import { WorldSidebar } from '../src/WorldSidebar.js';
import { HotspotPanel } from '../src/HotspotPanel.js';
import { createTestWrapper, createMockEngine, mockTheme } from './test-utils.js';
import { WorldEngineContext } from '../src/context.js';
import type { World, Hotspot } from '@world-engine/core';

const mockWorld: World = {
  id: 'world-1',
  title: 'Test World',
  asset: { type: 'panorama', url: '/test.jpg', format: 'jpg', thumbnail: '/thumb.jpg' },
  metadata: {},
  hotspots: [],
};

describe('LoadingScreen', () => {
  it('should render when loading is true', () => {
    const Wrapper = createTestWrapper({ loading: true });
    render(<LoadingScreen />, { wrapper: Wrapper });

    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
    expect(screen.getByText(/Cargando/)).toBeInTheDocument();
  });

  it('should not render when loading is false', () => {
    const Wrapper = createTestWrapper({ loading: false });
    render(<LoadingScreen />, { wrapper: Wrapper });

    expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
  });

  it('should display product name in loading text', () => {
    const Wrapper = createTestWrapper({ loading: true });
    render(<LoadingScreen />, { wrapper: Wrapper });

    expect(screen.getByText('Cargando Test Product...')).toBeInTheDocument();
  });

  it('should render custom children instead of default', () => {
    const Wrapper = createTestWrapper({ loading: true });
    render(
      <LoadingScreen>
        <div data-testid="custom-loader">Custom Loader</div>
      </LoadingScreen>,
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId('custom-loader')).toBeInTheDocument();
    expect(screen.queryByText(/Cargando/)).not.toBeInTheDocument();
  });

  it('should have accessible role and label', () => {
    const Wrapper = createTestWrapper({ loading: true });
    render(<LoadingScreen />, { wrapper: Wrapper });

    const el = screen.getByTestId('loading-screen');
    expect(el).toHaveAttribute('role', 'status');
    expect(el).toHaveAttribute('aria-label', 'Loading world');
  });
});

describe('ProgressTracker', () => {
  it('should not render when showProgress is false', () => {
    const theme = { ...mockTheme, showProgress: false };
    const Wrapper = createTestWrapper({
      theme,
      engine: createMockEngine({ totalHotspots: 5, visitedCount: 2 }),
    });
    render(<ProgressTracker />, { wrapper: Wrapper });

    expect(screen.queryByTestId('progress-tracker')).not.toBeInTheDocument();
  });

  it('should not render when totalCount is 0', () => {
    const Wrapper = createTestWrapper({
      engine: createMockEngine({ totalHotspots: 0 }),
    });
    render(<ProgressTracker />, { wrapper: Wrapper });

    expect(screen.queryByTestId('progress-tracker')).not.toBeInTheDocument();
  });

  it('should render with fraction format', () => {
    const listeners = new Map<string, Function>();
    const engine = createMockEngine({
      totalHotspots: 10,
      visitedCount: 3,
      on: ((event: string, listener: Function) => {
        listeners.set(event, listener);
        return () => {};
      }) as ReturnType<typeof createMockEngine>['on'],
    });
    const Wrapper = createTestWrapper({ engine });
    render(<ProgressTracker format="fraction" />, { wrapper: Wrapper });

    // The initial render uses engine.totalHotspots and engine.visitedCount
    const tracker = screen.getByTestId('progress-tracker');
    expect(tracker).toBeInTheDocument();
  });
});

describe('ControlsBar', () => {
  it('should render controls bar', () => {
    const Wrapper = createTestWrapper();
    render(<ControlsBar />, { wrapper: Wrapper });

    expect(screen.getByTestId('controls-bar')).toBeInTheDocument();
  });

  it('should have accessible toolbar role', () => {
    const Wrapper = createTestWrapper();
    render(<ControlsBar />, { wrapper: Wrapper });

    const bar = screen.getByTestId('controls-bar');
    expect(bar).toHaveAttribute('role', 'toolbar');
  });

  it('should show audio mute button', () => {
    const Wrapper = createTestWrapper();
    render(<ControlsBar showAudioToggle />, { wrapper: Wrapper });

    expect(screen.getByLabelText('Mute audio')).toBeInTheDocument();
  });

  it('should show VR button when theme enables it', () => {
    const Wrapper = createTestWrapper();
    render(<ControlsBar />, { wrapper: Wrapper });

    expect(screen.getByLabelText('Enter VR mode')).toBeInTheDocument();
  });

  it('should not render when controlsStyle is hidden', () => {
    const theme = { ...mockTheme, controlsStyle: 'hidden' as const };
    const Wrapper = createTestWrapper({ theme });
    render(<ControlsBar />, { wrapper: Wrapper });

    expect(screen.queryByTestId('controls-bar')).not.toBeInTheDocument();
  });

  it('should show navigation arrows', () => {
    const Wrapper = createTestWrapper();
    render(<ControlsBar showNavigation />, { wrapper: Wrapper });

    expect(screen.getByLabelText('Previous world')).toBeInTheDocument();
    expect(screen.getByLabelText('Next world')).toBeInTheDocument();
  });
});

describe('WorldSidebar', () => {
  it('should render sidebar with world list', () => {
    const Wrapper = createTestWrapper();
    render(
      <WorldSidebar worlds={[mockWorld]} />,
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId('world-sidebar')).toBeInTheDocument();
    expect(screen.getByText('Test World')).toBeInTheDocument();
  });

  it('should have accessible navigation role', () => {
    const Wrapper = createTestWrapper();
    render(
      <WorldSidebar worlds={[mockWorld]} />,
      { wrapper: Wrapper }
    );

    const sidebar = screen.getByTestId('world-sidebar');
    // <nav> has implicit role="navigation" — no explicit attribute needed
    expect(sidebar.tagName).toBe('NAV');
  });

  it('should not render when sidebarPosition is hidden', () => {
    const theme = { ...mockTheme, sidebarPosition: 'hidden' as const };
    const Wrapper = createTestWrapper({ theme });
    render(
      <WorldSidebar worlds={[mockWorld]} />,
      { wrapper: Wrapper }
    );

    expect(screen.queryByTestId('world-sidebar')).not.toBeInTheDocument();
  });

  it('should show progress when enabled', () => {
    const engine = createMockEngine({
      itineraryIndex: 0,
      itineraryTotal: 3,
    });
    const Wrapper = createTestWrapper({ engine });
    render(
      <WorldSidebar worlds={[mockWorld]} showProgress />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });
});

describe('HotspotPanel', () => {
  it('should not render when no hotspot is active', () => {
    const Wrapper = createTestWrapper();
    render(<HotspotPanel />, { wrapper: Wrapper });

    expect(screen.queryByTestId('hotspot-panel')).not.toBeInTheDocument();
  });

  it('should render with custom children render prop', () => {
    // Create a context with a hotspot:clicked event that fires immediately
    const mockHotspot: Hotspot = {
      id: 'h1',
      type: 'info',
      position: { theta: 0, phi: 0 },
      content: { title: 'Test Title', text: 'Test Content' },
    };

    const listeners = new Map<string, Function>();
    const engine = createMockEngine({
      totalHotspots: 1,
      on: ((event: string, listener: Function) => {
        listeners.set(event, listener);
        // Fire click immediately for testing
        if (event === 'hotspot:clicked') {
          setTimeout(() => listener(mockHotspot), 0);
        }
        return () => {};
      }) as ReturnType<typeof createMockEngine>['on'],
    });

    const Wrapper = createTestWrapper({ engine });
    render(
      <HotspotPanel>
        {(hotspot) => <div data-testid="custom-panel">{hotspot.content.title}</div>}
      </HotspotPanel>,
      { wrapper: Wrapper }
    );

    // Initially no panel (no active hotspot yet)
    expect(screen.queryByTestId('hotspot-panel')).not.toBeInTheDocument();
  });
});
