/**
 * Procedural map generation: houses, rocks, trees and ground decoration.
 *
 * @packageDocumentation
 */

import {
  ROCK_SPRITES,
  rockCollisionRadius,
  TREE_SPRITES,
  treeCollisionRadius,
} from '../config/obstacleSprites';
import { pick, rand, randInt } from '../utils/random';
import { circleFree, inHouse } from '../systems/collision';
import { treeFootCollisionCenter } from './obstacleGeometry';
import { buildHouseWalls, housesTooClose } from './houses';
import type { Decor, GameMap, House } from './types';

/** Map side length the base counts below were tuned for (medium preset). */
export const MAPGEN_REFERENCE_SIZE = 5000;

/** Houses to place at {@link MAPGEN_REFERENCE_SIZE}. */
export const HOUSE_COUNT = 10;
/** Rocks to place at {@link MAPGEN_REFERENCE_SIZE}. */
export const ROCK_COUNT = 45;
/** Trees to place at {@link MAPGEN_REFERENCE_SIZE}. */
export const TREE_COUNT = 140;
/** Decoration specks at {@link MAPGEN_REFERENCE_SIZE}. */
export const DECOR_COUNT = 500;
/** Minimum house clearance at {@link MAPGEN_REFERENCE_SIZE}. */
export const HOUSE_GAP = 160;

/** Scaled map-generation targets for a given world size. */
export interface MapGenCounts {
  /** Houses to attempt. */
  readonly houses: number;
  /** Rocks to attempt. */
  readonly rocks: number;
  /** Trees to attempt. */
  readonly trees: number;
  /** Ground decor specks. */
  readonly decor: number;
  /** Minimum clearance between house footprints. */
  readonly houseGap: number;
}

/**
 * Obstacle and decor counts scaled with map area so density stays near the
 * medium preset; house spacing scales with map side length.
 *
 * @param mapSize - World side length in pixels.
 */
export function mapGenCounts(mapSize: number): MapGenCounts {
  const linear = mapSize / MAPGEN_REFERENCE_SIZE;
  const area = linear * linear;
  return {
    houses: Math.max(1, Math.round(HOUSE_COUNT * area)),
    rocks: Math.max(0, Math.round(ROCK_COUNT * area)),
    trees: Math.max(0, Math.round(TREE_COUNT * area)),
    decor: Math.max(0, Math.round(DECOR_COUNT * area)),
    houseGap: Math.max(40, Math.round(HOUSE_GAP * linear)),
  };
}

/** Colors used for ground decoration. */
const DECOR_COLORS = [
  'rgba(255,255,255,.35)',
  'rgba(255,235,59,.45)',
  'rgba(0,0,0,.10)',
  'rgba(0,0,0,.08)',
  'rgba(255,138,128,.4)',
];

/**
 * Places up to `houseCount` non-overlapping houses and their walls.
 *
 * @param map - Map being built; houses and walls are appended to it.
 * @param mapSize - World side length in pixels.
 * @param houseCount - How many houses to attempt.
 * @param houseGap - Minimum clearance between house footprints.
 */
function placeHouses(
  map: GameMap,
  mapSize: number,
  houseCount: number,
  houseGap: number,
): void {
  for (let i = 0; i < houseCount; i++) {
    for (let tries = 0; tries < 80; tries++) {
      const w = randInt(220, 340);
      const h = randInt(200, 300);
      const x = rand(150, mapSize - 150 - w);
      const y = rand(150, mapSize - 150 - h);
      const candidate: House = { x, y, w, h };
      if (map.houses.some((o) => housesTooClose(candidate, o, houseGap))) continue;
      map.obstacles.push(...buildHouseWalls(candidate));
      map.houses.push(candidate);
      break;
    }
  }
}

/**
 * Scatters circular obstacles of one kind, keeping them out of houses and
 * away from other obstacles.
 *
 * @param map - Map being built.
 * @param mapSize - World side length in pixels.
 * @param count - How many to attempt.
 * @param rmin - Minimum radius.
 * @param rmax - Maximum radius.
 * @param kind - `'rock'` or `'tree'`.
 */
function scatter(
  map: GameMap,
  mapSize: number,
  count: number,
  rmin: number,
  rmax: number,
  kind: 'rock' | 'tree',
): void {
  const variantCount = kind === 'tree' ? TREE_SPRITES.length : ROCK_SPRITES.length;
  for (let i = 0; i < count; i++) {
    for (let tries = 0; tries < 40; tries++) {
      const variant = randInt(0, variantCount - 1);
      const baseR = rand(rmin, rmax);
      const r =
        kind === 'tree'
          ? treeCollisionRadius(baseR, variant)
          : rockCollisionRadius(baseR, variant);
      const x = rand(60, mapSize - 60);
      const y = rand(60, mapSize - 60);
      if (kind === 'tree') {
        // `(x, y)` is the sprite foot; clearance uses the trunk collision circle.
        const { x: cx, y: cy } = treeFootCollisionCenter(x, y, r, variant);
        if (
          inHouse(map.houses, x, y, r + 50) ||
          !circleFree(map.obstacles, cx, cy, r + 45, mapSize)
        )
          continue;
        map.obstacles.push({
          t: 'tree',
          x,
          y,
          r,
          vr: r * 1.55,
          variant,
          shade: rand(-12, 12),
        });
      } else {
        if (
          inHouse(map.houses, x, y, r + 50) ||
          !circleFree(map.obstacles, x, y, r + 45, mapSize)
        )
          continue;
        map.obstacles.push({
          t: 'rock',
          x,
          y,
          r,
          variant,
          shade: rand(-15, 15),
        });
      }
      break;
    }
  }
}

/**
 * Generates a fresh random map.
 *
 * @param mapSize - World width and height in pixels.
 * @returns Obstacles, houses and decoration for a new match.
 */
export function generateMap(mapSize: number): GameMap {
  const counts = mapGenCounts(mapSize);
  const map: GameMap = { obstacles: [], houses: [], decor: [] };
  placeHouses(map, mapSize, counts.houses, counts.houseGap);
  scatter(map, mapSize, counts.rocks, 24, 48, 'rock');
  scatter(map, mapSize, counts.trees, 20, 28, 'tree');
  const decor: Decor[] = map.decor;
  for (let i = 0; i < counts.decor; i++) {
    decor.push({
      x: rand(0, mapSize),
      y: rand(0, mapSize),
      s: rand(2, 4),
      c: pick(DECOR_COLORS),
    });
  }
  return map;
}
