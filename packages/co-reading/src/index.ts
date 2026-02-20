// Core classes
export { CoReadingSession } from './CoReadingSession.js';
export { SyncBridge } from './SyncBridge.js';
export { InviteManager } from './InviteManager.js';

// Types
export type {
  SessionRole,
  ConnectionState,
  SyncEventType,
  SyncEvent,
  CoReadingConfig,
  InviteData,
  JoinResult,
  CoReadingState,
} from './types.js';
export { REACTION_EMOJIS } from './types.js';

// React components & hooks
export { CoReadingProvider, useCoReading } from './react/CoReadingProvider.js';
export type { CoReadingActions, CoReadingContextValue, CoReadingProviderProps } from './react/CoReadingProvider.js';

export { NarratorControls } from './react/NarratorControls.js';
export type { NarratorControlsProps } from './react/NarratorControls.js';

export { ListenerOverlay } from './react/ListenerOverlay.js';
export type { ListenerOverlayProps } from './react/ListenerOverlay.js';

export { JoinScreen } from './react/JoinScreen.js';
export type { JoinScreenProps } from './react/JoinScreen.js';

export { useRemoteInteractions } from './react/useRemoteInteractions.js';
export type { RemoteInteraction } from './react/useRemoteInteractions.js';
