/**
 * Drawing of the game world in world space: ground, houses, loot, rocks,
 * bullets, entities, walls, tree canopies, particles, the storm and damage numbers.
 *
 * Layering matters: tree canopies and walls are drawn above entities so
 * players can hide under trees.
 *
 * @packageDocumentation
 */

import { DEBUG_OBSTACLE_COLLISION } from '../config/env';
import { TAU } from '../config/constants';
import type { Camera } from '../core/camera';
import type { World } from '../core/world';
import { lootName } from '../entities/loot';
import { dist2 } from '../utils/math';
import type { House } from '../world/types';
import { drawEntity } from './entityRenderer';
import { drawLoot } from './lootRenderer';
import { drawObstacleCollisionDebug } from './obstacleCollisionDebug';
import { drawRock, rockInView } from './rockRenderer';
import { drawTree, treeSpriteInView } from './treeRenderer';

/** Options for {@link drawWorld}. */
export interface WorldRenderOptions {
  /** Hide the player and loot labels (used for the start-screen backdrop). */
  hidePlayer?: boolean;
}

/** Grid spacing on the ground, in pixels. */
const GRID = 100;

/**
 * Draws the grass, grid lines, decoration and the map border.
 *
 * @param ctx - Drawing context.
 * @param world - The game world.
 * @param cam - Camera.
 */
function drawGround(ctx: CanvasRenderingContext2D, world: World, cam: Camera): void {
  const mapSize = world.mapSize;
  ctx.fillStyle = '#26331f';
  ctx.fillRect(cam.x, cam.y, cam.width, cam.height);
  ctx.fillStyle = '#5a8a48';
  ctx.fillRect(0, 0, mapSize, mapSize);
  ctx.strokeStyle = 'rgba(0,0,0,.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const x0 = Math.max(0, Math.floor(cam.x / GRID) * GRID);
  const y0 = Math.max(0, Math.floor(cam.y / GRID) * GRID);
  for (let x = x0; x <= Math.min(mapSize, cam.x + cam.width); x += GRID) {
    ctx.moveTo(x, Math.max(0, cam.y));
    ctx.lineTo(x, Math.min(mapSize, cam.y + cam.height));
  }
  for (let y = y0; y <= Math.min(mapSize, cam.y + cam.height); y += GRID) {
    ctx.moveTo(Math.max(0, cam.x), y);
    ctx.lineTo(Math.min(mapSize, cam.x + cam.width), y);
  }
  ctx.stroke();
  for (const d of world.decor) {
    if (cam.inView(d.x, d.y, 4)) {
      ctx.fillStyle = d.c;
      ctx.fillRect(d.x, d.y, d.s, d.s);
    }
  }
  ctx.strokeStyle = '#1b2a14';
  ctx.lineWidth = 6;
  ctx.strokeRect(-3, -3, mapSize + 6, mapSize + 6);
}

/**
 * Draws a house floor with plank lines.
 *
 * @param ctx - Drawing context.
 * @param h - House footprint.
 */
function drawHouseFloor(ctx: CanvasRenderingContext2D, h: House): void {
  ctx.fillStyle = '#9c8273';
  ctx.fillRect(h.x, h.y, h.w, h.h);
  ctx.strokeStyle = 'rgba(0,0,0,.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = h.x + 30; x < h.x + h.w; x += 30) {
    ctx.moveTo(x, h.y);
    ctx.lineTo(x, h.y + h.h);
  }
  ctx.stroke();
}

/**
 * Draws name labels above loot within 110px of the player, skipping labels
 * that would overlap a closer item's label.
 *
 * @param ctx - Drawing context.
 * @param world - The game world.
 */
function drawLootLabels(ctx: CanvasRenderingContext2D, world: World): void {
  const p = world.player;
  ctx.font = '600 11px system-ui,sans-serif';
  ctx.textAlign = 'center';
  const near = world.loot
    .filter((it) => dist2(it.x, it.y, p.x, p.y) < 110 * 110)
    .sort((a, b) => dist2(a.x, a.y, p.x, p.y) - dist2(b.x, b.y, p.x, p.y));
  const boxes: [number, number, number][] = [];
  for (const it of near) {
    const t = lootName(it);
    const w = ctx.measureText(t).width;
    const bx = it.x - w / 2;
    const by = it.y - 32;
    if (boxes.some((q) => bx < q[0] + q[2] && bx + w > q[0] && by < q[1] + 14 && by + 14 > q[1]))
      continue;
    boxes.push([bx, by, w]);
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillText(t, it.x + 1, it.y - 21);
    ctx.fillStyle = '#fff';
    ctx.fillText(t, it.x, it.y - 22);
  }
}

/**
 * Draws the storm (purple tint outside the circle), the zone edge and the
 * dashed next-circle preview.
 *
 * @param ctx - Drawing context.
 * @param world - The game world.
 * @param cam - Camera.
 */
function drawStorm(ctx: CanvasRenderingContext2D, world: World, cam: Camera): void {
  const zone = world.zone;
  ctx.fillStyle = 'rgba(123,31,162,0.28)';
  ctx.beginPath();
  ctx.rect(cam.x - 50, cam.y - 50, cam.width + 100, cam.height + 100);
  ctx.arc(zone.x, zone.y, Math.max(0.1, zone.r), 0, TAU, true);
  ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(206,147,216,.95)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, Math.max(0.1, zone.r), 0, TAU);
  ctx.stroke();
  if (zone.state !== 'final') {
    ctx.setLineDash([18, 12]);
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(zone.tx, zone.ty, Math.max(0.1, zone.tr), 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/**
 * Draws the whole world. The context must already be transformed so that
 * world coordinates map to the screen through `cam`.
 *
 * @param ctx - Drawing context.
 * @param world - The game world.
 * @param cam - Camera used for culling.
 * @param opts - Render options.
 */
export function drawWorld(
  ctx: CanvasRenderingContext2D,
  world: World,
  cam: Camera,
  opts: WorldRenderOptions = {},
): void {
  const showPlayer = world.player.alive && !opts.hidePlayer;
  drawGround(ctx, world, cam);
  for (const h of world.houses) {
    if (cam.inView(h.x + h.w / 2, h.y + h.h / 2, Math.max(h.w, h.h))) drawHouseFloor(ctx, h);
  }
  for (const it of world.loot) if (cam.inView(it.x, it.y, 30)) drawLoot(ctx, it, world.gameTime);
  if (showPlayer) drawLootLabels(ctx, world);
  for (const o of world.obstacles) {
    if (o.t !== 'rock' || !rockInView(cam, o)) continue;
    drawRock(ctx, o);
  }
  for (const o of world.obstacles) {
    if (o.t !== 'tree' || !cam.inView(o.x, o.y, o.vr)) continue;
    drawTree(ctx, o, 'shadow');
  }
  ctx.lineCap = 'round';
  for (const b of world.bullets) {
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.022, b.y - b.vy * 0.022);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  for (const e of world.entities) {
    if (!e.alive || (e.isPlayer && !showPlayer)) continue;
    if (cam.inView(e.x, e.y, 60)) drawEntity(ctx, e, world.gameTime);
  }
  for (const o of world.obstacles) {
    if (o.t !== 'wall' || !cam.inView(o.x + o.w / 2, o.y + o.h / 2, Math.max(o.w, o.h))) continue;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(o.x + 4, o.y + 5, o.w, o.h);
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    ctx.strokeRect(o.x, o.y, o.w, o.h);
  }
  for (const o of world.obstacles) {
    // only draws the sprite layer if the tree's art might intersect the camera.
    // If that box doesn’t overlap the viewport, the tree is culled — drawTree is skipped.
    if (o.t !== 'tree' || !treeSpriteInView(cam, o)) continue;
    drawTree(ctx, o, 'sprite');
  }
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.flash ? p.size * (0.6 + p.life / p.max) : p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawStorm(ctx, world, cam);
  ctx.font = '800 16px system-ui,sans-serif';
  ctx.textAlign = 'center';
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.min(1, f.life * 2);
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillText(f.text, f.x + 1, f.y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  if (DEBUG_OBSTACLE_COLLISION) {
    drawObstacleCollisionDebug(ctx, world.obstacles, cam);
  }
}
