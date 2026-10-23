import { describe, expect, it } from 'vitest';
import { SFX_MAX_DISTANCE } from '../src/config/constants';
import { emitSound, soundListenerPosition, soundVolume } from '../src/systems/sound';
import { bot, makeWorld, RecordingSound } from './helpers';

describe('positional sound', () => {
  it('uses the player as the listener while alive', () => {
    const w = makeWorld();
    expect(soundListenerPosition(w)).toEqual({ x: w.player.x, y: w.player.y });
  });

  it('uses the spectate target as the listener after elimination', () => {
    const w = makeWorld();
    const target = bot(2000, 2100);
    w.entities.push(target);
    w.player.alive = false;
    w.spectating = true;
    w.camTarget = target;
    expect(soundListenerPosition(w)).toEqual({ x: 2000, y: 2100 });
  });

  it('plays shots near the spectate target, not the corpse', () => {
    const w = makeWorld();
    w.player.x = 100;
    w.player.y = 100;
    const target = bot(2000, 2000);
    w.entities.push(target);
    w.player.alive = false;
    w.spectating = true;
    w.camTarget = target;
    const sound = new RecordingSound();
    w.sound = sound;
    w.sfxBudget = 6;
    emitSound(w, 'shot_pistol', 2050, 2000);
    expect(sound.played).toHaveLength(1);
    emitSound(w, 'shot_pistol', 150, 150);
    expect(sound.played).toHaveLength(1);
  });

  it('falls off with distance from the listener', () => {
    expect(soundVolume(0)).toBeCloseTo(0.5);
    expect(soundVolume(SFX_MAX_DISTANCE)).toBe(0);
  });
});
