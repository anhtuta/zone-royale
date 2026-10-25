/**
 * Procedural top-down combatants: human silhouette, two arms, two legs, walk cycle.
 *
 * @packageDocumentation
 */

import type { WeaponStats } from '../config/weapons';
import { shade } from '../utils/color';

const SKIN = '#c9a06b';
const PANTS = '#2c3e50';
const PANTS_SHADOW = '#1a252f';
const BOOT = '#141414';
const OUTLINE = 'rgba(0,0,0,.55)';

/**
 * No external assets; kept for a stable boot API.
 *
 * @returns Resolves immediately.
 */
export function loadCombatantSprites(): Promise<void> {
  return Promise.resolve();
}

/** Procedural art is always available. */
export function combatantSpritesReady(): boolean {
  return true;
}

/**
 * Draws a rotated human combatant at the current origin (translate + rotate applied).
 *
 * @param ctx - Canvas context.
 * @param isPlayer - Hero styling vs tintable bot.
 * @param tint - Bot jacket color.
 * @param vx - Velocity X (world px/s).
 * @param vy - Velocity Y (world px/s).
 * @param gameTime - Match time in seconds (walk phase).
 * @param phaseOffset - Per-entity offset so walk cycles do not line up.
 * @param weapon - Held weapon stats, or `null` if unarmed.
 */
export function drawCombatantSprite(
  ctx: CanvasRenderingContext2D,
  isPlayer: boolean,
  tint: string,
  vx: number,
  vy: number,
  gameTime: number,
  phaseOffset: number,
  weapon: WeaponStats | null,
): void {
  const speed = Math.hypot(vx, vy);
  const moving = speed > 18;
  const stride = moving ? Math.min(1, speed / 220) : 0;
  const phase = gameTime * (9 + stride * 5) + phaseOffset;
  const swing = Math.sin(phase) * 7 * stride;
  const spread = Math.cos(phase) * 5 * stride;
  const armSwing = Math.sin(phase) * 4 * stride;

  const jacket = isPlayer ? '#1e88e5' : tint;
  const jacketHi = isPlayer ? '#42a5f5' : shade(tint, 25);
  const jacketLo = isPlayer ? '#1565c0' : shade(tint, -35);

  // Idle feet/knees sit under each hip; walk offsets stack on top (stride 0 → no overlap).
  drawLeg(ctx, -5, -4, -5 + spread, 9 + swing, -5 + spread * 0.4, 2 + swing * 0.35);
  drawLeg(ctx, -5, 4, -5 - spread, 13 - swing, -5 - spread * 0.4, 8 - swing * 0.35);

  const offHandX = -2 + armSwing * 0.35;
  const offHandY = -13 - armSwing;
  const gunHandX = 11;
  const gunHandY = 7 + armSwing * 0.25;
  const gripX = 8;
  const gripY = 5;

  drawArm(ctx, 1, -5, offHandX, offHandY, jacketLo, SKIN, jacket);
  drawTorso(ctx, jacket, jacketHi, jacketLo, isPlayer);
  drawArm(ctx, 2, 5, gunHandX, gunHandY, jacketLo, SKIN, jacket);
  drawHead(ctx, isPlayer);
  drawGun(ctx, weapon, gripX, gripY, false);
  drawHand(ctx, offHandX, offHandY, -0.9, isPlayer, 'open');
  drawHand(ctx, gunHandX, gunHandY, 0.15, isPlayer, 'grip');
  if (isPlayer) {
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-1, 0, 10, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/**
 * @param ctx - Canvas context.
 * @param hx - Hip X.
 * @param hy - Hip Y.
 * @param fx - Foot X.
 * @param fy - Foot Y.
 * @param kx - Knee X.
 * @param ky - Knee Y.
 */
function drawLeg(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  fx: number,
  fy: number,
  kx: number,
  ky: number,
): void {
  strokeLimb(ctx, hx, hy, kx, ky, 5.5, PANTS_SHADOW);
  strokeLimb(ctx, kx, ky, fx, fy, 5, PANTS);
  ctx.fillStyle = BOOT;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(fx, fy, 4.2, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/**
 * @param ctx - Canvas context.
 * @param sx - Shoulder X.
 * @param sy - Shoulder Y.
 * @param hx - Hand X.
 * @param hy - Hand Y.
 * @param shadow - Upper arm color.
 * @param skin - Hand color.
 */
function drawArm(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  hx: number,
  hy: number,
  sleeve: string,
  skin: string,
  jacket: string,
): void {
  const mx = (sx + hx) / 2;
  const my = (sy + hy) / 2;
  strokeLimb(ctx, sx, sy, mx, my, 4.8, jacket);
  strokeLimb(ctx, sx, sy, mx, my, 4.2, sleeve);
  strokeLimb(ctx, mx, my, hx, hy, 3.6, skin);
}

/** Hand silhouette when drawing combatants. */
type HandPose = 'open' | 'grip';

/**
 * Draws a readable palm (and simple fingers) on top of limbs / weapon.
 *
 * @param ctx - Canvas context.
 * @param x - Palm centre X.
 * @param y - Palm centre Y.
 * @param angle - Palm rotation in radians.
 * @param isPlayer - Slightly larger hands for the hero.
 * @param pose - Open off-hand vs weapon grip.
 */
function drawHand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  isPlayer: boolean,
  pose: HandPose,
): void {
  const scale = isPlayer ? 1.22 : 1;
  const rx = (pose === 'grip' ? 4.6 : 4.2) * scale;
  const ry = (pose === 'grip' ? 4 : 3.6) * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = SKIN;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f0d4b0';
  ctx.beginPath();
  ctx.ellipse(-0.6, -0.5, rx * 0.55, ry * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  const fingerR = 1.05 * scale;
  const tips = pose === 'open' ? [-2.8, -0.6, 1.2, 2.6] : [-1.8, 0.2, 1.8];
  const tipY = pose === 'open' ? -ry - 0.5 : -ry - 0.2;
  for (const tipX of tips) {
    ctx.fillStyle = SKIN;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(tipX, tipY, fingerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * @param ctx - Canvas context.
 * @param jacket - Base fill.
 * @param hi - Highlight.
 * @param lo - Shadow.
 * @param isPlayer - Draw helmet stripe when true.
 */
function drawTorso(
  ctx: CanvasRenderingContext2D,
  jacket: string,
  hi: string,
  lo: string,
  isPlayer: boolean,
): void {
  ctx.fillStyle = lo;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 9.5, 11.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = jacket;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 8, 10.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.ellipse(-4, -3, 3.5, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PANTS_SHADOW;
  ctx.beginPath();
  ctx.roundRect(-7, 5, 14, 5, 2);
  ctx.fill();
  if (isPlayer) {
    ctx.fillStyle = '#eceff1';
    ctx.fillRect(-5, -9, 10, 2.5);
    ctx.fillStyle = '#42a5f5';
    ctx.fillRect(-4, -9.5, 8, 1.5);
  }
}

/**
 * @param ctx - Canvas context.
 * @param isPlayer - Helmet vs hood.
 */
function drawHead(ctx: CanvasRenderingContext2D, isPlayer: boolean): void {
  const hx = -12;
  ctx.fillStyle = isPlayer ? '#455a64' : '#546e7a';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(hx, 0, 6.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.ellipse(hx + 1.5, 0.5, 3.2, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!isPlayer) {
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(hx, 0, 6.2, -1.2, 1.2);
    ctx.stroke();
  }
}

/**
 * @param ctx - Canvas context.
 * @param WS - Weapon stats.
 * @param gx - Grip X.
 * @param gy - Grip Y.
 */
function drawGun(
  ctx: CanvasRenderingContext2D,
  WS: WeaponStats | null,
  gx: number,
  gy: number,
  drawGripHand: boolean,
): void {
  if (!WS) return;
  ctx.fillStyle = '#263238';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(gx - 2, gy - WS.w / 2 - 0.5, WS.len + 8, WS.w + 1, 1.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = WS.color;
  ctx.fillRect(gx + 1, gy - WS.w / 2 + 1, WS.len * 0.55, WS.w - 2);
  if (drawGripHand) {
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.arc(gx, gy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * @param ctx - Canvas context.
 * @param x1 - Start X.
 * @param y1 - Start Y.
 * @param x2 - End X.
 * @param y2 - End Y.
 * @param w - Stroke width.
 * @param color - Stroke color.
 */
function strokeLimb(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  w: number,
  color: string,
): void {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = w + 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
