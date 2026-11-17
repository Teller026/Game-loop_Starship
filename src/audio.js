import { eventBus } from './eventBus.js';

export class AudioManager {
  constructor() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass();
    this.buffers = new Map();
  }

  setBuffers(buffers) {
    this.buffers = buffers;
    console.log('Audio buffers loaded:', Array.from(buffers.keys()));
    for (const [id, buf] of buffers.entries()) {
      console.log(`Buffer [${id}]: duration = ${buf ? buf.duration : 'null'} seconds`);
    }
  }

  resumeContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  play(id) {
    try {
      this.resumeContext();

      const buffer = this.buffers.get(id);
      if (buffer && buffer.duration > 0) {
        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioCtx.destination);
        source.start(0);
      } else {
        console.warn(`Buffer for "${id}" is missing or empty. Playing synthetic sound.`);
        this.playFallbackSound(id);
      }
    } catch (e) {
      console.warn('Audio play error:', e);
      this.playFallbackSound(id);
    }
  }

  playFallbackSound(id) {
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
    } catch (err) {
      console.warn('Fallback sound error:', err);
    }
  }

  setupListeners() {
    const unlock = () => {
      this.resumeContext();
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    eventBus.addEventListener('fired', () => this.play('laser'));
    eventBus.addEventListener('exploded', () => this.play('explosion'));
  }
}