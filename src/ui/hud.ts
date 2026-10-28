/**
 * The in-game heads-up display drawn in screen space.
 *
 * @packageDocumentation
 */

import { PICK_RANGE } from '../config/constants';
import { AMMO_COLORS, AMMO_NAMES, WEAPONS } from '../config/weapons';
import type { Camera } from '../core/camera';
import type { MouseState } from '../core/input';
import type { World } from '../core/world';
import { lootName } from '../entities/loot';
import { healthColor, panel, roundRect } from '../render/draw';
import { countAlive } from '../systems/combat';
import { nearestLoot } from '../systems/inventory';
import { isOutsideZone, zoneDps, type Zone } from '../systems/zone';
import { formatTime } from '../utils/math';
import { drawKillFeed } from './killFeed';
import { drawMinimap, MINIMAP_MARGIN } from './minimap';

/** FPS and optional match clock passed into the HUD each frame. */
export interface FrameOverlayStats {
  /** Smoothed frames per second. */
  fps: number;
  /** Match elapsed seconds (`world.gameTime`); omitted on the menu before play. */
  matchSec?: number;
}

/**
 * Draws FPS and match elapsed time (bottom-right).
 *
 * @param ctx - Drawing context (screen space).
 * @param vw - Viewport width.
 * @param vh - Viewport height.
 * @param stats - Values for this frame.
 */
export function drawFrameStats(
  ctx: CanvasRenderingContext2D,
  vw: number,
  vh: number,
  stats: FrameOverlayStats,
): void {
  const fps = Math.round(stats.fps);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.font = '600 12px system-ui,sans-serif';
  ctx.fillStyle = '#9fb3d1';
  let y = vh - 14;
  if (stats.matchSec !== undefined) {
    ctx.fillText(formatTime(stats.matchSec), vw - 14, y);
    y -= 16;
  }
  ctx.fillText(fps + ' FPS', vw - 14, y);
}

/**
 * Text of the zone banner at the top of the screen.
 *
 * @param zone - The zone.
 * @returns E.g. `"Zone closes in 0:45"`, `"Zone shrinking  0:12"` or `"Final zone!"`.
 */
export function zoneStatusText(zone: Zone): string {
  if (zone.state === 'wait') return 'Zone closes in ' + formatTime(zone.timer);
  if (zone.state === 'shrink') return 'Zone shrinking  ' + formatTime(zone.timer);
  return 'Final zone!';
}

/**
 * Sub-line of the zone banner.
 *
 * @param zone - The zone.
 * @returns E.g. `"PHASE 2/6  •  2 dmg/s outside"`.
 */
export function zonePhaseText(zone: Zone): string {
  return (
    'PHASE ' +
      (zone.phase + 1) +
      '/' +
      zone.phases.length +
      '  •  ' +
      zoneDps(zone) +
      ' dmg/s outside'
  );
}

/**
 * Draws the alive/kills counters and the zone banner.
 *
 * @param ctx - Drawing context.
 * @param world - The game world.
 * @param vw - Viewport width.
 */
function drawTopBar(ctx: CanvasRenderingContext2D, world: World, vw: number): void {
  const alive = countAlive(world.entities);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  panel(ctx, 14, 14, 118, 46);
  panel(ctx, 140, 14, 100, 46);
  ctx.fillStyle = '#9fb3d1';
  ctx.font = '700 10px system-ui,sans-serif';
  ctx.fillText('ALIVE', 26, 27);
  ctx.fillText('KILLS', 152, 27);
  ctx.fillStyle = '#fff';
  ctx.font = '800 22px system-ui,sans-serif';
  ctx.fillText('👤 ' + alive, 24, 46);
  ctx.fillText('💀 ' + world.player.kills, 150, 46);
  const zone = world.zone;
  const zt = zoneStatusText(zone);
  ctx.font = '800 17px system-ui,sans-serif';
  const tw = ctx.measureText(zt).width + 40;
  panel(ctx, vw / 2 - tw / 2, 14, tw, 52);
  ctx.textAlign = 'center';
  ctx.fillStyle = zone.state === 'shrink' ? '#ce93d8' : '#fff';
  ctx.fillText(zt, vw / 2, 33);
  ctx.font = '600 11px system-ui,sans-serif';
  ctx.fillStyle = '#9fb3d1';
  ctx.fillText(zonePhaseText(zone), vw / 2, 53);
}

/**
 * Draws the health and armor bars (bottom left).
 *
 * @param ctx - Drawing context.
 * @param world - The game world.
 * @param vh - Viewport height.
 */
function drawVitals(ctx: CanvasRenderingContext2D, world: World, vh: number): void {
  const p = world.player;
  panel(ctx, 14, vh - 82, 260, 68);
  ctx.textAlign = 'left';
  ctx.font = '700 11px system-ui,sans-serif';
  ctx.fillStyle = '#9fb3d1';
  ctx.fillText('HEALTH', 26, vh - 68);
  ctx.fillText('ARMOR', 26, vh - 36);
  ctx.fillStyle = 'rgba(255,255,255,.1)';
  ctx.fillRect(84, vh - 76, 176, 16);
  ctx.fillRect(84, vh - 42, 176, 12);
  ctx.fillStyle = healthColor(p.hp);
  ctx.fillRect(84, vh - 76, (176 * p.hp) / 100, 16);
  ctx.fillStyle = '#42a5f5';
  ctx.fillRect(84, vh - 42, (176 * p.armor) / 100, 12);
  ctx.fillStyle = '#fff';
  ctx.font = '800 12px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.ceil(p.hp)), 172, vh - 67);
  ctx.fillText(String(Math.ceil(p.armor)), 172, vh - 35);
}

/**
 * Draws the two weapon slots (bottom centre) and the reload / ammo hint.
 *
 * @param ctx - Drawing context.
 * @param world - The game world.
 * @param vw - Viewport width.
 * @param vh - Viewport height.
 */
function drawWeaponSlots(
  ctx: CanvasRenderingContext2D,
  world: World,
  vw: number,
  vh: number,
): void {
  const p = world.player;
  const sw = 170;
  const sh = 62;
  const gap = 10;
  const sx = vw / 2 - sw - gap / 2;
  const sy = vh - sh - 16;
  for (let s = 0; s < 2; s++) {
    const w = p.weapons[s as 0 | 1];
    const x = sx + s * (sw + gap);
    const sel = s === p.slot;
    panel(ctx, x, sy, sw, sh);
    if (sel) {
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 2.5;
      roundRect(ctx, x, sy, sw, sh, 8);
      ctx.stroke();
    }
    ctx.textAlign = 'left';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.fillStyle = '#9fb3d1';
    ctx.fillText(String(s + 1), x + 10, sy + 14);
    if (!w) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.font = '600 13px system-ui,sans-serif';
      ctx.fillText('Empty', x + sw / 2, sy + sh / 2);
      continue;
    }
    const WS = WEAPONS[w.type];
    ctx.fillStyle = WS.color;
    ctx.font = '800 14px system-ui,sans-serif';
    ctx.fillText(WS.name, x + 24, sy + 15);
    ctx.fillStyle = '#fff';
    ctx.font = '800 24px system-ui,sans-serif';
    ctx.fillText(String(w.mag), x + 12, sy + 42);
    const mw = ctx.measureText(String(w.mag)).width;
    ctx.fillStyle = '#9fb3d1';
    ctx.font = '700 14px system-ui,sans-serif';
    ctx.fillText('/ ' + p.ammo[WS.ammo], x + 16 + mw, sy + 44);
    ctx.fillStyle = AMMO_COLORS[WS.ammo];
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(AMMO_NAMES[WS.ammo].toUpperCase(), x + sw - 10, sy + 44);
    if (sel && p.reloading > 0) {
      ctx.fillStyle = 'rgba(255,213,79,.25)';
      ctx.fillRect(x + 4, sy + sh - 8, sw - 8, 4);
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(x + 4, sy + sh - 8, (sw - 8) * (1 - p.reloading / p.reloadTotal), 4);
    }
  }
  ctx.textAlign = 'center';
  const cw = p.weapons[p.slot];
  if (p.reloading > 0) {
    ctx.font = '800 15px system-ui,sans-serif';
    ctx.fillStyle = '#ffd54f';
    ctx.fillText('RELOADING…', vw / 2, sy - 16);
  } else if (cw && cw.mag === 0) {
    ctx.font = '800 15px system-ui,sans-serif';
    ctx.fillStyle = '#ef5350';
    ctx.fillText(
      p.ammo[WEAPONS[cw.type].ammo] > 0 ? 'Press R to reload' : 'Out of ammo',
      vw / 2,
      sy - 16,
    );
  }
}

/**
 * Draws a full-screen radial vignette.
 *
 * @param ctx - Drawing context.
 * @param vw - Viewport width.
 * @param vh - Viewport height.
 * @param inner - Inner radius as a fraction of the smaller dimension.
 * @param edgeColor - Color at the screen edge (centre is transparent).
 * @param clearColor - Transparent variant of the color for the centre.
 */
function vignette(
  ctx: CanvasRenderingContext2D,
  vw: number,
  vh: number,
  inner: number,
  edgeColor: string,
  clearColor: string,
): void {
  const g = ctx.createRadialGradient(
    vw / 2,
    vh / 2,
    Math.min(vw, vh) * inner,
    vw / 2,
    vh / 2,
    Math.max(vw, vh) * 0.7,
  );
  g.addColorStop(0, clearColor);
  g.addColorStop(1, edgeColor);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);
}

/**
 * Draws the crosshair at the mouse cursor; its gap widens with weapon spread.
 *
 * @param ctx - Drawing context.
 * @param world - The game world.
 * @param mouse - Mouse state.
 */
function drawCrosshair(ctx: CanvasRenderingContext2D, world: World, mouse: MouseState): void {
  const cw = world.player.weapons[world.player.slot];
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  const cx = mouse.x;
  const cy = mouse.y;
  const sp = cw ? 6 + WEAPONS[cw.type].spread * 60 : 8;
  ctx.beginPath();
  ctx.moveTo(cx - sp - 7, cy);
  ctx.lineTo(cx - sp, cy);
  ctx.moveTo(cx + sp, cy);
  ctx.lineTo(cx + sp + 7, cy);
  ctx.moveTo(cx, cy - sp - 7);
  ctx.lineTo(cx, cy - sp);
  ctx.moveTo(cx, cy + sp);
  ctx.lineTo(cx, cy + sp + 7);
  ctx.stroke();
  ctx.fillStyle = '#ff5252';
  ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
}

/**
 * Draws the whole HUD: counters, zone banner, minimap, kill feed, vitals,
 * weapon slots, pickup prompt, toast, zone/low-health vignettes and crosshair.
 * After the player dies only the top bar, minimap, kill feed and an
 * "eliminated" banner are shown.
 *
 * @param ctx - Drawing context (screen transform).
 * @param world - The game world.
 * @param cam - Camera (viewport size and minimap rectangle).
 * @param minimapBase - Pre-rendered minimap.
 * @param mouse - Mouse state (crosshair position).
 * @param frameStats - Optional FPS and match clock.
 */
export function drawHUD(
  ctx: CanvasRenderingContext2D,
  world: World,
  cam: Camera,
  minimapBase: CanvasImageSource,
  mouse: MouseState,
  frameStats?: FrameOverlayStats,
): void {
  const vw = cam.width;
  const vh = cam.height;
  const p = world.player;
  drawTopBar(ctx, world, vw);
  const mm = drawMinimap(ctx, world, minimapBase, cam);
  drawKillFeed(ctx, world.killfeed, vw - MINIMAP_MARGIN, mm.y + mm.size + 22);
  if (!p.alive) {
    ctx.textAlign = 'center';
    ctx.font = '800 26px system-ui,sans-serif';
    ctx.fillStyle = '#ef5350';
    ctx.fillText('You were eliminated', vw / 2, vh / 2 - 80);
    if (frameStats) drawFrameStats(ctx, vw, vh, frameStats);
    return;
  }
  drawVitals(ctx, world, vh);
  drawWeaponSlots(ctx, world, vw, vh);
  const it = nearestLoot(world.loot, p.x, p.y, PICK_RANGE);
  if (it) {
    const txt = 'E  Pick up ' + lootName(it);
    ctx.font = '700 15px system-ui,sans-serif';
    const w = ctx.measureText(txt).width + 30;
    panel(ctx, vw / 2 - w / 2, vh / 2 + 60, w, 32);
    ctx.fillStyle = '#ffd54f';
    ctx.fillText(txt, vw / 2, vh / 2 + 77);
  }
  if (world.message.t > 0) {
    ctx.globalAlpha = Math.min(1, world.message.t);
    ctx.font = '800 18px system-ui,sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillText(world.message.text, vw / 2 + 1, 99);
    ctx.fillStyle = '#fff';
    ctx.fillText(world.message.text, vw / 2, 98);
    ctx.globalAlpha = 1;
  }
  if (isOutsideZone(world.zone, p.x, p.y)) {
    vignette(
      ctx,
      vw,
      vh,
      0.3,
      'rgba(123,31,162,' + (0.35 + Math.sin(world.gameTime * 6) * 0.1) + ')',
      'rgba(123,31,162,0)',
    );
    ctx.font = '800 20px system-ui,sans-serif';
    ctx.fillStyle = '#e1bee7';
    ctx.fillText('⚠ OUTSIDE THE ZONE — get to safety!', vw / 2, 128);
  }
  if (p.hp < 30) vignette(ctx, vw, vh, 0.35, 'rgba(200,0,0,.35)', 'rgba(200,0,0,0)');
  drawCrosshair(ctx, world, mouse);
  if (frameStats) drawFrameStats(ctx, vw, vh, frameStats);
  ctx.textBaseline = 'alphabetic';
}
