/**
 * House construction: four walls with two randomly placed doorways.
 *
 * @packageDocumentation
 */

import type { House, WallObstacle } from './types';
import { shuffled } from '../utils/random';

/** Wall thickness in pixels. */
export const WALL_THICKNESS = 16;

/** Doorway width in pixels. */
export const DOOR_WIDTH = 74;

/**
 * Creates a wall obstacle, ignoring degenerate (zero-size) pieces.
 *
 * @param out - Array that receives the wall.
 * @param x - Left edge.
 * @param y - Top edge.
 * @param w - Width.
 * @param h - Height.
 */
function addWall(out: WallObstacle[], x: number, y: number, w: number, h: number): void {
  if (w > 1 && h > 1) out.push({ t: 'wall', x, y, w, h });
}

/**
 * Adds a horizontal wall from `x1` to `x2`, optionally with a centred doorway.
 *
 * @param out - Array that receives the wall pieces.
 * @param x1 - Left end.
 * @param x2 - Right end.
 * @param y - Top edge of the wall.
 * @param door - Whether to leave a doorway in the middle.
 */
function horizontalWall(
  out: WallObstacle[],
  x1: number,
  x2: number,
  y: number,
  door: boolean,
): void {
  const T = WALL_THICKNESS;
  if (door) {
    const m = (x1 + x2) / 2;
    addWall(out, x1, y, m - DOOR_WIDTH / 2 - x1, T);
    addWall(out, m + DOOR_WIDTH / 2, y, x2 - m - DOOR_WIDTH / 2, T);
  } else addWall(out, x1, y, x2 - x1, T);
}

/**
 * Adds a vertical wall from `y1` to `y2`, optionally with a centred doorway.
 *
 * @param out - Array that receives the wall pieces.
 * @param y1 - Top end.
 * @param y2 - Bottom end.
 * @param x - Left edge of the wall.
 * @param door - Whether to leave a doorway in the middle.
 */
function verticalWall(out: WallObstacle[], y1: number, y2: number, x: number, door: boolean): void {
  const T = WALL_THICKNESS;
  if (door) {
    const m = (y1 + y2) / 2;
    addWall(out, x, y1, T, m - DOOR_WIDTH / 2 - y1);
    addWall(out, x, m + DOOR_WIDTH / 2, T, y2 - m - DOOR_WIDTH / 2);
  } else addWall(out, x, y1, T, y2 - y1);
}

/**
 * Builds the walls of a house. Two of the four sides (chosen at random) get a doorway.
 *
 * @param house - House footprint.
 * @returns The wall obstacles (6 pieces: 2 solid sides + 2 split sides).
 */
export function buildHouseWalls(house: House): WallObstacle[] {
  const { x, y, w, h } = house;
  const T = WALL_THICKNESS;
  const walls: WallObstacle[] = [];
  const sides = shuffled([0, 1, 2, 3]);
  const doors = [false, false, false, false];
  doors[sides[0] as number] = true;
  doors[sides[1] as number] = true;
  horizontalWall(walls, x, x + w, y, doors[0] as boolean);
  horizontalWall(walls, x, x + w, y + h - T, doors[1] as boolean);
  verticalWall(walls, y + T, y + h - T, x, doors[2] as boolean);
  verticalWall(walls, y + T, y + h - T, x + w - T, doors[3] as boolean);
  return walls;
}

/**
 * Tests whether two house footprints would be closer than `gap` pixels.
 *
 * @param a - First footprint.
 * @param b - Second footprint.
 * @param gap - Required clearance between houses.
 * @returns `true` if they overlap once expanded by `gap`.
 */
export function housesTooClose(a: House, b: House, gap: number): boolean {
  return (
    a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y
  );
}
