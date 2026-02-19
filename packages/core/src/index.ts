// Main class
export { WorldEngine } from './engine.js';

// Modules (for advanced usage / custom shells)
export { EventBus } from './events/EventBus.js';
export { PanoRenderer } from './renderer/PanoRenderer.js';
export { RendererFactory } from './renderer/RendererFactory.js';
export { HotspotManager } from './hotspots/HotspotManager.js';
export { injectHotspotStyles } from './hotspots/HotspotStyles.js';
export { OrbitControls } from './controls/OrbitControls.js';
export { AudioManager } from './audio/AudioManager.js';
export { WorldLoader } from './loader/WorldLoader.js';
export { AssetCache } from './loader/AssetCache.js';
export { Navigator } from './navigation/Navigator.js';

// Utilities
export { sanitizeColor, sanitizeAssetUrl, escapeAttr } from './utils/sanitize.js';

// Types (re-export all)
export type {
  SphericalPosition,
  HotspotType,
  HotspotSize,
  TransitionEffect,
  HotspotContent,
  HotspotPortal,
  HotspotQuiz,
  HotspotAppearance,
  Hotspot,
  AssetType,
  AssetFormat,
  WorldAsset,
  WorldMetadata,
  LinkedWorld,
  WorldCamera,
  World,
  ThemeColors,
  ThemeFonts,
  ThemeLabels,
  PanelPosition,
  SidebarPosition,
  ControlsStyle,
  EngineTheme,
  TTSProvider,
  AudioConfig,
  RendererConfig,
  Itinerary,
  EngineCallbacks,
  EngineConfig,
  EngineEventMap,
  EngineEvent,
} from './types/index.js';
