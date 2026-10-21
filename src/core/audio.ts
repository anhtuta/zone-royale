/**
 * Procedural sound effects with the Web Audio API (no audio files needed).
 *
 * @packageDocumentation
 */

import type { SoundKind, SoundSink } from './world';

/** Browsers that still only expose the prefixed constructor. */
type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };

/** Synthesises gunshots (filtered noise) and blips (oscillators). */
export class AudioEngine implements SoundSink {
  /** The audio context, created lazily on the first user gesture. */
  private ctx: AudioContext | null = null;
  /** 0.3s of decaying white noise reused for every shot. */
  private noise: AudioBuffer | null = null;

  /**
   * Creates (or resumes) the audio context. Must be called from a user
   * gesture because browsers block autoplay. Failures are swallowed and leave
   * the game silent.
   */
  unlock(): void {
    try {
      if (!this.ctx) {
        const w = window as WindowWithWebkitAudio;
        const Ctor = window.AudioContext ?? w.webkitAudioContext;
        if (!Ctor) return;
        const ctx = new Ctor();
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        this.ctx = ctx;
        this.noise = buf;
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  /**
   * Whether audio has been unlocked.
   *
   * @returns `true` once a context exists.
   */
  get ready(): boolean {
    return this.ctx !== null;
  }

  /**
   * Plays one effect.
   *
   * @param kind - Which effect.
   * @param volume - Linear gain.
   * @param extra - Low-pass cutoff in Hz for shots (default 1800).
   */
  play(kind: SoundKind, volume: number, extra?: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(ctx.destination);
    if (kind === 'shot') {
      const s = ctx.createBufferSource();
      s.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = extra || 1800;
      s.connect(f);
      f.connect(g);
      g.gain.setValueAtTime(volume, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      s.start(t);
      s.stop(t + 0.2);
    } else {
      const o = ctx.createOscillator();
      o.type = kind === 'hit' ? 'square' : 'sine';
      o.frequency.setValueAtTime(kind === 'hit' ? 520 : kind === 'pickup' ? 660 : 180, t);
      o.frequency.exponentialRampToValueAtTime(kind === 'pickup' ? 990 : 90, t + 0.12);
      o.connect(g);
      g.gain.setValueAtTime(volume * 0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.start(t);
      o.stop(t + 0.15);
    }
  }
}
