import { describe, expect, it } from 'vitest';
import { normalizeVariantIndex, treeSpriteDef } from '../src/config/obstacleSprites';
import {
  circleObstacleCollision,
  rockCollisionCenter,
  treeCollisionCenter,
  treeFootCollisionCenter,
} from '../src/world/obstacleGeometry';

describe('normalizeVariantIndex', () => {
  it('wraps and clamps to catalog size', () => {
    expect(normalizeVariantIndex(0, 5)).toBe(0);
    expect(normalizeVariantIndex(7, 5)).toBe(2);
    expect(normalizeVariantIndex(-1, 5)).toBe(4);
  });
});

describe('treeCollisionCenter', () => {
  it('uses collisionLiftR from the variant catalog', () => {
    const tree = { t: 'tree' as const, x: 100, y: 200, r: 20, vr: 31, variant: 3, shade: 0 };
    const liftR = treeSpriteDef(3).collisionLiftR;
    expect(liftR).toBeGreaterThan(0);
    expect(treeCollisionCenter(tree)).toEqual({ x: 100, y: 200 - liftR * 20 });
    expect(treeFootCollisionCenter(100, 200, 20, 3)).toEqual(treeCollisionCenter(tree));
    expect(circleObstacleCollision(tree)).toMatchObject({ x: 100, y: 200 - liftR * 20, r: 20 });
  });
});

describe('rockCollisionCenter', () => {
  it('uses obstacle x/y', () => {
    const rock = { t: 'rock' as const, x: 50, y: 60, r: 12, variant: 2, shade: 0 };
    expect(rockCollisionCenter(rock)).toEqual({ x: 50, y: 60 });
  });
});
