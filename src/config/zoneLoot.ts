/**
 * Safe-zone ammunition supply floors and placement tuning.
 *
 * @packageDocumentation
 */

import { DEFAULT_MATCH_SETTINGS } from './matchSettings';
import type { AmmoType } from './weapons';

/** Map size used to scale per-family minimum ground ammo (`5000` = medium preset). */
export const REFERENCE_MAP_SIZE = DEFAULT_MATCH_SETTINGS.mapSize;

/** Minimum ammo boxes per family on the ground at {@link REFERENCE_MAP_SIZE}. */
export const ZONE_LOOT_BASE_FLOOR: Readonly<Record<AmmoType, number>> = {
  light: 4,
  shells: 2,
  medium: 3,
  heavy: 2,
};

/** Inset from the safe-zone edge when sampling supply drop positions. */
export const ZONE_LOOT_EDGE_MARGIN = 80;

/** Placement attempts per box before skipping that box. */
export const ZONE_LOOT_PLACEMENT_TRIES = 25;

/** Seconds between periodic top-ups during zone wait (phase 2). */
export const PERIODIC_SUPPLY_INTERVAL_S = 90;

/** Max boxes spawned per family on one periodic tick (phase 2). */
export const PERIODIC_MAX_BOXES_PER_FAMILY = 1;

/** Kill-feed and HUD copy when a supply pulse spawns at least one box. */
export const ZONE_LOOT_SUPPLY_MESSAGE = 'Ammunition supply dropped in the safe zone';

/**
 * Map-scaled minimum number of ground ammo boxes for one family.
 *
 * @param mapSize - World side length in pixels.
 * @param type - Ammo family.
 * @returns At least 1.
 */
export function ammoFloorForMap(mapSize: number, type: AmmoType): number {
  const scaled = ZONE_LOOT_BASE_FLOOR[type] * mapSize / REFERENCE_MAP_SIZE;
  return Math.max(1, Math.round(scaled));
}
