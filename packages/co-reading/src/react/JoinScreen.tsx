import { useState, useCallback, type CSSProperties } from 'react';
import { InviteManager } from '../InviteManager.js';
import type { JoinResult } from '../types.js';

export interface JoinScreenProps {
  /** URL base de la API */
  apiBase: string;
  /** Callback cuando se une exitosamente */
  onJoined: (result: JoinResult) => void;
  /** Callback para cancelar */
  onCancel?: () => void;
  /** Clase CSS adicional */
  className?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  expired: 'El código ha expirado. Pide uno nuevo.',
  full: 'La sala ya está llena.',
  not_found: 'Código no encontrado. Revisa que sea correcto.',
  server_error: 'Error de conexión. Inténtalo de nuevo.',
};

/**
 * JoinScreen — Pantalla para que el oyente introduzca el código de invitación.
 *
 * Diseñada para niños:
 * - Teclado grande y fácil de usar
 * - Feedback visual claro
 * - Mensajes de error amigables
 */
export function JoinScreen({ apiBase, onJoined, onCancel, className }: JoinScreenProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = useCallback(async () => {
    if (code.length < 6) return;

    setLoading(true);
    setError(null);

    const manager = new InviteManager(apiBase, '');
    const result = await manager.joinWithCode(code);

    setLoading(false);

    if (result.success) {
      onJoined(result);
    } else {
      const errorKey = result.error ?? 'server_error';
      setError(ERROR_MESSAGES[errorKey] ?? 'Error de conexión. Inténtalo de nuevo.');
    }
  }, [code, apiBase, onJoined]);

  const handleCodeInput = useCallback((char: string) => {
    if (code.length >= 6) return;
    setCode(prev => prev + char);
    setError(null);
  }, [code]);

  const handleDelete = useCallback(() => {
    setCode(prev => prev.slice(0, -1));
    setError(null);
  }, []);

  // Formatear código con guión (ABC-123)
  const displayCode = code.length > 3
    ? `${code.slice(0, 3)}-${code.slice(3)}`
    : code;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
        color: '#f1f5f9',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
        Unirme a un cuento
      </h2>
      <p style={{ color: '#94a3b8', marginBottom: '32px', fontSize: '0.95rem' }}>
        Escribe el codigo que te ha dado el narrador
      </p>

      {/* Display del código */}
      <div
        style={{
          fontSize: '2.5rem',
          fontFamily: 'monospace',
          letterSpacing: '8px',
          fontWeight: 700,
          marginBottom: '8px',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
        }}
        aria-live="polite"
        aria-label={`Código introducido: ${displayCode}`}
      >
        {displayCode || (
          <span style={{ color: '#64748b' }}>_ _ _ - _ _ _</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <p style={{ color: '#fbbf24', fontSize: '0.85rem', marginBottom: '16px' }} role="alert">
          {error}
        </p>
      )}

      {/* Teclado virtual */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        {/* Letras (primera fila: ABC→IJK, segunda: LMN→RST) */}
        {[
          ['A', 'B', 'C', 'D', 'E'],
          ['F', 'G', 'H', 'I', 'J'],
          ['1', '2', '3', '4', '5'],
          ['6', '7', '8', '9', '0'],
        ].map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {row.map(char => (
              <button
                key={char}
                onClick={() => handleCodeInput(char)}
                disabled={loading || code.length >= 6}
                style={keyStyle}
              >
                {char}
              </button>
            ))}
          </div>
        ))}

        {/* Fila inferior: Borrar + Unirme */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            onClick={handleDelete}
            disabled={loading || code.length === 0}
            style={{ ...keyStyle, width: '100px', fontSize: '1rem' }}
          >
            {'\u232B'} Borrar
          </button>
          <button
            onClick={handleJoin}
            disabled={loading || code.length < 6}
            style={{
              ...keyStyle,
              width: '160px',
              background: code.length >= 6 ? '#7c3aed' : 'rgba(255,255,255,0.05)',
              color: code.length >= 6 ? '#fff' : '#64748b',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            {loading ? 'Conectando...' : 'Unirme'}
          </button>
        </div>
      </div>

      {/* Cancelar */}
      {onCancel && (
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.9rem',
            textDecoration: 'underline',
          }}
        >
          Cancelar
        </button>
      )}
    </div>
  );
}

const keyStyle: CSSProperties = {
  width: '56px',
  height: '56px',
  borderRadius: '12px',
  border: 'none',
  background: 'rgba(255, 255, 255, 0.1)',
  color: '#e2e8f0',
  fontSize: '1.3rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s',
};
