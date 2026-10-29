import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AMMO_TYPES, STARTING_AMMO, WEAPON_TYPES, WEAPONS } from '../src/config/weapons';
import {
  finishReload,
  hasAmmoFor,
  movementSpreadFactor,
  MOVING_SPREAD_MULTIPLIER,
  startReload,
  switchSlot,
  SWITCH_DELAY,
  tickWeaponTimers,
  tryShoot,
} from '../src/systems/weapons';
import { createSeededRandom, setRandomSource } from '../src/utils/random';
import { makeWorld, RecordingSound } from './helpers';

beforeEach(() => setRandomSource(createSeededRandom(123)));
afterEach(() => setRandomSource(Math.random));

describe('weapon definitions', () => {
  it('has exactly five weapons with sane stats', () => {
    expect(WEAPON_TYPES).toHaveLength(5);
    for (const t of WEAPON_TYPES) {
      const w = WEAPONS[t];
      expect(AMMO_TYPES).toContain(w.ammo);
      expect(w.dmg).toBeGreaterThan(0);
      expect(w.mag).toBeGreaterThan(0);
      expect(w.rate).toBeGreaterThan(0);
      expect(w.range / w.speed).toBeGreaterThan(0);
    }
  });

  it('only the SMG and rifle are automatic; only the shotgun fires pellets', () => {
    expect(WEAPON_TYPES.filter((t) => WEAPONS[t].auto)).toEqual(['smg', 'rifle']);
    expect(WEAPON_TYPES.filter((t) => WEAPONS[t].pellets > 1)).toEqual(['shotgun']);
    expect(WEAPONS.shotgun.pellets).toBe(8);
  });

  it('the sniper is the highest tier and hardest-hitting weapon', () => {
    const maxTier = Math.max(...WEAPON_TYPES.map((t) => WEAPONS[t].tier));
    expect(WEAPONS.sniper.tier).toBe(maxTier);
    expect(WEAPONS.sniper.dmg).toBe(85);
  });

  it('everyone starts with a full pistol and 24 light rounds', () => {
    const w = makeWorld();
    expect(w.player.weapons[0]).toEqual({ type: 'pistol', mag: 12 });
    expect(w.player.weapons.slice(1)).toEqual([null, null]);
    expect(w.player.ammo).toEqual(STARTING_AMMO);
  });
});

describe('ammo and slots', () => {
  it('hasAmmoFor checks magazine and reserve', () => {
    const { player: p } = makeWorld();
    expect(hasAmmoFor(p, 0)).toBe(true);
    expect(hasAmmoFor(p, 1)).toBe(false);
    p.weapons[0] = { type: 'pistol', mag: 0 };
    p.ammo.light = 0;
    expect(hasAmmoFor(p, 0)).toBe(false);
    p.ammo.light = 1;
    expect(hasAmmoFor(p, 0)).toBe(true);
  });

  it('switchSlot cancels reloads and adds a draw delay; ignores empty slots', () => {
    const { player: p } = makeWorld();
    switchSlot(p, 1);
    expect(p.slot).toBe(0);
    p.weapons[1] = { type: 'smg', mag: 30 };
    p.reloading = 1;
    switchSlot(p, 1);
    expect(p.slot).toBe(1);
    expect(p.reloading).toBe(0);
    expect(p.cool).toBe(SWITCH_DELAY);
  });
});

describe('reloading', () => {
  it('does not reload a full magazine or without reserve ammo', () => {
    const { player: p } = makeWorld();
    expect(startReload(p)).toBe(false);
    p.weapons[0] = { type: 'pistol', mag: 3 };
    p.ammo.light = 0;
    expect(startReload(p)).toBe(false);
  });

  it('reload takes the weapon reload time, then fills from reserve', () => {
    const { player: p } = makeWorld();
    p.weapons[0] = { type: 'pistol', mag: 3 };
    expect(startReload(p)).toBe(true);
    expect(p.reloading).toBe(WEAPONS.pistol.reload);
    expect(p.reloadTotal).toBe(WEAPONS.pistol.reload);
    tickWeaponTimers(p, 0.5);
    expect(p.weapons[0]?.mag).toBe(3);
    tickWeaponTimers(p, 0.7);
    expect(p.reloading).toBe(0);
    expect(p.weapons[0]?.mag).toBe(12);
    expect(p.ammo.light).toBe(24 - 9);
  });

  it('a partial reserve only partially fills the magazine', () => {
    const { player: p } = makeWorld();
    p.weapons[0] = { type: 'pistol', mag: 0 };
    p.ammo.light = 5;
    finishReload(p);
    expect(p.weapons[0]?.mag).toBe(5);
    expect(p.ammo.light).toBe(0);
  });
});

describe('firing', () => {
  it('fires one bullet, consumes a round and starts the cooldown', () => {
    const w = makeWorld();
    const p = w.player;
    p.angle = 0;
    expect(tryShoot(w, p)).toBe(true);
    expect(p.weapons[0]?.mag).toBe(11);
    expect(p.cool).toBe(WEAPONS.pistol.rate);
    expect(w.bullets).toHaveLength(1);
    const b = w.bullets[0]!;
    expect(b.dmg).toBe(20);
    expect(b.owner).toBe(p);
    expect(b.life).toBeCloseTo(WEAPONS.pistol.range / WEAPONS.pistol.speed);
    expect(b.nx).toBeCloseTo(p.x + p.r + WEAPONS.pistol.len);
    expect(w.particles.some((q) => q.flash)).toBe(true);
    expect(w.shake).toBeGreaterThan(0);
  });

  it('cannot fire during cooldown or while reloading', () => {
    const w = makeWorld();
    const p = w.player;
    tryShoot(w, p);
    expect(tryShoot(w, p)).toBe(false);
    p.cool = 0;
    p.reloading = 0.5;
    expect(tryShoot(w, p)).toBe(false);
    expect(w.bullets).toHaveLength(1);
  });

  it('the shotgun fires eight pellets', () => {
    const w = makeWorld();
    w.player.weapons[0] = { type: 'shotgun', mag: 5 };
    tryShoot(w, w.player);
    expect(w.bullets).toHaveLength(8);
  });

  it('an empty magazine auto-reloads instead of firing', () => {
    const w = makeWorld();
    w.player.weapons[0] = { type: 'pistol', mag: 0 };
    expect(tryShoot(w, w.player)).toBe(false);
    expect(w.player.reloading).toBeGreaterThan(0);
    expect(w.bullets).toHaveLength(0);
  });

  it('with no ammo at all the player is told what to find', () => {
    const w = makeWorld();
    w.player.weapons[0] = { type: 'pistol', mag: 0 };
    w.player.ammo.light = 0;
    tryShoot(w, w.player);
    expect(w.message.text).toBe('No ammo! Find Light ammo');
    expect(w.player.cool).toBe(0.3);
  });

  it('moving increases spread', () => {
    const { player: p } = makeWorld();
    expect(movementSpreadFactor(p)).toBe(1);
    p.vx = 200;
    expect(movementSpreadFactor(p)).toBe(MOVING_SPREAD_MULTIPLIER);
  });

  it('plays a shot sound near the player', () => {
    const sound = new RecordingSound();
    const w = makeWorld({ sound });
    tryShoot(w, w.player);
    expect(sound.played[0]?.kind).toBe('shot_pistol');
  });
});
