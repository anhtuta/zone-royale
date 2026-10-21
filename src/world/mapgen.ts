/**
 * Procedural map generation: houses, rocks, trees and ground decoration.
 *
 * @packageDocumentation
 */

import { MAP_SIZE } from '../config/constants';
import { pick, rand, randInt } from '../utils/random';
import { circleFree, inHouse } from '../systems/collision';
import { buildHouseWalls, housesTooClose } from './houses';
import type { Decor, GameMap, House, Obstacle } from './types';

/** Number of houses the generator tries to place. */
export const HOUSE_COUNT = 10;
/** Number of rocks the generator tries to place. */
export const ROCK_COUNT = 45;
/** Number of trees the generator tries to place. */
export const TREE_COUNT = 140;
/** Number of decoration specks. */
export const DECOR_COUNT = 500;
/** Minimum clearance between two houses. */
const HOUSE_GAP = 160;

/** Colors used for ground decoration. */
const DECOR_COLORS = [
  'rgba(255,255,255,.35)',
  'rgba(255,235,59,.45)',
  'rgba(0,0,0,.10)',
  'rgba(0,0,0,.08)',
  'rgba(255,138,128,.4)',
];

/**
 * Places up to {@link HOUSE_COUNT} non-overlapping houses and their walls.
 *
 * @param map - Map being built; houses and walls are appended to it.
 */
function placeHouses(map: GameMap): void {
  for (let i = 0; i < HOUSE_COUNT; i++) {
    for (let tries = 0; tries < 80; tries++) {
      const w = randInt(220, 340);
      const h = randInt(200, 300);
      const x = rand(150, MAP_SIZE - 150 - w);
      const y = rand(150, MAP_SIZE - 150 - h);
      const candidate: House = { x, y, w, h };
      if (map.houses.some((o) => housesTooClose(candidate, o, HOUSE_GAP))) continue;
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
 * @param count - How many to attempt.
 * @param rmin - Minimum radius.
 * @param rmax - Maximum radius.
 * @param kind - `'rock'` or `'tree'`.
 */
function scatter(
  map: GameMap,
  count: number,
  rmin: number,
  rmax: number,
  kind: 'rock' | 'tree',
): void {
  for (let i = 0; i < count; i++) {
    for (let tries = 0; tries < 40; tries++) {
      const r = rand(rmin, rmax);
      const x = rand(60, MAP_SIZE - 60);
      const y = rand(60, MAP_SIZE - 60);
      if (inHouse(map.houses, x, y, r + 50) || !circleFree(map.obstacles, x, y, r + 45)) continue;
      const o: Obstacle =
        kind === 'tree'
          ? { t: 'tree', x, y, r, vr: r * 1.55, shade: rand(-12, 12) }
          : { t: 'rock', x, y, r, shade: rand(-15, 15) };
      map.obstacles.push(o);
      break;
    }
  }
}

/**
 * Generates a fresh random map.
 *
 * @returns Obstacles, houses and decoration for a new match.
 */
export function generateMap(): GameMap {
  const map: GameMap = { obstacles: [], houses: [], decor: [] };
  placeHouses(map);
  scatter(map, ROCK_COUNT, 24, 48, 'rock');
  scatter(map, TREE_COUNT, 20, 28, 'tree');
  const decor: Decor[] = map.decor;
  for (let i = 0; i < DECOR_COUNT; i++) {
    decor.push({
      x: rand(0, MAP_SIZE),
      y: rand(0, MAP_SIZE),
      s: rand(2, 4),
      c: pick(DECOR_COLORS),
    });
  }
  return map;
}
