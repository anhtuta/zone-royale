/**
 * Replenishes ground ammunition inside the safe zone on zone pulses.
 *
 * @packageDocumentation
 */

import { LOOT_CLEARANCE, TAU } from '../config/constants';
import { AMMO_AMOUNT, AMMO_TYPES, type AmmoType } from '../config/weapons';
import {
  ammoFloorForMap,
  ZONE_LOOT_EDGE_MARGIN,
  ZONE_LOOT_PLACEMENT_TRIES,
  ZONE_LOOT_SUPPLY_MESSAGE,
} from '../config/zoneLoot';
import type { World } from '../core/world';
import type { LootItem } from '../entities/loot';
import { dist2 } from '../utils/math';
import { random, rand } from '../utils/random';
import { circleFree } from './collision';
import { pushSystemFeed, showMessage } from './feedback';
import type { ZoneEvent } from './zone';

/**
 * Counts ammo boxes of each family lying on the ground.
 *
 * @param loot - Current ground loot.
 * @returns Counts keyed by ammo type.
 */
export function countGroundAmmo(loot: readonly LootItem[]): Record<AmmoType, number> {
  const counts: Record<AmmoType, number> = { light: 0, shells: 0, medium: 0, heavy: 0 };
  for (const it of loot) {
    if (it.kind === 'ammo') counts[it.type]++;
  }
  return counts;
}

/**
 * Spawns one ammo box of `type` at a random point inside the safe zone.
 *
 * @param world - Match state (mutates `loot` on success).
 * @param type - Ammo family for the new box.
 * @returns `true` if a box was placed.
 */
export function trySpawnAmmoInZone(world: World, type: AmmoType): boolean {
  const zone = world.zone;
  const usableR = zone.r - ZONE_LOOT_EDGE_MARGIN;
  if (usableR <= 0) return false;
  for (let i = 0; i < ZONE_LOOT_PLACEMENT_TRIES; i++) {
    const a = rand(0, TAU);
    const d = Math.sqrt(random()) * usableR;
    const x = zone.x + Math.cos(a) * d;
    const y = zone.y + Math.sin(a) * d;
    if (!circleFree(world.obstacles, x, y, LOOT_CLEARANCE, world.mapSize)) continue;
    world.loot.push({
      kind: 'ammo',
      type,
      amount: AMMO_AMOUNT[type],
      x,
      y,
    });
    return true;
  }
  return false;
}

/** Options for {@link fillZoneAmmoToFloors}. */
export interface FillZoneAmmoOptions {
  /** Cap boxes spawned per family this pulse (`Infinity` = fill to floor). */
  maxPerFamily?: number;
}

/**
 * Spawns ammo boxes until each family meets its map-scaled floor (or placement fails).
 *
 * @param world - Match state.
 * @param options - Optional per-family spawn cap.
 * @returns Number of boxes successfully placed.
 */
export function fillZoneAmmoToFloors(world: World, options: FillZoneAmmoOptions = {}): number {
  const maxPerFamily = options.maxPerFamily ?? Infinity;
  const counts = countGroundAmmo(world.loot);
  let spawned = 0;
  for (const type of AMMO_TYPES) {
    const floor = ammoFloorForMap(world.mapSize, type);
    let deficit = Math.max(0, floor - counts[type]);
    let placedThisFamily = 0;
    while (deficit > 0 && placedThisFamily < maxPerFamily) {
      if (!trySpawnAmmoInZone(world, type)) break;
      spawned++;
      placedThisFamily++;
      counts[type]++;
      deficit--;
    }
  }
  return spawned;
}

/**
 * Runs a zone-pulse ammo supply and telegraphs when anything spawned.
 *
 * @param world - Match state.
 * @param event - Zone transition from {@link updateZone}.
 */
export function handleZoneAmmoSupplyEvent(world: World, event: ZoneEvent): void {
  if (event !== 'phaseAdvanced' && event !== 'closed') return;
  const spawned = fillZoneAmmoToFloors(world);
  if (spawned <= 0) return;
  pushSystemFeed(world, ZONE_LOOT_SUPPLY_MESSAGE);
  showMessage(world, ZONE_LOOT_SUPPLY_MESSAGE);
}

/**
 * Whether a loot position lies inside the supply sampling disk (for tests).
 *
 * @param world - Match state.
 * @param x - Loot X.
 * @param y - Loot Y.
 * @returns `true` if inside `zone.r - margin`.
 */
export function isInsideZoneLootDisk(world: World, x: number, y: number): boolean {
  const usableR = world.zone.r - ZONE_LOOT_EDGE_MARGIN;
  if (usableR <= 0) return false;
  return dist2(x, y, world.zone.x, world.zone.y) <= usableR * usableR;
}
