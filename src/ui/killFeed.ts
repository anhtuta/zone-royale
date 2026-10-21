/**
 * The kill feed under the minimap.
 *
 * @packageDocumentation
 */

import type { KillFeedEntry } from '../entities/effects';
import { roundRect } from '../render/draw';

/** Text and colors for one kill-feed line. */
export interface KillFeedLine {
  /** Line text. */
  text: string;
  /** Text color. */
  color: string;
  /** Background color (red if the player died, blue if the player got the kill). */
  background: string;
}

/**
 * Formats a kill-feed entry.
 *
 * @param f - The entry.
 * @returns Text and colors for drawing it.
 */
export function formatKillFeed(f: KillFeedEntry): KillFeedLine {
  if (f.sys !== undefined)
    return { text: '⚠ ' + f.sys, color: '#ce93d8', background: 'rgba(10,16,26,.6)' };
  const text = f.killer
    ? f.killer + '  [' + f.weapon + ']  ' + f.victim
    : f.victim + ' was consumed by the zone';
  const background = f.vp
    ? 'rgba(160,20,20,.7)'
    : f.kp
      ? 'rgba(30,90,160,.75)'
      : 'rgba(10,16,26,.6)';
  return { text, color: '#fff', background };
}

/**
 * Draws the kill feed right-aligned, starting at `top`. Lines fade out
 * during their last second.
 *
 * @param ctx - Drawing context (screen transform).
 * @param feed - Feed entries, oldest first.
 * @param right - Right edge X.
 * @param top - Y of the first line's centre.
 */
export function drawKillFeed(
  ctx: CanvasRenderingContext2D,
  feed: readonly KillFeedEntry[],
  right: number,
  top: number,
): void {
  ctx.textAlign = 'right';
  ctx.font = '600 13px system-ui,sans-serif';
  let ky = top;
  for (const f of feed) {
    ctx.globalAlpha = Math.min(1, f.t);
    const line = formatKillFeed(f);
    const w = ctx.measureText(line.text).width + 18;
    ctx.fillStyle = line.background;
    roundRect(ctx, right - w, ky - 12, w, 24, 6);
    ctx.fill();
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, right - 9, ky);
    ky += 28;
  }
  ctx.globalAlpha = 1;
}
