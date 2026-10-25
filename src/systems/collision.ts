/**
 * Collision queries and resolution against the static map.
 *
 * Every function takes the obstacle / house arrays explicitly so it can be
 * unit-tested without a full game world.
 *
 * @packageDocumentation
 */

import { clamp, dist2 } from '../utils/math';
import { segmentCircle, segmentRect } from '../utils/geometry';
import { circleObstacleCollision } from '../world/obstacleGeometry';
import type { House, Obstacle } from '../world/types';

/** Anything with a position and a radius that can be pushed out of obstacles. */
export interface CircleBody {
  /** Centre X. */
  x: number;
  /** Centre Y. */
  y: number;
  /** Radius. */
  r: number;
}

/**
 * Finds the first obstacle hit along a segment.
 *
 * @param obstacles - Map obstacles.
 * @param x1 - Segment start X.
 * @param y1 - Segment start Y.
 * @param x2 - Segment end X.
 * @param y2 - Segment end Y.
 * @returns Parametric `t` of the closest hit in [0, 1], or `-1` if the segment is clear.
 */
export function segmentObstacle(
  obstacles: readonly Obstacle[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const minx = Math.min(x1, x2);
  const maxx = Math.max(x1, x2);
  const miny = Math.min(y1, y2);
  const maxy = Math.max(y1, y2);
  let best = -1;
  for (const o of obstacles) {
    let t: number;
    if (o.t === 'wall') {
      if (o.x > maxx || o.x + o.w < minx || o.y > maxy || o.y + o.h < miny) continue;
      t = segmentRect(x1, y1, x2, y2, o.x, o.y, o.w, o.h);
    } else {
      const { x: cx, y: cy, r } = circleObstacleCollision(o);
      if (cx - r > maxx || cx + r < minx || cy - r > maxy || cy + r < miny) continue;
      t = segmentCircle(x1, y1, x2, y2, cx, cy, r);
    }
    if (t >= 0 && (best < 0 || t < best)) best = t;
  }
  return best;
}

/**
 * Line-of-sight test between two points.
 *
 * @param obstacles - Map obstacles.
 * @param ax - First point X.
 * @param ay - First point Y.
 * @param bx - Second point X.
 * @param by - Second point Y.
 * @returns `true` if no obstacle blocks the straight line.
 */
export function lineOfSight(
  obstacles: readonly Obstacle[],
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean {
  return segmentObstacle(obstacles, ax, ay, bx, by) < 0;
}

/**
 * Checks that a circle fits inside the map without touching any obstacle.
 *
 * @param obstacles - Map obstacles.
 * @param x - Circle centre X.
 * @param y - Circle centre Y.
 * @param r - Circle radius.
 * @returns `true` if the space is free.
 */
export function circleFree(
  obstacles: readonly Obstacle[],
  x: number,
  y: number,
  r: number,
  mapSize: number,
): boolean {
  if (x < r || y < r || x > mapSize - r || y > mapSize - r) return false;
  for (const o of obstacles) {
    if (o.t === 'wall') {
      const cx = clamp(x, o.x, o.x + o.w);
      const cy = clamp(y, o.y, o.y + o.h);
      if (dist2(x, y, cx, cy) < r * r) return false;
    } else {
      const c = circleObstacleCollision(o);
      if (dist2(x, y, c.x, c.y) < (r + c.r) * (r + c.r)) return false;
    }
  }
  return true;
}

/**
 * Returns the house containing a point (with optional padding).
 *
 * @param houses - House footprints.
 * @param x - Point X.
 * @param y - Point Y.
 * @param pad - Extra margin around each house.
 * @returns The house, or `null`.
 */
export function inHouse(houses: readonly House[], x: number, y: number, pad: number): House | null {
  for (const h of houses) {
    if (x > h.x - pad && x < h.x + h.w + pad && y > h.y - pad && y < h.y + h.h + pad) return h;
  }
  return null;
}

/**
 * Pushes a circular body out of every obstacle it overlaps and clamps it
 * inside the map. Mutates `e`.
 *
 * @param obstacles - Map obstacles.
 * @param e - Body to resolve.
 */
export function resolveCollision(
  obstacles: readonly Obstacle[],
  e: CircleBody,
  mapSize: number,
): void {
  for (const o of obstacles) {
    if (o.t === 'wall') {
      if (e.x + e.r < o.x || e.x - e.r > o.x + o.w || e.y + e.r < o.y || e.y - e.r > o.y + o.h)
        continue;
      const cx = clamp(e.x, o.x, o.x + o.w);
      const cy = clamp(e.y, o.y, o.y + o.h);
      const dx = e.x - cx;
      const dy = e.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= e.r * e.r) continue;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        e.x = cx + (dx / d) * e.r;
        e.y = cy + (dy / d) * e.r;
      } else {
        // centre is inside the wall: exit through the nearest face
        const l = e.x - o.x;
        const r = o.x + o.w - e.x;
        const t = e.y - o.y;
        const b = o.y + o.h - e.y;
        const m = Math.min(l, r, t, b);
        if (m === l) e.x = o.x - e.r;
        else if (m === r) e.x = o.x + o.w + e.r;
        else if (m === t) e.y = o.y - e.r;
        else e.y = o.y + o.h + e.r;
      }
    } else {
      const { x: cx, y: cy, r: or } = circleObstacleCollision(o);
      const rr = or + e.r;
      const dx = e.x - cx;
      const dy = e.y - cy;
      if (Math.abs(dx) > rr || Math.abs(dy) > rr) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 0.01;
        e.x = cx + (dx / d) * rr;
        e.y = cy + (dy / d) * rr;
      }
    }
  }
  e.x = clamp(e.x, e.r, mapSize - e.r);
  e.y = clamp(e.y, e.r, mapSize - e.r);
}

/**
 * Pushes overlapping bodies apart symmetrically (each moves half the overlap).
 *
 * @param bodies - Bodies to separate; those with `alive === false` are skipped.
 */
export function separateBodies(bodies: readonly (CircleBody & { alive: boolean })[]): void {
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i] as CircleBody & { alive: boolean };
    if (!a.alive) continue;
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j] as CircleBody & { alive: boolean };
      if (!b.alive) continue;
      const rr = a.r + b.r;
      const d2 = dist2(a.x, a.y, b.x, b.y);
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 0.01;
        const push = (rr - d) / 2;
        const nx = (a.x - b.x) / d;
        const ny = (a.y - b.y) / d;
        a.x += nx * push;
        a.y += ny * push;
        b.x -= nx * push;
        b.y -= ny * push;
      }
    }
  }
}
