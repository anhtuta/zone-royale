/**
 * The top-right minimap.
 *
 * @packageDocumentation
 */

import { TAU } from '../config/constants';
import type { Camera } from '../core/camera';
import type { World } from '../core/world';
import { circleObstacleCollision } from '../world/obstacleGeometry';
import type { GameMap } from '../world/types';

/** Minimap size in CSS pixels. */
export const MINIMAP_SIZE = 180;

/** Margin from the screen edge. */
export const MINIMAP_MARGIN = 14;

/**
 * Pre-renders the static part of the minimap (grass, houses, walls, rocks,
 * trees) into an off-screen canvas, once per match.
 *
 * @param map - The generated map.
 * @returns A {@link MINIMAP_SIZE}² canvas.
 */
export function buildMinimapBase(
  map: Pick<GameMap, 'houses' | 'obstacles'>,
  mapSize: number,
): HTMLCanvasElement {
  const S = MINIMAP_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const m = canvas.getContext('2d');
  if (!m) return canvas;
  const k = S / mapSize;
  m.fillStyle = '#4c7a3e';
  m.fillRect(0, 0, S, S);
  for (const h of map.houses) {
    m.fillStyle = '#a1887f';
    m.fillRect(h.x * k, h.y * k, h.w * k, h.h * k);
  }
  for (const o of map.obstacles) {
    if (o.t === 'wall') {
      m.fillStyle = '#4e342e';
      m.fillRect(o.x * k, o.y * k, Math.max(1, o.w * k), Math.max(1, o.h * k));
    } else {
      const { x: cx, y: cy, r } = circleObstacleCollision(o);
      m.fillStyle = o.t === 'tree' ? '#2e5d27' : '#8d8d8d';
      m.beginPath();
      m.arc(
        cx * k,
        cy * k,
        Math.max(1.2, r * k * (o.t === 'tree' ? 1.4 : 1)),
        0,
        TAU,
      );
      m.fill();
    }
  }
  return canvas;
}

/**
 * Draws the minimap: static base, storm overlay, zone circles, the camera
 * rectangle and the player's position and facing.
 *
 * @param ctx - Drawing context (screen transform).
 * @param world - The game world.
 * @param base - Canvas from {@link buildMinimapBase}.
 * @param cam - Camera.
 * @returns The minimap's top-left corner and size, for laying out the kill feed.
 */
export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  world: World,
  base: CanvasImageSource,
  cam: Camera,
): { x: number; y: number; size: number } {
  const zone = world.zone;
  const player = world.player;
  const S = MINIMAP_SIZE;
  const mx = cam.width - S - MINIMAP_MARGIN;
  const my = MINIMAP_MARGIN;
  const k = S / world.mapSize;
  ctx.drawImage(base, mx, my, S, S);
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, S, S);
  ctx.clip();
  ctx.fillStyle = 'rgba(123,31,162,.38)';
  ctx.beginPath();
  ctx.rect(mx, my, S, S);
  ctx.arc(mx + zone.x * k, my + zone.y * k, Math.max(0.1, zone.r * k), 0, TAU, true);
  ctx.fill('evenodd');
  ctx.strokeStyle = '#e1bee7';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(mx + zone.x * k, my + zone.y * k, Math.max(0.1, zone.r * k), 0, TAU);
  ctx.stroke();
  if (zone.state !== 'final') {
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(mx + zone.tx * k, my + zone.ty * k, Math.max(0.1, zone.tr * k), 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + cam.x * k, my + cam.y * k, cam.width * k, cam.height * k);
  if (player.alive) {
    const px = mx + player.x * k;
    const py = my + player.y * k;
    ctx.fillStyle = '#42a5f5';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(player.angle) * 10, py + Math.sin(player.angle) * 10);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(mx, my, S, S);
  return { x: mx, y: my, size: S };
}
