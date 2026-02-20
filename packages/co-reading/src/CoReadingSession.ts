import {
  Room,
  RoomEvent,
  Track,
  ConnectionState as LKConnectionState,
  DisconnectReason,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from 'livekit-client';
import type {
  CoReadingConfig,
  SyncEvent,
  ConnectionState,
  SessionRole,
} from './types.js';

/**
 * CoReadingSession — Gestión de la sala LiveKit para lectura compartida.
 *
 * Responsabilidades:
 * - Conectar/desconectar de la sala LiveKit
 * - Publicar/recibir audio (bidireccional)
 * - Enviar/recibir eventos sincronizados (data channels)
 * - Gestionar estado de conexión y reconexión
 *
 * Phase 1: Solo audio en vivo + sync de eventos. Sin grabación.
 */
export class CoReadingSession {
  private room: Room;
  private config: CoReadingConfig;
  private audioElements: HTMLAudioElement[] = [];
  private disposed = false;

  constructor(config: CoReadingConfig) {
    this.config = config;
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      disconnectOnPageLeave: true,
    });

    this.wireRoomEvents();
  }

  /** Rol del participante local */
  get role(): SessionRole {
    return this.config.role;
  }

  /** Estado actual de la conexión */
  get connectionState(): ConnectionState {
    return this.mapConnectionState(this.room.state);
  }

  /** Si está conectado */
  get isConnected(): boolean {
    return this.room.state === LKConnectionState.Connected;
  }

  /** Número de participantes (incluyendo local) */
  get participantCount(): number {
    return this.room.numParticipants + 1;
  }

  /** Si el micrófono está habilitado */
  get isMicEnabled(): boolean {
    return this.room.localParticipant?.isMicrophoneEnabled ?? false;
  }

  /**
   * Conecta a la sala LiveKit y habilita audio bidireccional.
   * Ambos participantes (narrador y oyente) publican micrófono.
   */
  async connect(): Promise<void> {
    if (this.disposed) throw new Error('Session disposed');

    this.config.onConnectionChange?.('connecting');

    await this.room.connect(this.config.livekitUrl, this.config.token, {
      autoSubscribe: true,
    });

    // Ambos publican audio — bidireccional como una llamada
    await this.room.localParticipant.setMicrophoneEnabled(true);

    this.config.onConnectionChange?.('connected');
    this.config.onParticipantChange?.(this.participantCount);
  }

  /**
   * Envía un evento sincronizado al otro dispositivo.
   * Usa data channels con entrega fiable (TCP-like).
   */
  async sendEvent(event: Omit<SyncEvent, 'sender' | 'timestamp'>): Promise<void> {
    if (!this.isConnected) return;

    const fullEvent: SyncEvent = {
      ...event,
      sender: this.config.role,
      timestamp: Date.now(),
    };

    const data = new TextEncoder().encode(JSON.stringify(fullEvent));
    await this.room.localParticipant.publishData(data, { reliable: true });
  }

  /**
   * Silenciar/activar micrófono local.
   */
  async setMicEnabled(enabled: boolean): Promise<void> {
    await this.room.localParticipant.setMicrophoneEnabled(enabled);
  }

  /**
   * Toggle mute del micrófono.
   * @returns nuevo estado del micrófono
   */
  async toggleMic(): Promise<boolean> {
    const newState = !this.isMicEnabled;
    await this.setMicEnabled(newState);
    return newState;
  }

  /**
   * Desconectar limpiamente de la sala.
   */
  async disconnect(): Promise<void> {
    this.cleanupAudioElements();
    await this.room.disconnect();
    this.config.onConnectionChange?.('disconnected');
  }

  /**
   * Liberar todos los recursos.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cleanupAudioElements();
    this.room.disconnect().catch(() => {});
  }

  // --- Private ---

  private wireRoomEvents(): void {
    // Recibir datos sincronizados del otro dispositivo
    this.room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
      try {
        const event: SyncEvent = JSON.parse(new TextDecoder().decode(payload));
        this.config.onRemoteEvent?.(event);
      } catch {
        console.warn('[CoReading] Failed to parse received data');
      }
    });

    // Audio remoto: adjuntar al DOM cuando se suscribe
    this.room.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrackPublication['track'], _pub: RemoteTrackPublication, _participant: RemoteParticipant) => {
        if (track && track.kind === Track.Kind.Audio) {
          const audioEl = track.attach();
          audioEl.setAttribute('data-co-reading', 'remote-audio');
          document.body.appendChild(audioEl);
          this.audioElements.push(audioEl);
        }
      }
    );

    // Limpiar audio cuando se desuscribe
    this.room.on(
      RoomEvent.TrackUnsubscribed,
      (track: RemoteTrackPublication['track']) => {
        if (track) {
          const elements = track.detach();
          for (const el of elements) {
            el.remove();
            const idx = this.audioElements.indexOf(el as HTMLAudioElement);
            if (idx !== -1) this.audioElements.splice(idx, 1);
          }
        }
      }
    );

    // Cambios de conexión
    this.room.on(RoomEvent.Connected, () => {
      this.config.onConnectionChange?.('connected');
    });

    this.room.on(RoomEvent.Reconnecting, () => {
      this.config.onConnectionChange?.('reconnecting');
    });

    this.room.on(RoomEvent.Reconnected, () => {
      this.config.onConnectionChange?.('connected');
    });

    this.room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
      this.cleanupAudioElements();
      if (reason === DisconnectReason.PARTICIPANT_REMOVED) {
        this.config.onConnectionChange?.('failed');
      } else {
        this.config.onConnectionChange?.('disconnected');
      }
    });

    // Participantes
    this.room.on(RoomEvent.ParticipantConnected, () => {
      this.config.onParticipantChange?.(this.participantCount);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, () => {
      this.config.onParticipantChange?.(this.participantCount);
    });
  }

  private cleanupAudioElements(): void {
    for (const el of this.audioElements) {
      el.pause();
      el.remove();
    }
    this.audioElements = [];
  }

  private mapConnectionState(lkState: LKConnectionState): ConnectionState {
    switch (lkState) {
      case LKConnectionState.Connected: return 'connected';
      case LKConnectionState.Connecting: return 'connecting';
      case LKConnectionState.Reconnecting: return 'reconnecting';
      case LKConnectionState.Disconnected: return 'disconnected';
      default: return 'disconnected';
    }
  }
}
