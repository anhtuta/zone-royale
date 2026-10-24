import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MAP_SIZE, ZONE_START_RADIUS } from '../src/config/constants';
import { PHASES } from '../src/config/zone';
import {
  createZone,
  isOutsideZone,
  setupPhase,
  totalZoneDuration,
  updateZone,
  zoneDps,
  zoneTickDamage,
} from '../src/systems/zone';
import { createSeededRandom, setRandomSource } from '../src/utils/random';

beforeEach(() => setRandomSource(createSeededRandom(31)));
afterEach(() => setRandomSource(Math.random));

describe('zone phases', () => {
  it('has six phases that shrink to zero with rising damage', () => {
    expect(PHASES).toHaveLength(6);
    for (let i = 1; i < PHASES.length; i++) {
      expect(PHASES[i]!.r).toBeLessThan(PHASES[i - 1]!.r);
      expect(PHASES[i]!.dps).toBeGreaterThan(PHASES[i - 1]!.dps);
    }
    expect(PHASES.at(-1)!.r).toBe(0);
    expect(totalZoneDuration()).toBe(252);
  });

  it('starts covering the map and waiting for phase 1', () => {
    const z = createZone();
    expect(z).toMatchObject({
      x: MAP_SIZE / 2,
      y: MAP_SIZE / 2,
      r: ZONE_START_RADIUS,
      phase: 0,
      state: 'wait',
    });
    expect(z.timer).toBe(PHASES[0]!.wait);
    expect(z.tr).toBe(PHASES[0]!.r);
  });

  it('starting radius covers the farthest spawn corners', () => {
    const z = createZone();
    const edge = MAP_SIZE - 120;
    expect(isOutsideZone(z, edge, edge)).toBe(false);
  });

  it('next circle stays inside the map and inside the drift limit', () => {
    for (let i = 0; i < 50; i++) {
      const z = createZone();
      const m = Math.min(z.tr + 60, MAP_SIZE / 2);
      expect(z.tx).toBeGreaterThanOrEqual(m);
      expect(z.tx).toBeLessThanOrEqual(MAP_SIZE - m);
      expect(Math.hypot(z.tx - z.x, z.ty - z.y)).toBeLessThanOrEqual(
        (ZONE_START_RADIUS - z.tr) * 0.35 + 1e-9,
      );
    }
  });

  it('later phases drift further (up to 80% of the radius difference)', () => {
    const z = createZone();
    z.phase = 1;
    z.r = PHASES[0]!.r;
    setupPhase(z);
    expect(Math.hypot(z.tx - z.x, z.ty - z.y)).toBeLessThanOrEqual(
      (PHASES[0]!.r - PHASES[1]!.r) * 0.8 + 1e-9,
    );
  });

  it('phase end radii scale with the opening safe zone', () => {
    expect(PHASES[0]!.r).toBe(Math.round(ZONE_START_RADIUS * 0.5));
    expect(PHASES.at(-1)!.r).toBe(0);
  });
});

describe('updateZone', () => {
  it('waits, then shrinks, interpolating centre and radius', () => {
    const z = createZone();
    expect(updateZone(z, 44)).toBeNull();
    expect(updateZone(z, 1)).toBe('shrinkStarted');
    expect(z.state).toBe('shrink');
    expect(z.timer).toBe(PHASES[0]!.shrink);
    updateZone(z, PHASES[0]!.shrink / 2);
    expect(z.r).toBeCloseTo((ZONE_START_RADIUS + PHASES[0]!.r) / 2);
    expect(z.x).toBeCloseTo((MAP_SIZE / 2 + z.tx) / 2);
  });

  it('advances to the next phase when the shrink ends', () => {
    const z = createZone();
    updateZone(z, 45);
    const tx = z.tx;
    expect(updateZone(z, 30)).toBe('phaseAdvanced');
    expect(z.phase).toBe(1);
    expect(z.state).toBe('wait');
    expect(z.r).toBe(PHASES[0]!.r);
    expect(z.x).toBe(tx);
  });

  it('closes completely after all phases and then stays put', () => {
    const z = createZone();
    const events: string[] = [];
    for (let t = 0; t < totalZoneDuration() + 5; t += 0.1) {
      const e = updateZone(z, 0.1);
      if (e) events.push(e);
    }
    expect(z.state).toBe('final');
    expect(z.r).toBe(0);
    expect(events.filter((e) => e === 'shrinkStarted')).toHaveLength(6);
    expect(events.at(-1)).toBe('closed');
    expect(updateZone(z, 1)).toBeNull();
  });
});

describe('zone damage', () => {
  it('dps follows the phase and is boosted once closed', () => {
    const z = createZone();
    expect(zoneDps(z)).toBe(1);
    z.phase = 5;
    expect(zoneDps(z)).toBe(14);
    z.state = 'final';
    expect(zoneDps(z)).toBe(21);
  });

  it('isOutsideZone compares distance with the radius', () => {
    const z = createZone();
    z.r = 100;
    expect(isOutsideZone(z, z.x + 99, z.y)).toBe(false);
    expect(isOutsideZone(z, z.x + 101, z.y)).toBe(true);
  });

  it('deals damage in 0.5s ticks', () => {
    const h = { zoneTick: 0 };
    expect(zoneTickDamage(h, 0.3, 4)).toBe(0);
    expect(zoneTickDamage(h, 0.3, 4)).toBe(2);
    expect(h.zoneTick).toBeCloseTo(0.1);
    // 2 seconds outside at 6 dps = 4 ticks of 3 damage
    const e = { zoneTick: 0 };
    let total = 0;
    for (let i = 0; i < 8; i++) total += zoneTickDamage(e, 0.25, 6);
    expect(total).toBe(12);
  });
});
