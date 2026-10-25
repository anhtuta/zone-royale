/**
 * Obstacle sprite catalog: variant metadata and bundled asset URLs.
 * Image loading stays in `render/`; this module is data-only.
 *
 * Layout numbers are tuned in Phase 6 — use `VITE_DEBUG_OBSTACLE_COLLISION` to verify.
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
   * Multiplier on mapgen **base** radius for **collision only** (stored obstacle `r`).
   * Sprite size uses {@link obstacleMapgenBaseRadius}, not scaled `r`.
   */
  readonly collisionRadiusScale: number;
  /**
   * Fixed mapgen radius for this variant (same art ⇒ same `r`, `vr`, and draw size).
   */
  readonly mapgenBaseR: number;
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
   * Collision centre is `(footY − collisionLiftR × r)` where foot includes `drawOffsetY`.
   * Increase to move the circle **up** toward the trunk (typical range ~0.9–1.3 for tall sprites).
   */
  readonly collisionLiftR: number;
}

/** Default rock {@link mapgenBaseR} (midpoint of legacy `scatter` 24–48 range). */
export const DEFAULT_ROCK_MAPGEN_BASE_R = 36;

/** Default tree {@link mapgenBaseR} (midpoint of legacy `scatter` 20–28 range). */
export const DEFAULT_TREE_MAPGEN_BASE_R = 24;

/** Optional per-rock layout overrides for {@link rockLayout}. */
type RockTuning = Partial<
  Pick<
    RockSpriteDef,
    'heightMul' | 'drawOffsetX' | 'drawOffsetY' | 'collisionRadiusScale' | 'mapgenBaseR'
  >
>;

/** Optional per-tree layout overrides for {@link treeLayout}. */
type TreeTuning = Partial<
  Pick<
    TreeSpriteDef,
    | 'heightMul'
    | 'drawOffsetX'
    | 'drawOffsetY'
    | 'collisionRadiusScale'
    | 'collisionLiftR'
    | 'mapgenBaseR'
  >
>;

const rockLayout = (id: string, src: string, tuning: RockTuning = {}): RockSpriteDef => ({
  id,
  src,
  heightMul: tuning.heightMul ?? 2.2,
  anchor: 'center',
  drawOffsetX: tuning.drawOffsetX ?? 0,
  drawOffsetY: tuning.drawOffsetY ?? 0,
  collisionRadiusScale: tuning.collisionRadiusScale ?? 1,
  mapgenBaseR: tuning.mapgenBaseR ?? DEFAULT_ROCK_MAPGEN_BASE_R,
});

/** Ordered rock variants; index is stored on `RockObstacle.variant` in `world/types.ts`. */
export const ROCK_SPRITES: readonly RockSpriteDef[] = [
  rockLayout('foothill_6', foothill6Url, { heightMul: 2.35, collisionRadiusScale: 0.92 }),
  rockLayout('foothill_7', foothill7Url, { heightMul: 2.3, collisionRadiusScale: 0.9 }),
  rockLayout('sword_cake', swordCakeUrl, {
    heightMul: 2.55,
    drawOffsetY: -5,
    collisionRadiusScale: 0.86,
  }),
  rockLayout('anniversary_cake_6', anniversaryCakeUrl, {
    heightMul: 2.5,
    drawOffsetY: -4,
    collisionRadiusScale: 0.86,
  }),
];

const treeLayout = (id: string, src: string, tuning: TreeTuning = {}): TreeSpriteDef => ({
  id,
  src,
  heightMul: tuning.heightMul ?? 2.7,
  anchor: 'bottom-center',
  drawOffsetX: tuning.drawOffsetX ?? 0,
  drawOffsetY: tuning.drawOffsetY ?? 0,
  collisionRadiusScale: tuning.collisionRadiusScale ?? 1.05,
  collisionLiftR: tuning.collisionLiftR ?? 0.5,
  mapgenBaseR: tuning.mapgenBaseR ?? DEFAULT_TREE_MAPGEN_BASE_R,
});

/** Ordered tree variants; index is stored on `TreeObstacle.variant` in `world/types.ts`. */
export const TREE_SPRITES: readonly TreeSpriteDef[] = [
  treeLayout('bb_grove', bbGroveUrl, {
    heightMul: 3.05,
    drawOffsetY: -8,
    collisionLiftR: 1.3,
    collisionRadiusScale: 1.7,
  }),
  treeLayout('clashmas_2015', clashmas2015Url, {
    heightMul: 2.2,
    drawOffsetY: -10,
    collisionLiftR: 1.4,
    collisionRadiusScale: 1.2,
  }),
  treeLayout('clashmas_2024', clashmas2024Url, {
    heightMul: 2.4,
    drawOffsetY: -10,
    collisionLiftR: 1.6,
    collisionRadiusScale: 1.1,
  }),
  treeLayout('large_tree', largeTreeUrl, {
    heightMul: 2.85,
    drawOffsetY: -6,
    collisionLiftR: 1.3,
    collisionRadiusScale: 1.7,
  }),
  treeLayout('xmas_2025', xmas2025Url, {
    heightMul: 3.35,
    drawOffsetY: -12,
    collisionLiftR: 2.15,
    collisionRadiusScale: 1.08,
  }),
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

/**
 * Collision radius after mapgen scaling for a rock variant.
 *
 * @param baseR - Radius before `collisionRadiusScale`.
 * @param variant - Rock variant index.
 */
export function rockCollisionRadius(baseR: number, variant: number): number {
  return baseR * rockSpriteDef(variant).collisionRadiusScale;
}

/**
 * Collision radius after mapgen scaling for a tree variant.
 *
 * @param baseR - Radius before `collisionRadiusScale`.
 * @param variant - Tree variant index.
 */
export function treeCollisionRadius(baseR: number, variant: number): number {
  return baseR * treeSpriteDef(variant).collisionRadiusScale;
}

/**
 * Canopy visual radius from mapgen base radius (`vr` on {@link TreeObstacle}).
 * Independent of {@link collisionRadiusScale}.
 */
export const TREE_CANOPY_VR_MUL = 1.55;

/**
 * Mapgen base radius recovered from stored collision `r` (rocks or trees).
 *
 * @param collisionR - Stored gameplay radius after scaling.
 * @param collisionRadiusScale - Variant `collisionRadiusScale`.
 */
export function obstacleMapgenBaseRadius(
  collisionR: number,
  collisionRadiusScale: number,
): number {
  return collisionR / collisionRadiusScale;
}

/**
 * @param rock - Rock with scaled collision `r`.
 * @returns Base radius used for sprite `heightMul` (not collision).
 */
export function rockVisualBaseRadius(rock: { readonly r: number; readonly variant: number }): number {
  return obstacleMapgenBaseRadius(rock.r, rockSpriteDef(rock.variant).collisionRadiusScale);
}
