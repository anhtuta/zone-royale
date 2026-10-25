/**
 * Tree drawing: optional PNG sprite or procedural Canvas art (see {@link USE_OBSTACLE_IMAGES}).
 *
 * @packageDocumentation
 */

import type { Camera } from '../core/camera';
import { USE_OBSTACLE_IMAGES } from '../config/env';
import { TAU } from '../config/constants';
import { shade } from '../utils/color';
import type { TreeObstacle } from '../world/types';

import treeUrl from '../assets/sprites/large_tree.png';

/** World height of the PNG tree sprite (`h = vr × this`). */
const SPRITE_HEIGHT_MUL = 2.7;
/** Fraction of `h` above the obstacle centre where the sprite top is drawn. */
const SPRITE_TOP_FRAC = 0.9;
/** Width/height fallback until the PNG finishes loading. */
const SPRITE_FALLBACK_ASPECT = 0.85;

let treeImage: HTMLImageElement | null = null;
let treeLoadPromise: Promise<void> | null = null;

/** Axis-aligned bounds of the tree canopy / sprite draw pass. */
export interface TreeSpriteBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * Loads the tree PNG when {@link USE_OBSTACLE_IMAGES} is enabled.
 *
 * @returns Resolves immediately when images are disabled or already loaded.
 */
export function loadTreeSprite(): Promise<void> {
  if (!USE_OBSTACLE_IMAGES) return Promise.resolve();
  if (treeImage) return Promise.resolve();
  if (treeLoadPromise) return treeLoadPromise;
  treeLoadPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      treeImage = img;
      resolve();
    };
    img.onerror = () => reject(new Error('Failed to load tree sprite'));
    img.src = treeUrl;
  });
  return treeLoadPromise;
}

/**
 * World-space AABB of the tree art drawn in the sprite pass (PNG or Canvas).
 *
 * @param tree - Tree obstacle.
 * @returns Rectangle used for culling and matching {@link drawTree} `'sprite'` layer.
 */
export function treeSpriteBounds(tree: TreeObstacle): TreeSpriteBounds {
  if (USE_OBSTACLE_IMAGES && treeImage) {
    const { left, top, w, h } = treeImageDrawRect(tree.x, tree.y, tree.vr);
    return { left, top, right: left + w, bottom: top + h };
  }
  return treeCanvasSpriteBounds(tree);
}

/**
 * Whether any part of the sprite-pass tree art may be visible.
 *
 * @param cam - Camera.
 * @param tree - Tree obstacle.
 * @returns `true` if the sprite layer should be drawn.
 */
export function treeSpriteInView(cam: Camera, tree: TreeObstacle): boolean {
  const b = treeSpriteBounds(tree);
  return cam.inViewAabb(b.left, b.top, b.right, b.bottom);
}

/**
 * @param x - Obstacle centre X.
 * @param y - Obstacle centre Y.
 * @param vr - Visual canopy radius.
 * @returns PNG draw rect (`left`, `top`, `w`, `h`).
 */
function treeImageDrawRect(
  x: number,
  y: number,
  vr: number,
): { left: number; top: number; w: number; h: number } {
  const h = vr * SPRITE_HEIGHT_MUL;
  const aspect =
    treeImage && treeImage.naturalHeight > 0
      ? treeImage.naturalWidth / treeImage.naturalHeight
      : SPRITE_FALLBACK_ASPECT;
  const w = h * aspect;
  return { left: x - w / 2, top: y - h * SPRITE_TOP_FRAC, w, h };
}

/**
 * @param tree - Tree obstacle.
 * @returns Bounds that cover procedural clumps and trunk.
 */
function treeCanvasSpriteBounds(tree: TreeObstacle): TreeSpriteBounds {
  const { x, y, r, vr } = tree;
  const edge = 1.12;
  const halfW = vr * 0.64 + vr * 0.62 * edge;
  const top = y - vr * 0.62 - vr * 0.78 * edge;
  const bottom = y + Math.max(r * 0.48, vr * 0.08);
  return { left: x - halfW, top, right: x + halfW, bottom };
}

/**
 * Draws a ground shadow (call before entities) or the full tree (call after entities).
 *
 * @param ctx - Drawing context in world space.
 * @param tree - Tree obstacle data.
 * @param layer - `'shadow'` under gameplay; `'sprite'` on top for cover.
 */
export function drawTree(
  ctx: CanvasRenderingContext2D,
  tree: TreeObstacle,
  layer: 'shadow' | 'sprite',
): void {
  const { x, y, vr } = tree;
  if (layer === 'shadow') {
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath();
    ctx.ellipse(x + 5, y + vr * 0.5, vr * 1.05, vr * 0.38, 0, 0, TAU);
    ctx.fill();
    return;
  }
  if (USE_OBSTACLE_IMAGES && treeImage) {
    const { left, top, w, h } = treeImageDrawRect(x, y, vr);
    ctx.drawImage(treeImage, left, top, w, h);
    return;
  }
  drawTreeCanvas(ctx, tree);
}

/**
 * Painterly three-clump tree drawn with Canvas (no image).
 *
 * @param ctx - Drawing context.
 * @param tree - Tree obstacle.
 */
function drawTreeCanvas(ctx: CanvasRenderingContext2D, tree: TreeObstacle): void {
  const { x, y, r, vr, shade: sh } = tree;
  const hi = shade('#d4f171', sh);
  const mid = shade('#6bc443', sh);
  const lo = shade('#2a6b24', sh);
  const deep = shade('#1e4d1a', sh);
  const trunkHi = shade('#8d6e4a', sh * 0.4);
  const trunk = shade('#5d4037', sh * 0.4);
  const trunkLo = shade('#3e2723', sh * 0.4);

  drawTrunk(ctx, x, y, r, trunkHi, trunk, trunkLo);

  fuzzyClump(ctx, x, y - vr * 0.62, vr * 0.78, hi, mid, lo, deep, 0.2);
  fuzzyClump(ctx, x - vr * 0.64, y - vr * 0.05, vr * 0.62, hi, mid, lo, deep, 1.7);
  fuzzyClump(ctx, x + vr * 0.64, y - vr * 0.05, vr * 0.62, hi, mid, lo, deep, 3.1);
}

/**
 * Short trunk with a flared, jagged base.
 *
 * @param ctx - Canvas context.
 * @param x - Base X.
 * @param y - Base Y.
 * @param r - Trunk scale from collision radius.
 * @param trunkHi - Lit bark.
 * @param trunk - Mid bark.
 * @param trunkLo - Shadow bark.
 */
function drawTrunk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  trunkHi: string,
  trunk: string,
  trunkLo: string,
): void {
  const tw = r * 0.48;
  const th = r * 0.72;
  const top = y - th * 0.15;
  const grad = ctx.createLinearGradient(x - tw, top, x + tw, y + r * 0.35);
  grad.addColorStop(0, trunkHi);
  grad.addColorStop(0.55, trunk);
  grad.addColorStop(1, trunkLo);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x - tw * 0.55, top);
  ctx.lineTo(x + tw * 0.55, top);
  ctx.lineTo(x + tw * 0.42, y + r * 0.08);
  ctx.lineTo(x + tw * 0.55, y + r * 0.38);
  ctx.lineTo(x, y + r * 0.48);
  ctx.lineTo(x - tw * 0.55, y + r * 0.38);
  ctx.lineTo(x - tw * 0.42, y + r * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/**
 * One leafy mass: bumpy outline, radial light from top-left, speckle highlights.
 *
 * @param ctx - Canvas context.
 * @param cx - Centre X.
 * @param cy - Centre Y.
 * @param rad - Base radius.
 * @param hi - Highlight green.
 * @param mid - Mid green.
 * @param lo - Shadow green.
 * @param deep - Deep crevice green.
 * @param bumpSeed - Phase for edge wobble (varies per clump).
 */
function fuzzyClump(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rad: number,
  hi: string,
  mid: string,
  lo: string,
  deep: string,
  bumpSeed: number,
): void {
  const g = ctx.createRadialGradient(
    cx - rad * 0.42,
    cy - rad * 0.45,
    rad * 0.05,
    cx + rad * 0.08,
    cy + rad * 0.05,
    rad * 1.05,
  );
  g.addColorStop(0, hi);
  g.addColorStop(0.38, mid);
  g.addColorStop(0.78, lo);
  g.addColorStop(1, deep);

  ctx.fillStyle = g;
  ctx.beginPath();
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * TAU;
    const wobble =
      1 + Math.sin(a * 6 + bumpSeed) * 0.09 + Math.cos(a * 4 + bumpSeed * 1.3) * 0.06;
    const px = cx + Math.cos(a) * rad * wobble;
    const py = cy + Math.sin(a) * rad * wobble * 0.9;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(18,48,16,.28)';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  for (let s = 0; s < 8; s++) {
    const a = bumpSeed + s * 0.85;
    const dist = rad * (0.25 + (s % 3) * 0.12);
    ctx.fillStyle = s % 2 === 0 ? hi : mid;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist * 0.85, rad * 0.07, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
