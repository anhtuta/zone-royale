import { describe, expect, it } from 'vitest';
import { USE_OBSTACLE_IMAGES } from '../src/config/env';
import {
  getRockImage,
  getTreeImage,
  loadObstacleSprites,
  obstacleSpritesReady,
} from '../src/render/obstacleSprites';

describe('loadObstacleSprites', () => {
  it('resolves immediately when VITE_USE_OBSTACLE_IMAGES is false', async () => {
    if (USE_OBSTACLE_IMAGES) return;
    await expect(loadObstacleSprites()).resolves.toBeUndefined();
    expect(obstacleSpritesReady()).toBe(false);
    expect(getRockImage(0)).toBeNull();
    expect(getTreeImage(0)).toBeNull();
  });
});
