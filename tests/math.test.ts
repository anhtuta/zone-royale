import { afterEach, describe, expect, it } from 'vitest';
import { angleDelta, clamp, dist, dist2, formatTime, lerp } from '../src/utils/math';
import {
  createSeededRandom,
  pick,
  rand,
  randInt,
  setRandomSource,
  shuffled,
} from '../src/utils/random';
import { shade } from '../src/utils/color';

afterEach(() => setRandomSource(Math.random));

describe('math helpers', () => {
  it('clamp keeps values inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('lerp interpolates linearly', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });

  it('dist and dist2 measure Euclidean distance', () => {
    expect(dist2(0, 0, 3, 4)).toBe(25);
    expect(dist(0, 0, 3, 4)).toBe(5);
    expect(dist(1, 1, 1, 1)).toBe(0);
  });

  it('angleDelta returns the shortest signed turn', () => {
    expect(angleDelta(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(angleDelta(Math.PI / 2, 0)).toBeCloseTo(-Math.PI / 2);
    // wrapping across ±π
    expect(angleDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2);
  });

  it('formatTime renders m:ss and rounds up', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(44.2)).toBe('0:45');
    expect(formatTime(-3)).toBe('0:00');
  });

  it('shade brightens/darkens and clamps channels', () => {
    expect(shade('#000000', 20)).toBe('rgb(20,20,20)');
    expect(shade('#ffffff', 20)).toBe('rgb(255,255,255)');
    expect(shade('#102030', -0x20)).toBe('rgb(0,0,16)');
  });
});

describe('random helpers', () => {
  it('seeded random is deterministic and in [0, 1)', () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('rand / randInt / pick stay in range', () => {
    setRandomSource(createSeededRandom(1));
    for (let i = 0; i < 200; i++) {
      const f = rand(5, 10);
      expect(f).toBeGreaterThanOrEqual(5);
      expect(f).toBeLessThan(10);
      const n = randInt(3, 5);
      expect([3, 4, 5]).toContain(n);
      expect(['a', 'b']).toContain(pick(['a', 'b']));
    }
  });

  it('randInt can hit both bounds', () => {
    setRandomSource(() => 0);
    expect(randInt(3, 5)).toBe(3);
    setRandomSource(() => 0.9999);
    expect(randInt(3, 5)).toBe(5);
  });

  it('shuffled returns a permutation without mutating the input', () => {
    setRandomSource(createSeededRandom(7));
    const src = [1, 2, 3, 4, 5, 6];
    const out = shuffled(src);
    expect(src).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual(src);
  });
});
