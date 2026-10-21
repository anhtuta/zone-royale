/**
 * Low-level Canvas 2D drawing helpers shared by world and UI renderers.
 *
 * @packageDocumentation
 */

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
