/**
 * Debug overlay for gameplay collision shapes (not sprite bounds).
 *
 * @packageDocumentation
 */

import { TAU } from '../config/constants';
import type { Camera } from '../core/camera';
import { circleObstacleCollision } from '../world/obstacleGeometry';
import type { Obstacle } from '../world/types';

/** Stroke for circular obstacles (rocks, trees). */
const CIRCLE_STROKE = 'rgba(255, 48, 200, 0.95)';
/** Stroke for wall AABBs. */
const WALL_STROKE = 'rgba(48, 200, 255, 0.95)';
const LINE_WIDTH = 2;

/**
 * Outlines each obstacle's collision geometry in world space.
 * Trees use {@link treeCollisionCenter} (same as {@link segmentObstacle}).
 *
 * @param ctx - Drawing context in world space.
 * @param obstacles - Map obstacles.
 * @param cam - Camera for culling.
 */
export function drawObstacleCollisionDebug(
  ctx: CanvasRenderingContext2D,
  obstacles: readonly Obstacle[],
  cam: Camera,
): void {
  ctx.save();
  ctx.lineWidth = LINE_WIDTH;
  ctx.setLineDash([6, 4]);

  for (const o of obstacles) {
    if (o.t === 'wall') {
      const pad = Math.max(o.w, o.h) / 2;
      if (!cam.inView(o.x + o.w / 2, o.y + o.h / 2, pad)) continue;
      ctx.strokeStyle = WALL_STROKE;
      ctx.strokeRect(o.x, o.y, o.w, o.h);
      continue;
    }
    const { x: cx, y: cy, r } = circleObstacleCollision(o);
    if (!cam.inView(cx, cy, r)) continue;
    ctx.strokeStyle = CIRCLE_STROKE;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
  }

  ctx.restore();
}
