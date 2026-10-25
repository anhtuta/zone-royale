import { describe, expect, it } from 'vitest';
import {
  obstacleMapgenBaseRadius,
  rockSpriteDef,
  rockVisualBaseRadius,
  treeSpriteDef,
} from '../src/config/obstacleSprites';

describe('collision vs visual radius', () => {
  it('recovers baseR from scaled collision r', () => {
    const baseR = 26;
    const variant = 0;
    const scale = treeSpriteDef(variant).collisionRadiusScale;
    const collisionR = baseR * scale;
    expect(obstacleMapgenBaseRadius(collisionR, scale)).toBeCloseTo(baseR);
    const rockScale = rockSpriteDef(2).collisionRadiusScale;
    expect(rockVisualBaseRadius({ r: baseR * rockScale, variant: 2 })).toBeCloseTo(baseR);
  });
});
