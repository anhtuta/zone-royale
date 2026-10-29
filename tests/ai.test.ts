import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BOT_SIGHT } from '../src/config/constants';
import { WEAPONS } from '../src/config/weapons';
import {
  aimErrorScale,
  chooseWanderPoint,
  combatRadial,
  isNearZoneEdge,
  needsSafety,
  preferredRange,
  safeCircle,
  scanForTarget,
  steerTowards,
  updateBot,
} from '../src/systems/ai';
import { createSeededRandom, setRandomSource } from '../src/utils/random';
import type { Obstacle } from '../src/world/types';
import { bot, makeWorld } from './helpers';

beforeEach(() => setRandomSource(createSeededRandom(99)));
afterEach(() => setRandomSource(Math.random));

describe('target selection', () => {
  it('picks the closest visible enemy in sight range', () => {
    const w = makeWorld();
    const b = bot(1000, 1000);
    const near = bot(1200, 1000);
    const far = bot(1000, 1400);
    w.entities.push(b, near, far);
    w.player.x = 1000 + BOT_SIGHT + 50;
    w.player.y = 1000;
    expect(scanForTarget(b, w.entities, [])).toBe(near);
  });

  it('ignores dead enemies and enemies behind walls', () => {
    const w = makeWorld();
    const b = bot(1000, 1000);
    const hidden = bot(1200, 1000);
    const dead = bot(1000, 1100);
    dead.alive = false;
    w.entities = [b, hidden, dead];
    const walls: Obstacle[] = [{ t: 'wall', x: 1100, y: 900, w: 16, h: 200 }];
    expect(scanForTarget(b, w.entities, walls)).toBeNull();
  });

  it('retaliates against a visible attacker beyond normal sight range', () => {
    const b = bot(1000, 1000);
    const attacker = bot(1000 + BOT_SIGHT * 1.3, 1000);
    b.ai!.attacker = attacker;
    expect(scanForTarget(b, [b, attacker], [])).toBe(attacker);
    attacker.x = 1000 + BOT_SIGHT * 1.5;
    expect(scanForTarget(b, [b, attacker], [])).toBeNull();
  });
});

describe('combat decisions', () => {
  it('preferred range is half the weapon range capped at 420', () => {
    expect(preferredRange(WEAPONS.shotgun)).toBe(200);
    expect(preferredRange(WEAPONS.sniper)).toBe(420);
  });

  it('approaches when far, retreats when close, holds in between', () => {
    expect(combatRadial(500, 300)).toBe(1);
    expect(combatRadial(200, 300)).toBe(-0.7);
    expect(combatRadial(330, 300)).toBe(0);
  });

  it('aim error grows with distance and shrinks with skill', () => {
    expect(aimErrorScale(0.9, 100)).toBeLessThan(aimErrorScale(0.5, 100));
    expect(aimErrorScale(0.9, 1000)).toBeGreaterThan(aimErrorScale(0.9, 100));
  });

  it('steerTowards adds a weighted unit vector', () => {
    const m = { x: 0, y: 0 };
    steerTowards(m, 0, 0, 10, 0, 2);
    expect(m).toEqual({ x: 2, y: 0 });
  });
});

describe('zone awareness', () => {
  it('safe circle is the next target, or the current circle once closed', () => {
    const w = makeWorld();
    const z = w.zone;
    expect(safeCircle(z)).toEqual({ x: z.tx, y: z.ty, r: z.tr });
    z.state = 'final';
    expect(safeCircle(z)).toEqual({ x: z.x, y: z.y, r: z.r });
  });

  it('needs safety when outside the next circle and the zone is about to move', () => {
    const w = makeWorld();
    const z = w.zone;
    const farX = z.tx + z.tr;
    expect(needsSafety(farX, z.ty, z)).toBe(false); // 45s left in the wait
    z.timer = 10;
    expect(needsSafety(farX, z.ty, z)).toBe(true);
    expect(needsSafety(z.tx, z.ty, z)).toBe(false);
  });

  it('detects the zone edge with a 30px margin', () => {
    const w = makeWorld();
    const z = w.zone;
    z.r = 500;
    expect(isNearZoneEdge(z.x + 480, z.y, z)).toBe(true);
    expect(isNearZoneEdge(z.x + 400, z.y, z)).toBe(false);
  });

  it('wander points stay on the map and inside the safe circle after phase 1', () => {
    const w = makeWorld();
    const b = bot(100, 100);
    w.zone.phase = 2;
    for (let i = 0; i < 100; i++) {
      const p = chooseWanderPoint(b, w.zone, false);
      expect(p.x).toBeGreaterThanOrEqual(60);
      expect(p.x).toBeLessThanOrEqual(w.mapSize - 60);
      expect(Math.hypot(p.x - w.zone.tx, p.y - w.zone.ty)).toBeLessThanOrEqual(
        w.zone.tr * 0.75 + 1e-6,
      );
    }
  });
});

describe('updateBot', () => {
  it('switches to the weapon that still has ammo', () => {
    const w = makeWorld();
    const b = bot(1500, 1700);
    w.entities.push(b);
    b.weapons = [
      { type: 'pistol', mag: 0 },
      { type: 'smg', mag: 30 },
      null,
      null,
    ];
    b.ammo.light = 0;
    updateBot(w, b, 1 / 60);
    expect(b.slot).toBe(1);
  });

  it('acquires a target, waits its reaction time, then shoots', () => {
    const w = makeWorld();
    const b = bot(w.player.x + 200, w.player.y + 200);
    w.entities.push(b);
    updateBot(w, b, 1 / 60);
    expect(b.ai!.target).toBe(w.player);
    expect(w.bullets).toHaveLength(0);
    for (let i = 0; i < 240 && w.bullets.length === 0; i++) updateBot(w, b, 1 / 60);
    expect(w.bullets.length).toBeGreaterThan(0);
    expect(w.bullets[0]!.owner).toBe(b);
  });

  it('runs away from an enemy when it has no usable weapon', () => {
    const w = makeWorld();
    const b = bot(w.player.x + 200, w.player.y + 100);
    w.entities.push(b);
    b.weapons = [{ type: 'pistol', mag: 0 }, null, null];
    b.ammo.light = 0;
    updateBot(w, b, 1 / 60);
    expect(b.ai!.target).toBe(w.player);
    const awayX = b.x - w.player.x;
    const awayY = b.y - w.player.y;
    expect(b.vx * awayX + b.vy * awayY).toBeGreaterThan(0);
  });

  it('walks to and picks up loot it wants', () => {
    const w = makeWorld();
    w.player.x = 100;
    w.player.y = 100;
    const b = bot(2000, 2000);
    w.entities.push(b);
    b.hp = 50;
    const kit = { kind: 'health' as const, amount: 40, x: 2010, y: 2000 };
    w.loot.push(kit);
    updateBot(w, b, 1 / 60);
    expect(b.hp).toBe(90);
    expect(w.loot).not.toContain(kit);
  });

  it('heads back into the zone when outside it', () => {
    const w = makeWorld();
    w.player.x = 100;
    w.player.y = 100;
    w.zone.r = 300;
    const b = bot(w.zone.x + 600, w.zone.y);
    w.entities.push(b);
    updateBot(w, b, 1 / 60);
    expect(b.vx).toBeLessThan(0);
    expect(Math.abs(b.vy)).toBeLessThan(1);
  });
});
