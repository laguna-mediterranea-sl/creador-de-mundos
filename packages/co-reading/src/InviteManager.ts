import type { InviteData, JoinResult } from './types.js';

/**
 * InviteManager — Sistema de invitaciones para sesiones de co-reading.
 *
 * Flujo:
 * 1. Narrador pulsa "Leer juntos" → createInvite() → backend genera sala + tokens + código
 * 2. Narrador comparte código (6 dígitos) o deep link por WhatsApp
 * 3. Oyente introduce código → joinWithCode() → recibe token LiveKit
 *
 * SEGURIDAD (LOPD menores):
 * - Código expira en 5 minutos
 * - Máximo 2 participantes por sala
 * - Token del oyente es anónimo (sin datos del menor)
 * - Single-use: código se invalida tras uso
 */
export class InviteManager {
  private apiBase: string;
  private authToken: string;

  constructor(apiBase: string, authToken: string) {
    this.apiBase = apiBase.replace(/\/$/, '');
    this.authToken = authToken;
  }

  /**
   * Narrador crea una invitación para un cuento.
   * Requiere autenticación (el narrador tiene cuenta).
   */
  async createInvite(storyId: string): Promise<InviteData> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${this.apiBase}/api/co-reading/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storyId }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Failed to create invite: ${res.status} ${body}`);
      }

      return await res.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Oyente se une con un código de invitación.
   * NO requiere autenticación — el hijo puede no tener cuenta.
   */
  async joinWithCode(roomCode: string): Promise<JoinResult> {
    const normalizedCode = roomCode.trim().toUpperCase();

    if (!this.isValidCode(normalizedCode)) {
      return { success: false, error: 'not_found' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${this.apiBase}/api/co-reading/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomCode: normalizedCode }),
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 404) return { success: false, error: 'not_found' };
        if (res.status === 410) return { success: false, error: 'expired' };
        if (res.status === 409) return { success: false, error: 'full' };
        return { success: false, error: 'server_error' };
      }

      return await res.json();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, error: 'server_error' };
      }
      return { success: false, error: 'server_error' };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Genera un link de compartir por WhatsApp.
   */
  static createWhatsAppLink(roomCode: string, storyTitle: string, deepLink: string): string {
    const message = encodeURIComponent(
      `Te invito a leer "${storyTitle}" juntos. ` +
      `Abre la app y usa el código: ${roomCode}\n\n` +
      `O pulsa este enlace: ${deepLink}`
    );
    return `https://wa.me/?text=${message}`;
  }

  /**
   * Valida formato del código de invitación (3 letras + 3 números).
   */
  private isValidCode(code: string): boolean {
    return /^[A-Z]{3}-?\d{3}$/.test(code);
  }
}
