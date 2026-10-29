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
 * Vertical lift in pixels from the tree model foot to the stored collision centre.
 *
 * @param tree - Tree obstacle.
 * @returns `collisionLiftR × r` for the variant.
 */
export function treeCollisionLiftPx(tree: TreeObstacle): number {
  return treeSpriteDef(tree.variant).collisionLiftR * tree.r;
}

/**
 * Ground point under the trunk collision circle (before catalog visual `drawOffset`).
 *
 * @param tree - Tree obstacle (`tree.x`, `tree.y` = collision centre).
 * @returns Model foot: `(x, y + lift)`.
 */
export function treeModelFoot(tree: TreeObstacle): WorldPoint {
  const lift = treeCollisionLiftPx(tree);
  return { x: tree.x, y: tree.y + lift };
}

/**
 * Trunk collision centre from a tree model foot (inverse of {@link treeModelFoot}).
 *
 * @param footX - Model foot X.
 * @param footY - Model foot Y.
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
 * Bottom-centre of the drawn sprite (model foot + catalog visual drawOffset).
 *
 * @param tree - Tree obstacle.
 * @returns Foot used for PNG/Canvas draw and shadow placement.
 */
export function treeSpriteFoot(tree: TreeObstacle): WorldPoint {
  const def = treeSpriteDef(tree.variant);
  const foot = treeModelFoot(tree);
  return { x: foot.x + def.drawOffsetX, y: foot.y + def.drawOffsetY };
}

/**
 * Gameplay collision centre for a placed tree (stored `(x, y)`).
 *
 * @param tree - Tree obstacle.
 * @returns Circle centre used by {@link segmentObstacle} and movement resolution.
 */
export function treeCollisionCenter(tree: TreeObstacle): WorldPoint {
  return { x: tree.x, y: tree.y };
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
