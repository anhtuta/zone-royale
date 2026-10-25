/**
 * Tree drawing: optional WebP sprites or procedural Canvas art (see {@link USE_OBSTACLE_IMAGES}).
 *
 * @packageDocumentation
 */

import type { Camera } from '../core/camera';
import { treeSpriteDef } from '../config/obstacleSprites';
import { USE_OBSTACLE_IMAGES } from '../config/env';
import { TAU } from '../config/constants';
import { shade } from '../utils/color';
import type { TreeObstacle } from '../world/types';
import { getTreeImage, loadObstacleSprites } from './obstacleSprites';

/** Width/height fallback until the image finishes loading. */
const SPRITE_FALLBACK_ASPECT = 0.85;
/**
 * Downward reach of procedural side clumps as a fraction of `vr`
 * (`cy = y − 0.05·vr`, `rad = 0.62·vr`, outline `sin × wobble × 0.9`).
 */
const PROC_CANOPY_BOTTOM_FRAC = 0.592;

/** Axis-aligned bounds of the tree canopy / sprite draw pass. */
export interface TreeSpriteBounds {
  /** Minimum X (world). */
  readonly left: number;
  /** Minimum Y (world). */
  readonly top: number;
  /** Maximum X (world). */
  readonly right: number;
  /** Maximum Y (world). */
  readonly bottom: number;
}

/**
 * @deprecated Use {@link loadObstacleSprites} from `./obstacleSprites`.
 * @returns Same promise as {@link loadObstacleSprites}.
 */
export function loadTreeSprite(): Promise<void> {
  return loadObstacleSprites();
}

/**
 * Sprite draw rect with bottom-centre anchor at the tree foot (`tree.x`, `tree.y`).
 *
 * @param tree - Tree obstacle (foot position).
 * @param aspect - Bitmap width / height.
 * @returns Axis-aligned draw rect in world space.
 */
export function treeSpriteDrawRect(
  tree: TreeObstacle,
  aspect: number,
): { left: number; top: number; w: number; h: number } {
  const def = treeSpriteDef(tree.variant);
  const h = tree.vr * def.heightMul;
  const w = h * aspect;
  const footX = tree.x + def.drawOffsetX;
  const footY = tree.y + def.drawOffsetY;
  return { left: footX - w / 2, top: footY - h, w, h };
}

/**
 * World-space AABB of the tree art drawn in the sprite pass (PNG or Canvas).
 *
 * @param tree - Tree obstacle.
 * @returns Rectangle used for culling and matching {@link drawTree} `'sprite'` layer.
 */
export function treeSpriteBounds(tree: TreeObstacle): TreeSpriteBounds {
  const img = getTreeImage(tree.variant);
  if (USE_OBSTACLE_IMAGES && img) {
    const aspect =
      img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : SPRITE_FALLBACK_ASPECT;
    const { left, top, w, h } = treeSpriteDrawRect(tree, aspect);
    return { left, top, right: left + w, bottom: top + h };
  }
  return treeCanvasSpriteBounds(tree);
}

/**
 * Whether any part of the tree art (or foot shadow) may be visible.
 *
 * @param cam - Camera.
 * @param tree - Tree obstacle.
 * @returns `true` if the tree should be drawn.
 */
export function treeSpriteInView(cam: Camera, tree: TreeObstacle): boolean {
  const b = treeSpriteBounds(tree);
  const shadowPad = tree.vr * 0.5;
  return cam.inViewAabb(
    b.left,
    b.top,
    b.right,
    Math.max(b.bottom, tree.y + shadowPad),
  );
}

/**
 * @param tree - Tree obstacle.
 * @param img - Loaded variant image.
 * @returns PNG draw rect (`left`, `top`, `w`, `h`).
 */
function treeImageDrawRect(
  tree: TreeObstacle,
  img: HTMLImageElement,
): { left: number; top: number; w: number; h: number } {
  const aspect =
    img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : SPRITE_FALLBACK_ASPECT;
  return treeSpriteDrawRect(tree, aspect);
}

/**
 * @param tree - Tree obstacle (foot at `(x, y)`).
 * @returns Bounds that cover procedural clumps and trunk.
 */
function treeCanvasSpriteBounds(tree: TreeObstacle): TreeSpriteBounds {
  const { x, y, r, vr } = tree;
  const edge = 1.12;
  const halfW = vr * 0.64 + vr * 0.62 * edge;
  const top = y - vr * 0.62 - vr * 0.78 * edge;
  const bottom = y + Math.max(r * 0.48, vr * PROC_CANOPY_BOTTOM_FRAC) * edge;
  return { left: x - halfW, top, right: x + halfW, bottom };
}

/**
 * Draws a ground shadow (call before entities) or the full tree (call after entities).
 *
 * @param ctx - Drawing context in world space.
 * @param tree - Tree obstacle data (`x`, `y` = foot).
 * @param layer - `'shadow'` under gameplay; `'sprite'` on top for cover.
 */
export function drawTree(
  ctx: CanvasRenderingContext2D,
  tree: TreeObstacle,
  layer: 'shadow' | 'sprite',
): void {
  const { vr } = tree;
  const def = treeSpriteDef(tree.variant);
  const footX = tree.x + def.drawOffsetX;
  const footY = tree.y + def.drawOffsetY;

  if (layer === 'shadow') {
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath();
    ctx.ellipse(
      footX + def.shadowOffsetX,
      footY + def.shadowOffsetY,
      vr * def.shadowRadiusXMul,
      vr * def.shadowRadiusYMul,
      0,
      0,
      TAU,
    );
    ctx.fill();
    return;
  }

  const img = getTreeImage(tree.variant);
  if (USE_OBSTACLE_IMAGES && img) {
    const { left, top, w, h } = treeImageDrawRect(tree, img);
    ctx.drawImage(img, left, top, w, h);
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
 * Short trunk with a flared, jagged base at the foot.
 *
 * @param ctx - Canvas context.
 * @param x - Foot X.
 * @param y - Foot Y.
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
