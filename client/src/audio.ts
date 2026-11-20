import { eventBus } from './eventBus.js';

export type SoundId = 'laser' | 'explosion';

type WebkitAudioContextWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export class AudioManager {
  audioCtx: AudioContext;
  buffers: Map<string, AudioBuffer>;

  constructor() {
    const win = window as WebkitAudioContextWindow;
    const AudioContextClass = window.AudioContext ?? win.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('AudioContext is not supported');
    }
    this.audioCtx = new AudioContextClass();
    this.buffers = new Map<string, AudioBuffer>();
  }

  setBuffers(buffers: Map<string, AudioBuffer>): void {
    this.buffers = buffers;
  }

  resumeContext(): void {
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
  }

  play(id: SoundId): void {
    try {
      this.resumeContext();

      const buffer = this.buffers.get(id);
      if (buffer && buffer.duration > 0) {
        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioCtx.destination);
        source.start(0);
      } else {
        this.playFallbackSound(id);
      }
    } catch (_e) {
      this.playFallbackSound(id);
    }
  }

  playFallbackSound(id: SoundId): void {
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;

      if (id === 'laser') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.4);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (_err) {}
  }

  setupListeners(): void {
    const unlock = (): void => {
      this.resumeContext();
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    eventBus.addEventListener('fired', () => this.play('laser'));
    eventBus.addEventListener('exploded', () => this.play('explosion'));
  }
}