import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { HotspotManager } from '../src/hotspots/HotspotManager.js';
import { EventBus } from '../src/events/EventBus.js';
import type { Hotspot } from '../src/types/Hotspot.js';
import type { EngineTheme } from '../src/types/Theme.js';

const mockTheme: EngineTheme = {
  colors: {
    primary: '#7c3aed',
    secondary: '#f472b6',
    accent: '#fbbf24',
    background: '#1e1040',
    surface: 'rgba(30, 16, 64, 0.9)',
    text: '#f5f0ff',
    textDim: '#a78bfa',
    hotspotInfo: '#3b82f6',
    hotspotPortal: '#f59e0b',
    hotspotQuiz: '#10b981',
  },
  fonts: { display: 'sans-serif', body: 'sans-serif' },
  borderRadius: '12px',
  panelPosition: 'right',
  sidebarPosition: 'left',
  showProgress: true,
  showVRButton: false,
  productName: 'Test',
  autoRotate: false,
  showHelpToast: false,
  controlsStyle: 'full',
};

function createMockHotspot(overrides: Partial<Hotspot> = {}): Hotspot {
  return {
    id: 'h1',
    type: 'info',
    position: { theta: 0.5, phi: 0.1 },
    content: {
      title: 'Test Hotspot',
      text: 'Some description',
    },
    ...overrides,
  };
}

describe('HotspotManager', () => {
  let manager: HotspotManager;
  let eventBus: EventBus;
  let container: HTMLDivElement;

  beforeEach(() => {
    eventBus = new EventBus();
    manager = new HotspotManager(eventBus, mockTheme);
    container = document.createElement('div');
    document.body.appendChild(container);
    manager.init(container);
  });

  describe('setHotspots', () => {
    it('should create DOM elements for each hotspot', () => {
      const hotspots = [
        createMockHotspot({ id: 'h1' }),
        createMockHotspot({ id: 'h2' }),
      ];
      manager.setHotspots(hotspots);

      expect(manager.totalCount).toBe(2);
      const buttons = container.querySelectorAll('button.we-hotspot');
      expect(buttons.length).toBe(2);
    });

    it('should clear previous hotspots when setting new ones', () => {
      manager.setHotspots([createMockHotspot({ id: 'h1' })]);
      manager.setHotspots([createMockHotspot({ id: 'h2' })]);

      expect(manager.totalCount).toBe(1);
      const buttons = container.querySelectorAll('button.we-hotspot');
      expect(buttons.length).toBe(1);
    });

    it('should create accessible hotspot elements', () => {
      manager.setHotspots([createMockHotspot()]);
      const button = container.querySelector('button.we-hotspot');

      expect(button?.getAttribute('role')).toBe('button');
      expect(button?.getAttribute('aria-label')).toContain('Test Hotspot');
      expect(button?.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('sphericalToCartesian', () => {
    it('should convert spherical coordinates to 3D position', () => {
      const pos = manager.sphericalToCartesian({ theta: 0, phi: 0 });
      expect(pos).toBeInstanceOf(THREE.Vector3);
      // At theta=0, phi=0: x≈0, y=0, z=500
      expect(pos.x).toBeCloseTo(0, 1);
      expect(pos.y).toBeCloseTo(0, 1);
      expect(pos.z).toBeCloseTo(500, 0);
    });

    it('should handle theta=PI/2 correctly', () => {
      const pos = manager.sphericalToCartesian({ theta: Math.PI / 2, phi: 0 });
      // At theta=PI/2, phi=0: x≈500, y=0, z≈0
      expect(pos.x).toBeCloseTo(500, 0);
      expect(pos.y).toBeCloseTo(0, 1);
      expect(pos.z).toBeCloseTo(0, 0);
    });
  });

  describe('projectToScreen', () => {
    it('should project 3D position to 2D screen coordinates', () => {
      const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1100);
      camera.position.set(0, 0, 0);
      camera.lookAt(0, 0, 500);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);

      const pos3D = new THREE.Vector3(0, 0, 400);
      const screen = manager.projectToScreen(pos3D, camera, 1920, 1080);

      expect(screen.visible).toBe(true);
      // Should be roughly center of screen
      expect(screen.x).toBeCloseTo(960, -1);
      expect(screen.y).toBeCloseTo(540, -1);
    });

    it('should mark positions behind camera as not visible', () => {
      const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1100);
      camera.position.set(0, 0, 0);
      camera.lookAt(0, 0, 1);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);

      const pos3D = new THREE.Vector3(0, 0, -400); // Behind camera
      const screen = manager.projectToScreen(pos3D, camera, 1920, 1080);

      expect(screen.visible).toBe(false);
    });
  });

  describe('markVisited', () => {
    it('should track visited hotspots', () => {
      manager.setHotspots([createMockHotspot({ id: 'h1' })]);
      manager.markVisited('h1', 'world-1');

      expect(manager.isVisited('h1')).toBe(true);
      expect(manager.visitedCount).toBe(1);
    });

    it('should emit hotspot:visited event', () => {
      const listener = vi.fn();
      eventBus.on('hotspot:visited', listener);

      manager.setHotspots([createMockHotspot({ id: 'h1' })]);
      manager.markVisited('h1', 'world-1');

      expect(listener).toHaveBeenCalledWith('h1', 'world-1');
    });

    it('should emit progress:updated event', () => {
      const listener = vi.fn();
      eventBus.on('progress:updated', listener);

      manager.setHotspots([
        createMockHotspot({ id: 'h1' }),
        createMockHotspot({ id: 'h2' }),
      ]);
      manager.markVisited('h1', 'world-1');

      expect(listener).toHaveBeenCalledWith(1, 2);
    });

    it('should not double-count visits', () => {
      manager.setHotspots([createMockHotspot({ id: 'h1' })]);
      manager.markVisited('h1', 'world-1');
      manager.markVisited('h1', 'world-1');

      expect(manager.visitedCount).toBe(1);
    });
  });

  describe('setActive', () => {
    it('should track active hotspot', () => {
      manager.setHotspots([createMockHotspot({ id: 'h1' })]);
      manager.setActive('h1');

      expect(manager.activeId).toBe('h1');
    });

    it('should deactivate previous active hotspot', () => {
      manager.setHotspots([
        createMockHotspot({ id: 'h1' }),
        createMockHotspot({ id: 'h2' }),
      ]);
      manager.setActive('h1');
      manager.setActive('h2');

      expect(manager.activeId).toBe('h2');
    });

    it('should allow null to deactivate all', () => {
      manager.setHotspots([createMockHotspot({ id: 'h1' })]);
      manager.setActive('h1');
      manager.setActive(null);

      expect(manager.activeId).toBeNull();
    });
  });

  describe('hotspot click handling', () => {
    it('should emit hotspot:clicked on click', () => {
      const listener = vi.fn();
      eventBus.on('hotspot:clicked', listener);

      const hotspot = createMockHotspot({ id: 'h1' });
      manager.setHotspots([hotspot]);

      const button = container.querySelector('button.we-hotspot');
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(listener).toHaveBeenCalledWith(hotspot);
    });

    it('should emit hotspot:clicked on keyboard Enter', () => {
      const listener = vi.fn();
      eventBus.on('hotspot:clicked', listener);

      manager.setHotspots([createMockHotspot({ id: 'h1' })]);

      const button = container.querySelector('button.we-hotspot');
      button?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('getHotspot', () => {
    it('should return hotspot by ID', () => {
      const hotspot = createMockHotspot({ id: 'h1' });
      manager.setHotspots([hotspot]);

      expect(manager.getHotspot('h1')).toEqual(hotspot);
    });

    it('should return undefined for non-existent ID', () => {
      expect(manager.getHotspot('nonexistent')).toBeUndefined();
    });
  });

  describe('resetVisited', () => {
    it('should clear all visited state', () => {
      manager.setHotspots([createMockHotspot({ id: 'h1' })]);
      manager.markVisited('h1', 'world-1');
      manager.resetVisited();

      expect(manager.visitedCount).toBe(0);
      expect(manager.isVisited('h1')).toBe(false);
    });
  });

  describe('dispose', () => {
    it('should clean up all DOM elements', () => {
      manager.setHotspots([createMockHotspot()]);
      manager.dispose();

      const buttons = container.querySelectorAll('button.we-hotspot');
      expect(buttons.length).toBe(0);
    });
  });
});
