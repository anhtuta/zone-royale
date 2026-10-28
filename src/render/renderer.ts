/**
 * Frame composition: sets up transforms, applies screen shake and draws the
 * world followed by the HUD.
 *
 * @packageDocumentation
 */

import type { Viewport } from '../core/canvas';
import type { MouseState } from '../core/input';
import type { World } from '../core/world';
import { drawFrameStats, drawHUD, type FrameOverlayStats } from '../ui/hud';
import { rand } from '../utils/random';
import { drawWorld } from './worldRenderer';

/**
 * Draws the slowly panning start-screen backdrop (no player, no HUD).
 *
 * @param vp - Viewport.
 * @param world - The backdrop world.
 * @param now - Timestamp in ms (drives the pan).
 * @param frameStats - Optional FPS (match clock omitted on menu).
 */
export function renderAttract(
  vp: Viewport,
  world: World,
  now: number,
  frameStats?: FrameOverlayStats,
): void {
  const ctx = vp.ctx;
  const cam = world.camera;
  const mapSize = world.mapSize;
  cam.x = mapSize / 2 - cam.width / 2 + Math.sin(now / 6000) * 600;
  cam.y = mapSize / 2 - cam.height / 2 + Math.cos(now / 7000) * 500;
  ctx.setTransform(vp.dpr, 0, 0, vp.dpr, -Math.round(cam.x) * vp.dpr, -Math.round(cam.y) * vp.dpr);
  drawWorld(ctx, world, cam, { hidePlayer: true });
  ctx.setTransform(vp.dpr, 0, 0, vp.dpr, 0, 0);
  if (frameStats) drawFrameStats(ctx, vp.width, vp.height, frameStats);
}

/**
 * Draws a gameplay frame: the world through a (shaken, pixel-snapped)
 * camera, then the HUD in screen space.
 *
 * @param vp - Viewport.
 * @param world - The game world.
 * @param minimapBase - Pre-rendered minimap.
 * @param mouse - Mouse state for the crosshair.
 * @param frameStats - Optional FPS and match clock.
 */
export function renderGame(
  vp: Viewport,
  world: World,
  minimapBase: CanvasImageSource,
  mouse: MouseState,
  frameStats?: FrameOverlayStats,
): void {
  const ctx = vp.ctx;
  const cam = world.camera;
  const shake = world.shake;
  const sx = shake > 0.3 ? rand(-shake, shake) : 0;
  const sy = shake > 0.3 ? rand(-shake, shake) : 0;
  const ox = Math.round(cam.x + sx);
  const oy = Math.round(cam.y + sy);
  ctx.setTransform(vp.dpr, 0, 0, vp.dpr, -ox * vp.dpr, -oy * vp.dpr);
  const savedX = cam.x;
  const savedY = cam.y;
  cam.x = ox;
  cam.y = oy;
  drawWorld(ctx, world, cam);
  cam.x = savedX;
  cam.y = savedY;
  ctx.setTransform(vp.dpr, 0, 0, vp.dpr, 0, 0);
  drawHUD(ctx, world, cam, minimapBase, mouse, frameStats);
}
