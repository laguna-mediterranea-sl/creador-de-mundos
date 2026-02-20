import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CoReadingSession } from '../CoReadingSession.js';
import { SyncBridge } from '../SyncBridge.js';
import type {
  CoReadingConfig,
  CoReadingState,
  SyncEvent,
  ConnectionState,
} from '../types.js';
import type { EventBus } from '@world-engine/core';

/** Acciones disponibles en el contexto co-reading */
export interface CoReadingActions {
  /** Conectar a la sesión */
  connect: () => Promise<void>;
  /** Desconectar de la sesión */
  disconnect: () => Promise<void>;
  /** Enviar cambio de página (solo narrador) */
  changePage: (page: number) => Promise<void>;
  /** Enviar toque de hotspot */
  tapHotspot: (x: number, y: number, hotspotId?: string) => Promise<void>;
  /** Enviar emoji de reacción */
  sendEmoji: (emoji: string) => Promise<void>;
  /** Marcar cuento como completado */
  completeStory: () => Promise<void>;
  /** Toggle micrófono */
  toggleMic: () => Promise<boolean>;
}

export interface CoReadingContextValue {
  state: CoReadingState;
  actions: CoReadingActions;
}

const CoReadingContext = createContext<CoReadingContextValue | null>(null);

export interface CoReadingProviderProps {
  /** Configuración de la sesión */
  config: CoReadingConfig;
  /** EventBus del WorldEngine (para sincronizar eventos 3D) */
  eventBus?: EventBus;
  children: ReactNode;
}

const INITIAL_STATE: CoReadingState = {
  connectionState: 'disconnected',
  role: 'listener',
  participantCount: 0,
  currentPage: 0,
  isMicEnabled: false,
  isRemoteAudioActive: false,
  lastEmoji: null,
  storyId: null,
};

/**
 * CoReadingProvider — Context provider para sesiones de lectura compartida.
 *
 * Envuelve la aplicación (o la vista del cuento) y proporciona:
 * - Estado de la sesión en tiempo real
 * - Acciones para controlar la sesión
 * - Sincronización automática de eventos con el EventBus del WorldEngine
 */
export function CoReadingProvider({ config, eventBus, children }: CoReadingProviderProps) {
  const [state, setState] = useState<CoReadingState>({
    ...INITIAL_STATE,
    role: config.role,
    storyId: config.storyId,
  });

  const sessionRef = useRef<CoReadingSession | null>(null);
  const bridgeRef = useRef<SyncBridge | null>(null);
  const emojiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Crear sesión y bridge al montar
  useEffect(() => {
    const session = new CoReadingSession({
      ...config,
      onRemoteEvent: (event: SyncEvent) => {
        handleRemoteEvent(event);
        // Reinyectar en EventBus si disponible
        if (bridgeRef.current) {
          bridgeRef.current.handleRemoteEvent(event);
        }
      },
      onConnectionChange: (connectionState: ConnectionState) => {
        setState(s => ({ ...s, connectionState }));
      },
      onParticipantChange: (participantCount: number) => {
        setState(s => ({
          ...s,
          participantCount,
          isRemoteAudioActive: participantCount > 1,
        }));
      },
    });

    sessionRef.current = session;

    // Si hay EventBus, crear el puente de sincronización
    if (eventBus) {
      bridgeRef.current = new SyncBridge(session, eventBus, config.role);
    }

    return () => {
      bridgeRef.current?.stop();
      session.dispose();
      if (emojiTimeoutRef.current) {
        clearTimeout(emojiTimeoutRef.current);
      }
    };
  }, [config.livekitUrl, config.token, config.storyId, config.role]);

  const handleRemoteEvent = useCallback((event: SyncEvent) => {
    switch (event.type) {
      case 'page_change':
        setState(s => ({
          ...s,
          currentPage: (event.payload['page'] as number) ?? s.currentPage,
        }));
        break;

      case 'emoji_reaction':
        setState(s => ({ ...s, lastEmoji: event.payload['emoji'] as string }));
        // Limpiar emoji después de 3 segundos
        if (emojiTimeoutRef.current) clearTimeout(emojiTimeoutRef.current);
        emojiTimeoutRef.current = setTimeout(() => {
          setState(s => ({ ...s, lastEmoji: null }));
        }, 3000);
        break;

      case 'story_complete':
        // La app puede reaccionar al evento via state o EventBus
        break;
    }
  }, []);

  // --- Actions ---

  const connect = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;

    await session.connect();
    bridgeRef.current?.start();

    setState(s => ({
      ...s,
      connectionState: 'connected',
      isMicEnabled: session.isMicEnabled,
    }));
  }, []);

  const disconnect = useCallback(async () => {
    bridgeRef.current?.stop();
    await sessionRef.current?.disconnect();
    setState(s => ({
      ...s,
      connectionState: 'disconnected',
      participantCount: 0,
      isRemoteAudioActive: false,
    }));
  }, []);

  const changePage = useCallback(async (page: number) => {
    setState(s => ({ ...s, currentPage: page }));
    await sessionRef.current?.sendEvent({
      type: 'page_change',
      payload: { page },
    });
  }, []);

  const tapHotspot = useCallback(async (x: number, y: number, hotspotId?: string) => {
    await sessionRef.current?.sendEvent({
      type: 'hotspot_tap',
      payload: { x, y, hotspotId },
    });
  }, []);

  const sendEmoji = useCallback(async (emoji: string) => {
    await sessionRef.current?.sendEvent({
      type: 'emoji_reaction',
      payload: { emoji },
    });
  }, []);

  const completeStory = useCallback(async () => {
    await sessionRef.current?.sendEvent({
      type: 'story_complete',
      payload: {},
    });
  }, []);

  const toggleMic = useCallback(async () => {
    const newState = await sessionRef.current?.toggleMic() ?? false;
    setState(s => ({ ...s, isMicEnabled: newState }));
    return newState;
  }, []);

  const contextValue: CoReadingContextValue = {
    state,
    actions: {
      connect,
      disconnect,
      changePage,
      tapHotspot,
      sendEmoji,
      completeStory,
      toggleMic,
    },
  };

  return (
    <CoReadingContext.Provider value={contextValue}>
      {children}
    </CoReadingContext.Provider>
  );
}

/**
 * Hook para acceder al contexto co-reading.
 * Debe usarse dentro de un CoReadingProvider.
 */
export function useCoReading(): CoReadingContextValue {
  const ctx = useContext(CoReadingContext);
  if (!ctx) {
    throw new Error('useCoReading must be used within a <CoReadingProvider>');
  }
  return ctx;
}
