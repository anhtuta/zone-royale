import { describe, expect, it } from 'vitest';
import {
  rockCollisionRadius,
  rockSpriteDef,
  treeCollisionRadius,
  treeSpriteDef,
} from '../src/config/obstacleSprites';

describe('obstacleSprites catalog tuning', () => {
  it('rocks use conservative collision scale on wide cakes', () => {
    expect(rockSpriteDef(2).collisionRadiusScale).toBeLessThan(0.9);
    expect(rockCollisionRadius(30, 2)).toBeCloseTo(30 * rockSpriteDef(2).collisionRadiusScale);
  });

  it('trees lift collision centre above the foot', () => {
    for (let v = 0; v < 5; v++) {
      expect(treeSpriteDef(v).collisionLiftR).toBeGreaterThanOrEqual(0.9);
      expect(treeSpriteDef(v).collisionRadiusScale).toBeGreaterThanOrEqual(1.05);
    }
    expect(treeCollisionRadius(24, 3)).toBeCloseTo(24 * treeSpriteDef(3).collisionRadiusScale);
  });
});
