import { describe, expect, it, afterEach } from 'vitest';
import {
  ROCK_SPRITES,
  TREE_CANOPY_VR_MUL,
  TREE_SPRITES,
  treeSpriteDef,
} from '../src/config/obstacleSprites';
import { createSeededRandom, setRandomSource } from '../src/utils/random';
import {
  DECOR_COUNT,
  generateMap,
  HOUSE_COUNT,
  MAPGEN_REFERENCE_SIZE,
  mapGenCounts,
  ROCK_COUNT,
  TREE_COUNT,
} from '../src/world/mapgen';
import type { Obstacle } from '../src/world/types';

afterEach(() => setRandomSource(Math.random));

describe('mapGenCounts', () => {
  it('matches base constants at the reference map size', () => {
    expect(mapGenCounts(MAPGEN_REFERENCE_SIZE)).toEqual({
      houses: HOUSE_COUNT,
      rocks: ROCK_COUNT,
      trees: TREE_COUNT,
      decor: DECOR_COUNT,
      houseGap: 160,
    });
  });

  it('scales with map area', () => {
    expect(mapGenCounts(10000)).toEqual({
      houses: HOUSE_COUNT * 4,
      rocks: ROCK_COUNT * 4,
      trees: TREE_COUNT * 4,
      decor: DECOR_COUNT * 4,
      houseGap: 320,
    });
  });

  it('keeps at least one house on very small maps', () => {
    expect(mapGenCounts(1000).houses).toBeGreaterThanOrEqual(1);
  });
});

function obstacleVariants(obstacles: readonly Obstacle[]): {
  rocks: number[];
  trees: number[];
} {
  const rocks: number[] = [];
  const trees: number[] = [];
  for (const o of obstacles) {
    if (o.t === 'rock') rocks.push(o.variant);
    else if (o.t === 'tree') trees.push(o.variant);
  }
  return { rocks, trees };
}

describe('generateMap', () => {
  it('assigns in-range variants and repeats for the same seed', () => {
    setRandomSource(createSeededRandom(4242));
    const a = obstacleVariants(generateMap(800).obstacles);
    setRandomSource(createSeededRandom(4242));
    const b = obstacleVariants(generateMap(800).obstacles);
    expect(a).toEqual(b);
    expect(a.rocks.length).toBeGreaterThan(0);
    expect(a.trees.length).toBeGreaterThan(0);
    for (const v of a.rocks) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(ROCK_SPRITES.length);
    }
    for (const v of a.trees) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(TREE_SPRITES.length);
    }
  });

  it('decouples tree vr from collision radius scale', () => {
    setRandomSource(createSeededRandom(9001));
    const trees = generateMap(1200).obstacles.filter((o) => o.t === 'tree');
    expect(trees.length).toBeGreaterThan(0);
    for (const tree of trees) {
      if (tree.t !== 'tree') continue;
      const scale = treeSpriteDef(tree.variant).collisionRadiusScale;
      expect(tree.r / tree.vr).toBeCloseTo(scale / TREE_CANOPY_VR_MUL, 5);
      expect(tree.vr / tree.r).not.toBeCloseTo(TREE_CANOPY_VR_MUL, 2);
    }
  });
});
