import { describe, expect, it } from 'vitest';
import { normalizeVariantIndex, treeSpriteDef } from '../src/config/obstacleSprites';
import {
  circleObstacleCollision,
  rockCollisionCenter,
  treeCollisionCenter,
  treeCollisionLiftPx,
  treeFootCollisionCenter,
  treeModelFoot,
  treeSpriteFoot,
} from '../src/world/obstacleGeometry';

describe('normalizeVariantIndex', () => {
  it('wraps and clamps to catalog size', () => {
    expect(normalizeVariantIndex(0, 5)).toBe(0);
    expect(normalizeVariantIndex(7, 5)).toBe(2);
    expect(normalizeVariantIndex(-1, 5)).toBe(4);
  });
});

describe('treeCollisionCenter', () => {
  it('uses stored x/y as the gameplay circle centre', () => {
    const tree = { t: 'tree' as const, x: 100, y: 200, r: 20, vr: 31, variant: 3, shade: 0 };
    expect(treeCollisionCenter(tree)).toEqual({ x: 100, y: 200 });
    expect(circleObstacleCollision(tree)).toMatchObject({ x: 100, y: 200, r: 20 });
  });

  it('derives model foot and sprite foot from lift and visual drawOffset', () => {
    const tree = { t: 'tree' as const, x: 100, y: 200, r: 20, vr: 31, variant: 3, shade: 0 };
    const lift = treeCollisionLiftPx(tree);
    const def = treeSpriteDef(3);
    expect(lift).toBe(def.collisionLiftR * 20);
    expect(treeModelFoot(tree)).toEqual({ x: 100, y: 200 + lift });
    expect(treeSpriteFoot(tree)).toEqual({
      x: 100 + def.drawOffsetX,
      y: 200 + lift + def.drawOffsetY,
    });
    expect(treeFootCollisionCenter(treeModelFoot(tree).x, treeModelFoot(tree).y, 20, 3)).toEqual(
      treeCollisionCenter(tree),
    );
  });
});

describe('rockCollisionCenter', () => {
  it('uses obstacle x/y', () => {
    const rock = { t: 'rock' as const, x: 50, y: 60, r: 12, variant: 2, shade: 0 };
    expect(rockCollisionCenter(rock)).toEqual({ x: 50, y: 60 });
  });
});
