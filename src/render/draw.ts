/**
 * Low-level Canvas 2D drawing helpers shared by world and UI renderers.
 *
 * @packageDocumentation
 */

import { TAU } from '../config/constants';

/** Peak opacity at the centre of soft ground shadows (rocks, trees, entities). */
export const GROUND_SHADOW_CENTER_ALPHA = 0.9;

/**
 * Normalized radius (0–1) where the shadow is still mostly opaque before fading to the edge.
 */
export const GROUND_SHADOW_CORE_STOP = 0.7;

/**
 * Draws a soft elliptical ground shadow via radial gradient (no `filter` / `shadowBlur`).
 *
 * @param ctx - Drawing context in the target space (world or already translated).
 * @param cx - Ellipse centre X.
 * @param cy - Ellipse centre Y.
 * @param rx - Horizontal radius.
 * @param ry - Vertical radius.
 */
export function drawSoftGroundShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): void {
  if (rx <= 0 || ry <= 0) return;
  const peak = GROUND_SHADOW_CENTER_ALPHA;
  const core = GROUND_SHADOW_CORE_STOP;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(0,0,0,${peak})`);
  g.addColorStop(core, `rgba(0,0,0,${peak * 0.55})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/**
 * Adds a rounded-rectangle path to the context (does not fill or stroke).
 *
 * @param ctx - Drawing context.
 * @param x - Left.
 * @param y - Top.
 * @param w - Width.
 * @param h - Height.
 * @param r - Corner radius.
 */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Draws a translucent dark HUD panel with a faint blue border.
 *
 * @param ctx - Drawing context.
 * @param x - Left.
 * @param y - Top.
 * @param w - Width.
 * @param h - Height.
 */
export function panel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = 'rgba(10,16,26,.68)';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,160,220,.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/**
 * Color for a health bar.
 *
 * @param hp - Health 0..100.
 * @returns Green above 50, amber above 25, otherwise red.
 */
export function healthColor(hp: number): string {
  return hp > 50 ? '#66bb6a' : hp > 25 ? '#ffca28' : '#ef5350';
}
