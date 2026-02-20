/**
 * Tipos del sistema co-reading (Juntos).
 * Phase 1: Lectura compartida en vivo (sin grabación).
 */

/** Rol del participante en la sesión */
export type SessionRole = 'narrator' | 'listener';

/** Estado de conexión de la sesión */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

/** Tipos de eventos sincronizados entre dispositivos */
export type SyncEventType =
  | 'page_change'
  | 'hotspot_tap'
  | 'emoji_reaction'
  | 'story_complete';

/** Evento sincronizado entre narrador y oyente */
export interface SyncEvent {
  type: SyncEventType;
  payload: Record<string, unknown>;
  sender: SessionRole;
  timestamp: number;
}

/** Configuración de la sesión co-reading */
export interface CoReadingConfig {
  /** URL del servidor LiveKit (wss://...) */
  livekitUrl: string;
  /** JWT generado por el backend para autenticar con LiveKit */
  token: string;
  /** ID del cuento que se va a leer */
  storyId: string;
  /** Rol del participante */
  role: SessionRole;
  /** Callback cuando se recibe un evento del otro dispositivo */
  onRemoteEvent?: (event: SyncEvent) => void;
  /** Callback cuando cambia el estado de conexión */
  onConnectionChange?: (state: ConnectionState) => void;
  /** Callback cuando el otro participante se une/sale */
  onParticipantChange?: (count: number) => void;
}

/** Datos de invitación para unirse a una sesión */
export interface InviteData {
  /** Código de 6 caracteres legible (ej: "ABC-123") */
  roomCode: string;
  /** Deep link para unirse directamente */
  deepLink: string;
  /** Timestamp de expiración (5 min) */
  expiresAt: number;
  /** ID del cuento */
  storyId: string;
  /** Título del cuento (para mostrar en la invitación) */
  storyTitle: string;
  /** Token LiveKit para el narrador */
  token: string;
  /** URL del servidor LiveKit */
  livekitUrl: string;
}

/** Resultado de unirse a una sesión con código */
export interface JoinResult {
  success: boolean;
  /** Token LiveKit para el listener */
  token?: string;
  /** URL del servidor LiveKit */
  livekitUrl?: string;
  /** ID del cuento */
  storyId?: string;
  /** Error si no se pudo unir */
  error?: 'expired' | 'full' | 'not_found' | 'server_error';
}

/** Estado completo de la sesión co-reading */
export interface CoReadingState {
  /** Estado de conexión actual */
  connectionState: ConnectionState;
  /** Rol del participante local */
  role: SessionRole;
  /** Número de participantes en la sala */
  participantCount: number;
  /** Página actual del cuento */
  currentPage: number;
  /** Si el micrófono está activo */
  isMicEnabled: boolean;
  /** Si el audio remoto está activo */
  isRemoteAudioActive: boolean;
  /** Último emoji recibido (null si no hay) */
  lastEmoji: string | null;
  /** ID del cuento activo */
  storyId: string | null;
}

/** Emojis disponibles para reacciones del oyente */
export const REACTION_EMOJIS = [
  { emoji: '\u2764\uFE0F', label: 'corazón' },
  { emoji: '\u2B50', label: 'estrella' },
  { emoji: '\uD83D\uDE02', label: 'risa' },
  { emoji: '\uD83D\uDE32', label: 'sorpresa' },
  { emoji: '\uD83D\uDC4F', label: 'aplauso' },
  { emoji: '\uD83E\uDD29', label: 'asombro' },
] as const;
