import { describe, expect, it } from 'vitest';
import { DEFAULT_MATCH_SETTINGS } from '../src/config/matchSettings';

const TEST_MAP_SIZE = DEFAULT_MATCH_SETTINGS.mapSize;
import { segmentCircle, segmentRect } from '../src/utils/geometry';
import {
  circleFree,
  inHouse,
  lineOfSight,
  resolveCollision,
  segmentObstacle,
  separateBodies,
} from '../src/systems/collision';
import type { Obstacle } from '../src/world/types';
import { buildHouseWalls, housesTooClose, WALL_THICKNESS } from '../src/world/houses';

const wall: Obstacle = { t: 'wall', x: 100, y: 0, w: 20, h: 200 };
const rock: Obstacle = { t: 'rock', x: 300, y: 100, r: 30, shade: 0 };

describe('segment intersection', () => {
  it('segmentCircle finds the entry point', () => {
    expect(segmentCircle(0, 0, 100, 0, 50, 0, 10)).toBeCloseTo(0.4);
  });
  it('segmentCircle returns 0 when starting inside', () => {
    expect(segmentCircle(50, 0, 100, 0, 50, 0, 10)).toBe(0);
  });
  it('segmentCircle returns -1 on a miss or when too short', () => {
    expect(segmentCircle(0, 50, 100, 50, 50, 0, 10)).toBe(-1);
    expect(segmentCircle(0, 0, 20, 0, 50, 0, 10)).toBe(-1);
    expect(segmentCircle(0, 0, 0, 0, 50, 0, 10)).toBe(-1);
  });
  it('segmentRect finds the entry point and handles axis-parallel segments', () => {
    expect(segmentRect(0, 50, 200, 50, 100, 0, 20, 100)).toBeCloseTo(0.5);
    expect(segmentRect(110, -50, 110, 50, 100, 0, 20, 100)).toBeCloseTo(0.5);
    expect(segmentRect(0, 150, 200, 150, 100, 0, 20, 100)).toBe(-1);
    expect(segmentRect(0, 0, 50, 0, 100, 0, 20, 100)).toBe(-1);
  });
});

describe('map collision queries', () => {
  it('segmentObstacle returns the closest hit', () => {
    const t = segmentObstacle([rock, wall], 0, 100, 400, 100);
    expect(t).toBeCloseTo(100 / 400);
    expect(segmentObstacle([rock, wall], 0, 300, 400, 300)).toBe(-1);
  });

  it('lineOfSight is blocked by walls and rocks', () => {
    expect(lineOfSight([wall], 0, 50, 200, 50)).toBe(false);
    expect(lineOfSight([wall], 0, 250, 200, 250)).toBe(true);
    expect(lineOfSight([rock], 200, 100, 400, 100)).toBe(false);
  });

  it('circleFree rejects overlaps and map edges', () => {
    expect(circleFree([rock], 300, 100, 10, TEST_MAP_SIZE)).toBe(false);
    expect(circleFree([rock], 400, 100, 10, TEST_MAP_SIZE)).toBe(true);
    expect(circleFree([wall], 110, 50, 5, TEST_MAP_SIZE)).toBe(false);
    expect(circleFree([], 5, 500, 10, TEST_MAP_SIZE)).toBe(false);
    expect(circleFree([], TEST_MAP_SIZE - 5, 500, 10, TEST_MAP_SIZE)).toBe(false);
  });

  it('inHouse finds the containing house with padding', () => {
    const h = { x: 100, y: 100, w: 200, h: 200 };
    expect(inHouse([h], 150, 150, 0)).toBe(h);
    expect(inHouse([h], 90, 150, 0)).toBeNull();
    expect(inHouse([h], 90, 150, 20)).toBe(h);
  });
});

describe('collision resolution', () => {
  it('pushes a body out of a wall face', () => {
    const e = { x: 95, y: 100, r: 18 };
    resolveCollision([wall], e, TEST_MAP_SIZE);
    expect(e.x).toBeCloseTo(100 - 18);
    expect(e.y).toBe(100);
  });

  it('pushes a body whose centre is inside a wall out the nearest face', () => {
    const e = { x: 117, y: 100, r: 18 };
    resolveCollision([wall], e, TEST_MAP_SIZE);
    expect(e.x).toBe(120 + 18);
  });

  it('pushes a body out of a rock radially', () => {
    const e = { x: 330, y: 100, r: 18 };
    resolveCollision([rock], e, TEST_MAP_SIZE);
    expect(e.x).toBeCloseTo(300 + 30 + 18);
    expect(e.y).toBeCloseTo(100);
  });

  it('clamps bodies inside the map', () => {
    const e = { x: -50, y: TEST_MAP_SIZE + 50, r: 18 };
    resolveCollision([], e, TEST_MAP_SIZE);
    expect(e).toMatchObject({ x: 18, y: TEST_MAP_SIZE - 18 });
  });

  it('separateBodies pushes overlapping living bodies apart equally', () => {
    const a = { x: 100, y: 100, r: 18, alive: true };
    const b = { x: 110, y: 100, r: 18, alive: true };
    const dead = { x: 105, y: 100, r: 18, alive: false };
    separateBodies([a, b, dead]);
    expect(b.x - a.x).toBeCloseTo(36);
    expect((a.x + b.x) / 2).toBeCloseTo(105);
    expect(dead.x).toBe(105);
  });
});

describe('houses', () => {
  it('builds six wall pieces with two doorways', () => {
    const walls = buildHouseWalls({ x: 0, y: 0, w: 300, h: 250 });
    expect(walls).toHaveLength(6);
    for (const w of walls) expect(Math.min(w.w, w.h)).toBe(WALL_THICKNESS);
  });

  it('housesTooClose respects the gap', () => {
    const a = { x: 0, y: 0, w: 100, h: 100 };
    expect(housesTooClose(a, { x: 150, y: 0, w: 100, h: 100 }, 100)).toBe(true);
    expect(housesTooClose(a, { x: 250, y: 0, w: 100, h: 100 }, 100)).toBe(false);
  });
});
