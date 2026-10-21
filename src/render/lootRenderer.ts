/**
 * Drawing of loot items on the ground.
 *
 * @packageDocumentation
 */

import { TAU } from '../config/constants';
import { WEAPONS } from '../config/weapons';
import { lootColor, type LootItem } from '../entities/loot';
import { roundRect } from './draw';

/**
 * Draws one loot item with a pulsing glow and a gentle bob.
 *
 * @param ctx - Drawing context (world transform applied).
 * @param it - The item.
 * @param time - Match time in seconds (drives the animation).
 */
export function drawLoot(ctx: CanvasRenderingContext2D, it: LootItem, time: number): void {
  const bob = Math.sin(time * 3 + it.x * 0.05) * 2.5;
  ctx.save();
  ctx.translate(it.x, it.y + bob);
  const col = lootColor(it);
  ctx.globalAlpha = 0.25 + Math.sin(time * 4 + it.y) * 0.08;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(0, 0, it.kind === 'weapon' ? 22 : 16, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  if (it.kind === 'weapon') {
    const WS = WEAPONS[it.type];
    ctx.rotate(-0.45);
    ctx.fillStyle = col;
    roundRect(ctx, -WS.len * 0.7, -WS.w / 2 - 1, WS.len * 1.4, WS.w + 2, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#37474f';
    ctx.fillRect(-WS.len * 0.55, WS.w / 2, 7, 7);
    ctx.strokeRect(-WS.len * 0.55, WS.w / 2, 7, 7);
  } else if (it.kind === 'ammo') {
    ctx.fillStyle = col;
    roundRect(ctx, -8, -6, 16, 12, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(-5, -3, 2, 6);
    ctx.fillRect(-1, -3, 2, 6);
    ctx.fillRect(3, -3, 2, 6);
  } else if (it.kind === 'health') {
    ctx.fillStyle = '#fafafa';
    roundRect(ctx, -10, -10, 20, 20, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e53935';
    ctx.fillRect(-2.5, -7, 5, 14);
    ctx.fillRect(-7, -2.5, 14, 5);
  } else {
    ctx.fillStyle = '#42a5f5';
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(10, -6);
    ctx.quadraticCurveTo(9, 7, 0, 12);
    ctx.quadraticCurveTo(-9, 7, -10, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.fillRect(-1.5, -7, 3, 14);
  }
  ctx.restore();
}
