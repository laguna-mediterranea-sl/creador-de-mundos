import type { AudioConfig } from '../types/Config.js';
import type { HotspotContent } from '../types/Hotspot.js';
import { EventBus } from '../events/EventBus.js';
import { sanitizeAssetUrl } from '../utils/sanitize.js';

/**
 * Gestiona la reproducción de audio y Text-to-Speech.
 *
 * Fase 1: Solo soporta Web Speech API y audio pregenerado (URLs .mp3).
 * Fase 4: Añadirá Kokoro TTS (ONNX en browser / API).
 *
 * Prioridad de reproducción por hotspot:
 * 1. Si tiene audioUrl → reproduce el archivo de audio
 * 2. Si tiene audioAutoGenerate && text → genera TTS del texto
 * 3. Si no, no reproduce nada
 */
export class AudioManager {
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentHotspotId: string | null = null;
  private muted = false;
  private volume = 1.0;
  private disposed = false;

  constructor(
    private config: AudioConfig,
    private eventBus: EventBus
  ) {}

  /**
   * Reproduce audio para un hotspot.
   * Detiene cualquier audio en curso antes de iniciar.
   */
  async playForHotspot(hotspotId: string, content: HotspotContent): Promise<void> {
    if (this.disposed || this.muted) return;

    // Stop any current audio
    this.stop();
    this.currentHotspotId = hotspotId;

    // Priority 1: pre-generated audio file
    if (content.audioUrl) {
      await this.playAudioFile(hotspotId, content.audioUrl);
      return;
    }

    // Priority 2: TTS from text
    if (content.audioAutoGenerate && content.text) {
      await this.speakText(hotspotId, content.text);
      return;
    }
  }

  /**
   * Reproduce un archivo de audio por URL.
   */
  private async playAudioFile(hotspotId: string, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const safeUrl = sanitizeAssetUrl(url);
      const audio = new Audio(safeUrl);
      audio.volume = this.volume;
      this.currentAudio = audio;

      audio.addEventListener('play', () => {
        this.eventBus.emit('audio:started', hotspotId);
      }, { once: true });

      audio.addEventListener('ended', () => {
        this.currentAudio = null;
        this.currentHotspotId = null;
        this.eventBus.emit('audio:ended', hotspotId);
        resolve();
      }, { once: true });

      audio.addEventListener('error', () => {
        this.currentAudio = null;
        this.currentHotspotId = null;
        reject(new Error(`Failed to play audio from ${url}`));
      }, { once: true });

      audio.play().catch((error) => {
        this.currentAudio = null;
        this.currentHotspotId = null;
        reject(error);
      });
    });
  }

  /**
   * Genera y reproduce TTS usando Web Speech API.
   */
  private async speakText(hotspotId: string, text: string): Promise<void> {
    if (typeof speechSynthesis === 'undefined') {
      console.warn('[WorldEngine] Web Speech API not available in this browser');
      return;
    }

    return new Promise((resolve) => {
      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.config.ttsLang;
      utterance.volume = this.volume;
      utterance.rate = 0.9; // Slightly slower for children/students

      // Try to find a matching voice
      const voice = this.findVoice(this.config.ttsLang);
      if (voice) {
        utterance.voice = voice;
      }

      this.currentUtterance = utterance;

      utterance.onstart = () => {
        this.eventBus.emit('audio:started', hotspotId);
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        this.currentHotspotId = null;
        this.eventBus.emit('audio:ended', hotspotId);
        resolve();
      };

      utterance.onerror = () => {
        this.currentUtterance = null;
        this.currentHotspotId = null;
        resolve(); // Don't reject — TTS failure is not critical
      };

      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Detiene cualquier audio en curso (file o TTS).
   */
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      if (this.currentHotspotId) {
        this.eventBus.emit('audio:ended', this.currentHotspotId);
      }
      this.currentAudio = null;
    }

    if (this.currentUtterance) {
      if (typeof speechSynthesis !== 'undefined') {
        speechSynthesis.cancel();
      }
      if (this.currentHotspotId) {
        this.eventBus.emit('audio:ended', this.currentHotspotId);
      }
      this.currentUtterance = null;
    }

    this.currentHotspotId = null;
  }

  /**
   * Pausa el audio en curso.
   */
  pause(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.pause();
    }
  }

  /**
   * Reanuda el audio pausado.
   */
  resume(): void {
    if (this.currentAudio) {
      this.currentAudio.play().catch(() => { /* ignore autoplay restrictions */ });
    }
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.resume();
    }
  }

  /**
   * Silencia/activa todo el audio.
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stop();
    }
  }

  /**
   * Establece el volumen (0.0 - 1.0).
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
  }

  /**
   * Indica si hay audio reproduciéndose.
   */
  get isPlaying(): boolean {
    if (this.currentAudio && !this.currentAudio.paused) return true;
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking) return true;
    return false;
  }

  /**
   * ID del hotspot cuyo audio se está reproduciendo.
   */
  get playingHotspotId(): string | null {
    return this.currentHotspotId;
  }

  /**
   * Libera recursos.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
  }

  /**
   * Busca la mejor voz disponible para el idioma dado.
   */
  private findVoice(lang: string): SpeechSynthesisVoice | null {
    if (typeof speechSynthesis === 'undefined') return null;

    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // Exact match
    const exact = voices.find(v => v.lang === lang);
    if (exact) return exact;

    // Partial match (e.g., 'es' matches 'es-ES')
    const prefix = lang.split('-')[0];
    if (prefix) {
      const partial = voices.find(v => v.lang.startsWith(prefix));
      if (partial) return partial;
    }

    return null;
  }
}
