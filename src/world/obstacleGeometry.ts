/**
 * Pure helpers for obstacle positions used by simulation and debug render.
 *
 * @packageDocumentation
 */

import { treeSpriteDef } from '../config/obstacleSprites';
import type { CircleObstacle, RockObstacle, TreeObstacle } from './types';

/** World point. */
export interface WorldPoint {
  /** World X. */
  readonly x: number;
  /** World Y. */
  readonly y: number;
}

/**
 * Gameplay collision centre for a rock (`(x, y)` is already the circle centre).
 *
 * @param rock - Rock obstacle.
 * @returns Circle centre.
 */
export function rockCollisionCenter(rock: RockObstacle): WorldPoint {
  return { x: rock.x, y: rock.y };
}

/**
 * Gameplay collision centre for a tree.
 * `(tree.x, tree.y)` is the sprite **foot** (bottom-centre); the trunk circle sits
 * `collisionLiftR × r` above the foot (see {@link treeSpriteDef}).
 *
 * @param tree - Tree obstacle.
 * @returns Circle centre used by {@link segmentObstacle} and movement resolution.
 */
export function treeCollisionCenter(tree: TreeObstacle): WorldPoint {
  const def = treeSpriteDef(tree.variant);
  const lift = def.collisionLiftR * tree.r;
  return { x: tree.x, y: tree.y - lift };
}

/**
 * Collision centre for a circular obstacle (rock or tree).
 *
 * @param o - Rock or tree.
 * @returns Circle centre and radius `o.r`.
 */
export function circleObstacleCollision(o: CircleObstacle): WorldPoint & { readonly r: number } {
  if (o.t === 'rock') {
    const c = rockCollisionCenter(o);
    return { x: c.x, y: c.y, r: o.r };
  }
  const c = treeCollisionCenter(o);
  return { x: c.x, y: c.y, r: o.r };
}
