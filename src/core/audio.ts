/**
 * Procedural sound effects with the Web Audio API (no audio files needed).
 *
 * @packageDocumentation
 */

import { SFX_BLIP_GAIN, SFX_WEAPON_GAIN } from '../config/constants';
import type { WeaponType } from '../config/weapons';
import type { SoundKind, SoundSink } from './world';

/** Browsers that still only expose the prefixed constructor. */
type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };

const WEAPON_SHOT_PREFIX = 'shot_';

/** Parses `shot_<weapon>` kinds; returns `null` for non-gunshot SFX. */
function weaponFromShotKind(kind: SoundKind): WeaponType | null {
  if (!kind.startsWith(WEAPON_SHOT_PREFIX)) return null;
  return kind.slice(WEAPON_SHOT_PREFIX.length) as WeaponType;
}

/** Synthesises gunshots (filtered noise) and blips (oscillators). */
export class AudioEngine implements SoundSink {
  /** The audio context, created lazily on the first user gesture. */
  private ctx: AudioContext | null = null;
  /** 0.45s of decaying white noise reused for gunshots. */
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
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.45, ctx.sampleRate);
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
   * @param _extra - Unused (kept for {@link SoundSink} compatibility).
   */
  play(kind: SoundKind, volume: number, _extra?: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const weapon = weaponFromShotKind(kind);
    if (weapon) {
      this.playWeaponShot(ctx, weapon, volume);
      return;
    }
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(ctx.destination);
    const o = ctx.createOscillator();
    o.type = kind === 'hit' ? 'square' : 'sine';
    o.frequency.setValueAtTime(kind === 'hit' ? 520 : kind === 'pickup' ? 660 : 180, t);
    o.frequency.exponentialRampToValueAtTime(kind === 'pickup' ? 990 : 90, t + 0.12);
    o.connect(g);
    g.gain.setValueAtTime(volume * SFX_BLIP_GAIN, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.start(t);
    o.stop(t + 0.15);
  }

  /**
   * High-contrast procedural gunshots — each weapon has a distinct timbre and length.
   */
  private playWeaponShot(ctx: AudioContext, weapon: WeaponType, volume: number): void {
    const amp = volume * SFX_WEAPON_GAIN;
    const t = ctx.currentTime;
    const noise = this.noise!;
    const out = ctx.createGain();
    out.connect(ctx.destination);

    const noiseBurst = (
      duration: number,
      filter: { type: BiquadFilterType; freq: number; q?: number },
      gain: number,
    ): void => {
      const s = ctx.createBufferSource();
      s.buffer = noise;
      const f = ctx.createBiquadFilter();
      f.type = filter.type;
      f.frequency.value = filter.freq;
      if (filter.q !== undefined) f.Q.value = filter.q;
      const g = ctx.createGain();
      s.connect(f);
      f.connect(g);
      g.connect(out);
      g.gain.setValueAtTime(amp * gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      s.start(t);
      s.stop(t + duration + 0.02);
    };

    const toneThump = (freq: number, duration: number, gain: number, type: OscillatorType = 'sine'): void => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(freq * 0.35, 40), t + duration);
      const g = ctx.createGain();
      o.connect(g);
      g.connect(out);
      g.gain.setValueAtTime(amp * gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      o.start(t);
      o.stop(t + duration + 0.02);
    };

    switch (weapon) {
      case 'pistol':
        // Snappy mid pop — tight band, short tail.
        noiseBurst(0.1, { type: 'bandpass', freq: 2400, q: 1.2 }, 0.95);
        toneThump(920, 0.06, 0.35);
        break;
      case 'smg':
        // Bright, dry tick — high band, very short (reads at high fire rate).
        noiseBurst(0.055, { type: 'highpass', freq: 3200 }, 0.75);
        toneThump(1400, 0.035, 0.28, 'triangle');
        break;
      case 'shotgun':
        // Low boom + wide noise wash.
        noiseBurst(0.32, { type: 'lowpass', freq: 520 }, 1.1);
        toneThump(72, 0.22, 0.65);
        toneThump(180, 0.12, 0.25, 'triangle');
        break;
      case 'rifle':
        // Sharp mid crack.
        noiseBurst(0.14, { type: 'bandpass', freq: 1800, q: 0.9 }, 1);
        toneThump(340, 0.08, 0.3);
        break;
      case 'sniper':
        // Heavy sub boom + long muffled tail.
        noiseBurst(0.38, { type: 'lowpass', freq: 380 }, 1.15);
        toneThump(55, 0.35, 0.85);
        toneThump(110, 0.2, 0.2, 'sawtooth');
        break;
    }
  }
}
