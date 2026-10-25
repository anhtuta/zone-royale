/**
 * Obstacle sprite catalog: variant metadata and bundled asset URLs.
 * Image loading stays in `render/`; this module is data-only.
 *
 * @packageDocumentation
 */

import foothill6Url from '../assets/sprites/obstacles/rocks/Foothill_6.webp';
import foothill7Url from '../assets/sprites/obstacles/rocks/Foothill_7.webp';
import swordCakeUrl from '../assets/sprites/obstacles/rocks/Sword_Cake.webp';
import anniversaryCakeUrl from '../assets/sprites/obstacles/rocks/6th_Anniversary_Cake.webp';
import bbGroveUrl from '../assets/sprites/obstacles/trees/BB_Grove.webp';
import clashmas2015Url from '../assets/sprites/obstacles/trees/Clashmas_Tree_2015.webp';
import clashmas2024Url from '../assets/sprites/obstacles/trees/Clashmas_Tree_2024.webp';
import largeTreeUrl from '../assets/sprites/obstacles/trees/Large_Tree.webp';
import xmas2025Url from '../assets/sprites/obstacles/trees/XmasTree_2025.webp';

/** Sprite anchor relative to obstacle `(x, y)`. */
export type ObstacleSpriteAnchor = 'center' | 'bottom-center';

/** Shared layout fields for bundled obstacle art. */
export interface ObstacleSpriteLayout {
  /** World sprite height as a multiple of scale radius (`r` or `vr`). */
  readonly heightMul: number;
  /** How `(x, y)` maps to the bitmap. */
  readonly anchor: ObstacleSpriteAnchor;
  /** Nudge draw position in world pixels (after anchor). */
  readonly drawOffsetX: number;
  /** Nudge draw position in world pixels (after anchor). */
  readonly drawOffsetY: number;
  /**
   * Multiplier on mapgen collision radius `r` for this variant (1 = default).
   * Applied at scatter time in a later phase; catalog default only for now.
   */
  readonly collisionRadiusScale: number;
}

/** One rock variant entry. */
export interface RockSpriteDef extends ObstacleSpriteLayout {
  /** Stable key for tests and tooling. */
  readonly id: string;
  /** Bundled asset URL (Vite). */
  readonly src: string;
  /** Rocks use collision-centre anchoring. */
  readonly anchor: 'center';
}

/** One tree variant entry. */
export interface TreeSpriteDef extends ObstacleSpriteLayout {
  /** Stable key for tests and tooling. */
  readonly id: string;
  /** Bundled asset URL (Vite). */
  readonly src: string;
  /** Trees use foot (bottom-centre) anchoring. */
  readonly anchor: 'bottom-center';
  /**
   * Collision centre is `(x, y − collisionLiftR × r)` where `(x, y)` is the foot.
   * Phase 1 keeps `0` until foot placement is tuned (Phase 2 / 6).
   */
  readonly collisionLiftR: number;
}

/** Defaults copied from [`treeRenderer`](../render/treeRenderer.ts) for `Large_Tree`. */
const LARGE_TREE_HEIGHT_MUL = 2.7;

const rockLayout = (id: string, src: string): RockSpriteDef => ({
  id,
  src,
  heightMul: 2.2,
  anchor: 'center',
  drawOffsetX: 0,
  drawOffsetY: 0,
  collisionRadiusScale: 1,
});

/** Ordered rock variants; index is stored on `RockObstacle.variant` in `world/types.ts`. */
export const ROCK_SPRITES: readonly RockSpriteDef[] = [
  rockLayout('foothill_6', foothill6Url),
  rockLayout('foothill_7', foothill7Url),
  rockLayout('sword_cake', swordCakeUrl),
  rockLayout('anniversary_cake_6', anniversaryCakeUrl),
];

const treeLayout = (
  id: string,
  src: string,
  overrides: Partial<Pick<TreeSpriteDef, 'heightMul' | 'collisionLiftR'>> = {},
): TreeSpriteDef => ({
  id,
  src,
  heightMul: overrides.heightMul ?? LARGE_TREE_HEIGHT_MUL,
  anchor: 'bottom-center',
  drawOffsetX: 0,
  drawOffsetY: 0,
  collisionRadiusScale: 1,
  collisionLiftR: overrides.collisionLiftR ?? 0,
});

/** Ordered tree variants; index is stored on `TreeObstacle.variant` in `world/types.ts`. */
export const TREE_SPRITES: readonly TreeSpriteDef[] = [
  treeLayout('bb_grove', bbGroveUrl),
  treeLayout('clashmas_2015', clashmas2015Url),
  treeLayout('clashmas_2024', clashmas2024Url),
  treeLayout('large_tree', largeTreeUrl),
  treeLayout('xmas_2025', xmas2025Url),
];

/**
 * @param variant - Raw variant index from map data.
 * @param count - Number of variants in the catalog.
 * @returns Index in `[0, count)`.
 */
export function normalizeVariantIndex(variant: number, count: number): number {
  if (count <= 0) return 0;
  let v = variant % count;
  if (v < 0) v += count;
  return v;
}

/**
 * @param variant - Rock variant index.
 * @returns Catalog entry (index normalized).
 */
export function rockSpriteDef(variant: number): RockSpriteDef {
  const i = normalizeVariantIndex(variant, ROCK_SPRITES.length);
  return ROCK_SPRITES[i]!;
}

/**
 * @param variant - Tree variant index.
 * @returns Catalog entry (index normalized).
 */
export function treeSpriteDef(variant: number): TreeSpriteDef {
  const i = normalizeVariantIndex(variant, TREE_SPRITES.length);
  return TREE_SPRITES[i]!;
}
