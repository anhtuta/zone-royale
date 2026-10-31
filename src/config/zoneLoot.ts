/**
 * Safe-zone combat supply floors and placement tuning.
 *
 * @packageDocumentation
 */

import type { AmmoType } from './weapons';

/**
 * Scales {@link ZONE_LOOT_BASE_FLOOR} with survivor count: `base * alive / divisor`.
 * Lower divisor → more ground ammo per pulse (tuning knob, not tied to lobby size).
 */
export const ZONE_LOOT_FLOOR_ALIVE_DIVISOR = 10;

/**
 * Scales {@link ZONE_LOOT_WEAPON_BASE_FLOOR} with survivor count (weapons only).
 * Lower divisor → more ground weapons per pulse; independent of ammo scaling.
 */
export const ZONE_LOOT_WEAPON_FLOOR_ALIVE_DIVISOR = 10;

/** Weapon floor numerator before survivor scaling (see {@link weaponFloorForAlive}). */
export const ZONE_LOOT_WEAPON_BASE_FLOOR = 2;

/** Per-family floor numerator before survivor scaling (see {@link ammoFloorForAlive}). */
export const ZONE_LOOT_BASE_FLOOR: Readonly<Record<AmmoType, number>> = {
  light: 8,
  shells: 4,
  medium: 6,
  heavy: 4,
};

/**
 * When the zone closes (`zone.r === 0`), supply uses the last positive end radius
 * from the phase table (the final playable safe circle before collapse).
 *
 * @param phaseEndRadii - `Zone.phases[].r` for the match.
 * @returns That radius in pixels, or `0` if none is positive.
 */
export function zoneLootClosedPlacementRadius(
  phaseEndRadii: readonly number[],
): number {
  for (let i = phaseEndRadii.length - 1; i >= 0; i--) {
    const r = phaseEndRadii[i]!;
    if (r > 0) return r;
  }
  return 0;
}

/** Placement attempts per box before skipping that box. */
export const ZONE_LOOT_PLACEMENT_TRIES = 25;

/** Kill-feed and HUD copy when a supply pulse spawns at least one item. */
export const ZONE_LOOT_SUPPLY_MESSAGE = 'Combat supply dropped in the safe zone';

/**
 * Minimum ground ammo boxes for one family, scaled by survivors and capped by alive count.
 *
 * @param aliveCount - Living combatants (at least 1 for math when the match is active).
 * @param type - Ammo family.
 * @returns Between 1 and `aliveCount`.
 */
export function ammoFloorForAlive(aliveCount: number, type: AmmoType): number {
  const alive = Math.max(1, aliveCount);
  const scaled =
    (ZONE_LOOT_BASE_FLOOR[type] * alive) / ZONE_LOOT_FLOOR_ALIVE_DIVISOR;
  return Math.min(alive, Math.max(1, Math.round(scaled)));
}

/**
 * Minimum ground weapons (all types), scaled by survivors and capped by alive count.
 *
 * @param aliveCount - Living combatants (at least 1 for math when the match is active).
 * @returns Between 1 and `aliveCount`.
 */
export function weaponFloorForAlive(aliveCount: number): number {
  const alive = Math.max(1, aliveCount);
  const scaled =
    (ZONE_LOOT_WEAPON_BASE_FLOOR * alive) / ZONE_LOOT_WEAPON_FLOOR_ALIVE_DIVISOR;
  return Math.min(alive, Math.max(1, Math.round(scaled)));
}
