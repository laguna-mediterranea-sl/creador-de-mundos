import type { ApiClient } from './ApiClient.js';

/** Datos de invitación para unirse a una sesión */
export interface CoReadingInviteData {
  roomCode: string;
  deepLink: string;
  expiresAt: number;
  storyId: string;
  storyTitle: string;
  token: string;
  livekitUrl: string;
}

/** Resultado de unirse a una sesión con código */
export interface CoReadingJoinResult {
  success: boolean;
  token?: string;
  livekitUrl?: string;
  storyId?: string;
  error?: 'expired' | 'full' | 'not_found' | 'server_error';
}

/**
 * CoReadingService — Servicio API para co-reading (Juntos).
 *
 * Conecta con el backend para:
 * - Crear/unirse a sesiones de co-reading
 * - Gestionar invitaciones
 * - (Futuro) Listar grabaciones
 */
export class CoReadingService {
  constructor(private api: ApiClient) {}

  /**
   * Crea una invitación para lectura compartida.
   * Solo el narrador (usuario autenticado) puede crear invitaciones.
   */
  async createInvite(storyId: string): Promise<CoReadingInviteData> {
    return this.api.post('/api/co-reading/invite', { storyId });
  }

  /**
   * El oyente se une con un código de invitación.
   * No requiere autenticación.
   */
  async joinWithCode(roomCode: string): Promise<CoReadingJoinResult> {
    return this.api.post('/api/co-reading/join', { roomCode }, {
      skipAuth: true,
    });
  }

  /**
   * Verifica si una sala de co-reading está activa.
   */
  async checkRoom(roomCode: string): Promise<{
    active: boolean;
    participantCount: number;
    storyTitle?: string;
  }> {
    return this.api.get(`/api/co-reading/room/${roomCode}`, {
      skipAuth: true,
    });
  }
}
