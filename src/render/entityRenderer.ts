/**
 * Drawing of combatants.
 *
 * @packageDocumentation
 */

import { TAU } from '../config/constants';
import { WEAPONS } from '../config/weapons';
import type { Entity } from '../entities/entity';
import { shade } from '../utils/color';
import { healthColor } from './draw';

/**
 * Draws a combatant: shadow, gun, hands, body, armor ring, hit flash and —
 * for bots — a name tag and health bar.
 *
 * @param ctx - Drawing context (world transform applied).
 * @param e - The entity.
 */
export function drawEntity(ctx: CanvasRenderingContext2D, e: Entity): void {
  const held = e.weapons[e.slot];
  const WS = held ? WEAPONS[held.type] : null;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(3, 5, e.r, e.r * 0.85, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.rotate(e.angle);
  if (WS) {
    ctx.fillStyle = '#263238';
    ctx.fillRect(e.r - 6, -WS.w / 2, WS.len + 6, WS.w);
    ctx.fillStyle = WS.color;
    ctx.fillRect(e.r - 2, -WS.w / 2 + 1.5, WS.len * 0.55, WS.w - 3);
  }
  ctx.fillStyle = shade(e.color, -30);
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(e.r - 2, 5, 5.5, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(e.r - 4, -6, 5.5, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = e.color;
  ctx.strokeStyle = e.isPlayer ? '#fff' : shade(e.color, -70);
  ctx.lineWidth = e.isPlayer ? 3 : 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, e.r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.beginPath();
  ctx.arc(-5, -6, e.r * 0.45, 0, TAU);
  ctx.fill();
  if (e.armor > 0) {
    ctx.strokeStyle = 'rgba(66,165,245,.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 4, -Math.PI / 2, -Math.PI / 2 + (TAU * e.armor) / 100);
    ctx.stroke();
  }
  if (e.hitFlash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (e.hitFlash / 0.12) * 0.7 + ')';
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  if (!e.isPlayer) {
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillText(e.name, e.x + 1, e.y - e.r - 13);
    ctx.fillStyle = '#fff';
    ctx.fillText(e.name, e.x, e.y - e.r - 14);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(e.x - 20, e.y - e.r - 10, 40, 5);
    ctx.fillStyle = healthColor(e.hp);
    ctx.fillRect(e.x - 20, e.y - e.r - 10, (40 * e.hp) / 100, 5);
  }
}
