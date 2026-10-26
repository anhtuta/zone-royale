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
 * Trunk collision centre from a tree foot position (mapgen placement).
 *
 * @param footX - Foot X (bottom-centre of sprite).
 * @param footY - Foot Y.
 * @param r - Trunk collision radius.
 * @param variant - Sprite variant index.
 * @returns Circle centre (`collisionLiftR × r` above the foot).
 */
export function treeFootCollisionCenter(
  footX: number,
  footY: number,
  r: number,
  variant: number,
): WorldPoint {
  const lift = treeSpriteDef(variant).collisionLiftR * r;
  return { x: footX, y: footY - lift };
}

/**
 * Bottom-centre of the tree sprite in world space (includes catalog `drawOffsetX/Y`).
 *
 * @param tree - Tree obstacle (`tree.x`, `tree.y` = map anchor).
 * @returns Foot used for drawing and collision lift.
 */
export function treeSpriteFoot(tree: TreeObstacle): WorldPoint {
  const def = treeSpriteDef(tree.variant);
  return { x: tree.x + def.drawOffsetX, y: tree.y + def.drawOffsetY };
}

/**
 * Gameplay collision centre for a placed tree.
 *
 * @param tree - Tree obstacle.
 * @returns Circle centre used by {@link segmentObstacle} and movement resolution.
 */
export function treeCollisionCenter(tree: TreeObstacle): WorldPoint {
  const foot = treeSpriteFoot(tree);
  return treeFootCollisionCenter(foot.x, foot.y, tree.r, tree.variant);
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
