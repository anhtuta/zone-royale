/**
 * Loads and caches obstacle WebP/PNG assets for rendering.
 *
 * @packageDocumentation
 */

import {
  normalizeVariantIndex,
  ROCK_SPRITES,
  TREE_SPRITES,
} from '../config/obstacleSprites';
import { USE_OBSTACLE_IMAGES } from '../config/env';

const rockImages: (HTMLImageElement | null)[] = ROCK_SPRITES.map(() => null);
const treeImages: (HTMLImageElement | null)[] = TREE_SPRITES.map(() => null);

let allLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * @param src - Bundled asset URL.
 * @param id - Catalog id for error messages.
 * @returns Loaded image element.
 */
function loadImage(src: string, id: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load obstacle sprite: ${id}`));
    img.src = src;
  });
}

/**
 * Preloads every rock and tree variant when {@link USE_OBSTACLE_IMAGES} is true.
 *
 * @returns Resolves when all images are decoded, or immediately when images are disabled.
 */
export function loadObstacleSprites(): Promise<void> {
  if (!USE_OBSTACLE_IMAGES) return Promise.resolve();
  if (allLoaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = Promise.all([
    ...ROCK_SPRITES.map(async (def, i) => {
      rockImages[i] = await loadImage(def.src, def.id);
    }),
    ...TREE_SPRITES.map(async (def, i) => {
      treeImages[i] = await loadImage(def.src, def.id);
    }),
  ]).then(() => {
    allLoaded = true;
  });

  return loadPromise;
}

/**
 * @returns `true` when every obstacle sprite finished loading (false while loading or when images are off).
 */
export function obstacleSpritesReady(): boolean {
  return USE_OBSTACLE_IMAGES && allLoaded;
}

/**
 * @param variant - Rock variant index from map data.
 * @returns Cached image, or `null` before load completes.
 */
export function getRockImage(variant: number): HTMLImageElement | null {
  if (!USE_OBSTACLE_IMAGES || !allLoaded) return null;
  const i = normalizeVariantIndex(variant, rockImages.length);
  return rockImages[i] ?? null;
}

/**
 * @param variant - Tree variant index from map data.
 * @returns Cached image, or `null` before load completes.
 */
export function getTreeImage(variant: number): HTMLImageElement | null {
  if (!USE_OBSTACLE_IMAGES || !allLoaded) return null;
  const i = normalizeVariantIndex(variant, treeImages.length);
  return treeImages[i] ?? null;
}
