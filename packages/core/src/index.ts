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

// Story personalization
export { StoryPersonalization } from './story/StoryPersonalization.js';
export type {
  ChildProfile,
  StoryTemplate,
  StoryPage,
  PersonalizedStory,
} from './story/StoryPersonalization.js';
export { StoryTemplateRegistry } from './story/StoryTemplateRegistry.js';

// World building & editor tools
export { WorldBuilder } from './editor/WorldBuilder.js';
export { HotspotTemplateRegistry, DEFAULT_TEMPLATES } from './editor/HotspotTemplates.js';
export type { HotspotTemplate, TemplatePosition } from './editor/HotspotTemplates.js';
export { SceneGenerator } from './editor/SceneGenerator.js';
export type {
  GenerationConfig,
  GenerateSceneRequest,
  GenerateSceneResult,
} from './editor/SceneGenerator.js';

// API services
export { ApiClient } from './api/ApiClient.js';
export type { ApiClientConfig, ApiError, RequestOptions } from './api/ApiClient.js';
export { StoryService } from './api/StoryService.js';
export { WorldService } from './api/WorldService.js';
export { CoReadingService } from './api/CoReadingService.js';
export type { CoReadingInviteData, CoReadingJoinResult } from './api/CoReadingService.js';
export { ConnectionManager } from './api/ConnectionManager.js';
export type { ConnectionManagerConfig, ConnectionStatus } from './api/ConnectionManager.js';
export { ConcurrencyManager, TaskPool, Semaphore, debounce, throttle } from './api/ConcurrencyManager.js';
export type { TaskPriority } from './api/ConcurrencyManager.js';

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
