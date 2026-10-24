/**
 * Tree drawing: reference PNG sprite with a procedural three-clump fallback.
 *
 * @packageDocumentation
 */

import { TAU } from '../config/constants';
import { shade } from '../utils/color';
import type { TreeObstacle } from '../world/types';

import treeUrl from '../assets/sprites/large_tree.png';

let treeImage: HTMLImageElement | null = null;
let treeLoadPromise: Promise<void> | null = null;

/**
 * Loads the tree PNG once (safe to call multiple times).
 *
 * @returns Resolves when the sprite is ready for {@link drawTree}.
 */
export function loadTreeSprite(): Promise<void> {
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
  if (treeImage) {
    const h = vr * 2.7;
    const w = h * (treeImage.naturalWidth / treeImage.naturalHeight);
    const left = x - w / 2;
    const top = y - h * 0.9;
    ctx.drawImage(treeImage, left, top, w, h);
    return;
  }
  drawTreeProcedural(ctx, tree);
}

/**
 * Painterly three-clump tree when the PNG is not loaded yet.
 *
 * @param ctx - Drawing context.
 * @param tree - Tree obstacle.
 */
function drawTreeProcedural(ctx: CanvasRenderingContext2D, tree: TreeObstacle): void {
  const { x, y, r, vr, shade: sh } = tree;
  const hi = shade('#c5e86c', sh);
  const mid = shade('#5cb338', sh);
  const lo = shade('#2d6b27', sh);
  const trunk = shade('#6d4c2e', sh * 0.5);
  const trunkLo = shade('#3e2723', sh * 0.5);

  ctx.fillStyle = trunkLo;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.35, y + r * 0.2);
  ctx.lineTo(x - r * 0.28, y - r * 0.15);
  ctx.lineTo(x + r * 0.28, y - r * 0.15);
  ctx.lineTo(x + r * 0.35, y + r * 0.2);
  ctx.lineTo(x + r * 0.15, y + r * 0.45);
  ctx.lineTo(x - r * 0.12, y + r * 0.42);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = trunk;
  ctx.fillRect(x - r * 0.22, y - r * 0.35, r * 0.44, r * 0.55);

  foliageClump(ctx, x, y - vr * 0.55, vr * 0.72, hi, mid, lo);
  foliageClump(ctx, x - vr * 0.62, y - vr * 0.08, vr * 0.58, hi, mid, lo);
  foliageClump(ctx, x + vr * 0.62, y - vr * 0.08, vr * 0.58, hi, mid, lo);
}

/**
 * One soft leaf mass with a top-left highlight.
 *
 * @param ctx - Drawing context.
 * @param cx - Centre X.
 * @param cy - Centre Y.
 * @param rad - Radius.
 * @param hi - Highlight colour.
 * @param mid - Mid-tone.
 * @param lo - Shadow colour.
 */
function foliageClump(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rad: number,
  hi: string,
  mid: string,
  lo: string,
): void {
  const g = ctx.createRadialGradient(cx - rad * 0.35, cy - rad * 0.4, rad * 0.08, cx, cy, rad);
  g.addColorStop(0, hi);
  g.addColorStop(0.45, mid);
  g.addColorStop(1, lo);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,50,18,.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}
