/**
 * Rock drawing: optional WebP sprites or procedural Canvas art (see {@link USE_OBSTACLE_IMAGES}).
 *
 * @packageDocumentation
 */

import type { Camera } from '../core/camera';
import { rockSpriteDef } from '../config/obstacleSprites';
import { USE_OBSTACLE_IMAGES } from '../config/env';
import { TAU } from '../config/constants';
import { shade } from '../utils/color';
import type { RockObstacle } from '../world/types';
import { getRockImage } from './obstacleSprites';

/** Width/height fallback until the image finishes loading. */
const SPRITE_FALLBACK_ASPECT = 1.1;

/** Axis-aligned bounds of the rock art (sprite or procedural). */
export interface RockSpriteBounds {
  /** Minimum X (world). */
  readonly left: number;
  /** Minimum Y (world). */
  readonly top: number;
  /** Maximum X (world). */
  readonly right: number;
  /** Maximum Y (world). */
  readonly bottom: number;
}

/**
 * World-space AABB of the rock draw pass.
 *
 * @param rock - Rock obstacle.
 * @returns Rectangle used for culling.
 */
export function rockSpriteBounds(rock: RockObstacle): RockSpriteBounds {
  const img = getRockImage(rock.variant);
  if (USE_OBSTACLE_IMAGES && img) {
    const { left, top, w, h } = rockImageDrawRect(rock, img);
    return { left, top, right: left + w, bottom: top + h };
  }
  const { x, y, r } = rock;
  return { left: x - r, top: y - r, right: x + r, bottom: y + r };
}

/**
 * Whether any part of the rock art may be visible.
 *
 * @param cam - Camera.
 * @param rock - Rock obstacle.
 * @returns `true` if the rock should be drawn.
 */
export function rockInView(cam: Camera, rock: RockObstacle): boolean {
  const b = rockSpriteBounds(rock);
  return cam.inViewAabb(b.left, b.top, b.right, b.bottom);
}

/**
 * @param rock - Rock obstacle.
 * @param img - Loaded variant image.
 * @returns Draw rect (`left`, `top`, `w`, `h`) with centre anchor at `(rock.x, rock.y)`.
 */
function rockImageDrawRect(
  rock: RockObstacle,
  img: HTMLImageElement,
): { left: number; top: number; w: number; h: number } {
  const def = rockSpriteDef(rock.variant);
  const h = rock.r * def.heightMul;
  const aspect =
    img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : SPRITE_FALLBACK_ASPECT;
  const w = h * aspect;
  const cx = rock.x + def.drawOffsetX;
  const cy = rock.y + def.drawOffsetY;
  return { left: cx - w / 2, top: cy - h / 2, w, h };
}

/**
 * Draws ground shadow and the rock body (call before entities).
 *
 * @param ctx - Drawing context in world space.
 * @param rock - Rock obstacle data.
 */
export function drawRock(ctx: CanvasRenderingContext2D, rock: RockObstacle): void {
  const { x, y, r } = rock;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.arc(x + 4, y + 6, r, 0, TAU);
  ctx.fill();

  const img = getRockImage(rock.variant);
  if (USE_OBSTACLE_IMAGES && img) {
    const { left, top, w, h } = rockImageDrawRect(rock, img);
    ctx.drawImage(img, left, top, w, h);
    return;
  }
  drawRockCanvas(ctx, rock);
}

/**
 * Procedural grey boulder (no image).
 *
 * @param ctx - Drawing context.
 * @param rock - Rock obstacle.
 */
function drawRockCanvas(ctx: CanvasRenderingContext2D, rock: RockObstacle): void {
  const { x, y, r, shade: sh } = rock;
  ctx.fillStyle = shade('#8a8f94', sh);
  ctx.strokeStyle = '#4a4f54';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.45, 0, TAU);
  ctx.fill();
}
