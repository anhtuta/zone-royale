/**
 * Safe-zone ammunition supply floors and placement tuning.
 *
 * @packageDocumentation
 */

import { DEFAULT_MATCH_SETTINGS } from './matchSettings';
import type { AmmoType } from './weapons';

/** Player count used to scale per-family minimum ground ammo (default match = 50). */
export const REFERENCE_PLAYER_COUNT = DEFAULT_MATCH_SETTINGS.numPlayers;

/** Minimum ammo boxes per family on the ground at {@link REFERENCE_PLAYER_COUNT} alive. */
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
 * Minimum ground ammo boxes for one family, scaled by survivors and capped by alive count.
 *
 * @param aliveCount - Living combatants (at least 1 for math when the match is active).
 * @param type - Ammo family.
 * @returns Between 1 and `aliveCount`.
 */
export function ammoFloorForAlive(aliveCount: number, type: AmmoType): number {
  const alive = Math.max(1, aliveCount);
  const scaled = ZONE_LOOT_BASE_FLOOR[type] * alive / REFERENCE_PLAYER_COUNT;
  return Math.min(alive, Math.max(1, Math.round(scaled)));
}
