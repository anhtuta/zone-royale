/**
 * Debug overlay for gameplay collision shapes (not sprite bounds).
 * With `VITE_DEBUG_OBSTACLE_COLLISION`, also marks map `(x, y)` anchors and tree feet.
 *
 * @packageDocumentation
 */

import { TAU } from '../config/constants';
import type { Camera } from '../core/camera';
import {
  circleObstacleCollision,
  treeSpriteFoot,
} from '../world/obstacleGeometry';
import type { Obstacle } from '../world/types';

/** Stroke for circular obstacles (rocks, trees). */
const CIRCLE_STROKE = 'rgba(255, 48, 200, 0.95)';
/** Stroke for wall AABBs. */
const WALL_STROKE = 'rgba(48, 200, 255, 0.95)';
/** Map scatter anchor `(x, y)` before catalog `drawOffset` (trees). */
const ANCHOR_STROKE = 'rgba(255, 220, 48, 0.95)';
/** Sprite foot after `drawOffset` (trees only). */
const FOOT_STROKE = 'rgba(48, 255, 200, 0.95)';
const LINE_WIDTH = 2;
const ANCHOR_ARM = 7;

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
    if (!cam.inView(cx, cy, r) && !cam.inView(o.x, o.y, ANCHOR_ARM)) continue;
    ctx.strokeStyle = CIRCLE_STROKE;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();

    ctx.setLineDash([]);
    drawCrosshair(ctx, o.x, o.y, ANCHOR_STROKE, ANCHOR_ARM);

    if (o.t === 'tree') {
      const foot = treeSpriteFoot(o);
      if (foot.x !== o.x || foot.y !== o.y) {
        ctx.strokeStyle = ANCHOR_STROKE;
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        ctx.moveTo(o.x, o.y);
        ctx.lineTo(foot.x, foot.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        drawCrosshair(ctx, foot.x, foot.y, FOOT_STROKE, ANCHOR_ARM - 2);
      }
    }
    ctx.setLineDash([6, 4]);
  }

  ctx.restore();
}

/**
 * Small + marker for a world point (debug overlay).
 *
 * @param ctx - Canvas context.
 * @param x - World X.
 * @param y - World Y.
 * @param stroke - Stroke colour.
 * @param arm - Half-length of each arm in pixels.
 */
function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  stroke: string,
  arm: number,
): void {
  ctx.strokeStyle = stroke;
  ctx.beginPath();
  ctx.moveTo(x - arm, y);
  ctx.lineTo(x + arm, y);
  ctx.moveTo(x, y - arm);
  ctx.lineTo(x, y + arm);
  ctx.stroke();
}
