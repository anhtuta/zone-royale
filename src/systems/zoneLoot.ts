/**
 * Replenishes ground ammunition inside the safe zone on zone pulses.
 *
 * @packageDocumentation
 */

import { LOOT_CLEARANCE, TAU } from '../config/constants';
import { AMMO_AMOUNT, AMMO_TYPES, type AmmoType } from '../config/weapons';
import {
  ammoFloorForAlive,
  ZONE_LOOT_EDGE_MARGIN,
  ZONE_LOOT_PLACEMENT_TRIES,
  ZONE_LOOT_SUPPLY_MESSAGE,
  zoneLootClosedPlacementRadius,
} from '../config/zoneLoot';
import { countAlive } from './combat';
import type { World } from '../core/world';
import type { LootItem } from '../entities/loot';
import { dist2 } from '../utils/math';
import { random, rand } from '../utils/random';
import { circleFree } from './collision';
import { pushSystemFeed, showMessage } from './feedback';
import type { Zone, ZoneEvent } from './zone';

/**
 * Usable sampling radius for a supply pulse (inset from the placement circle).
 *
 * @param zone - Current safe zone.
 * @param event - Zone pulse; `closed` uses the endgame disk at `zone.r === 0`.
 */
export function zoneLootUsableRadius(zone: Zone, event?: ZoneEvent): number {
  const margin = ZONE_LOOT_EDGE_MARGIN;
  const placementR =
    event === 'closed'
      ? zoneLootClosedPlacementRadius(zone.phases.map((p) => p.r))
      : zone.r;
  const usable = placementR - margin;
  return usable > 0 ? usable : 0;
}

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
export function trySpawnAmmoInZone(
  world: World,
  type: AmmoType,
  event?: ZoneEvent,
): boolean {
  const zone = world.zone;
  const usableR = zoneLootUsableRadius(zone, event);
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
  /** Zone pulse driving this fill (`closed` uses endgame placement). */
  zoneEvent?: ZoneEvent;
}

/**
 * Spawns ammo boxes until each family meets its survivor-scaled floor (or placement fails).
 *
 * @param world - Match state.
 * @param options - Optional per-family spawn cap.
 * @returns Number of boxes successfully placed.
 */
export function fillZoneAmmoToFloors(world: World, options: FillZoneAmmoOptions = {}): number {
  const maxPerFamily = options.maxPerFamily ?? Infinity;
  const zoneEvent = options.zoneEvent;
  const counts = countGroundAmmo(world.loot);
  const alive = countAlive(world.entities);
  let spawned = 0;
  for (const type of AMMO_TYPES) {
    const floor = ammoFloorForAlive(alive, type);
    let deficit = Math.max(0, floor - counts[type]);
    let placedThisFamily = 0;
    while (deficit > 0 && placedThisFamily < maxPerFamily) {
      if (!trySpawnAmmoInZone(world, type, zoneEvent)) break;
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
  const spawned = fillZoneAmmoToFloors(world, { zoneEvent: event });
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
 * @param event - Pulse context; defaults to `closed` disk when the zone is final at `r === 0`.
 * @returns `true` if inside the supply sampling disk for that pulse.
 */
export function isInsideZoneLootDisk(
  world: World,
  x: number,
  y: number,
  event?: ZoneEvent,
): boolean {
  const zone = world.zone;
  const pulse =
    event ?? (zone.state === 'final' && zone.r <= 0 ? ('closed' as const) : undefined);
  const usableR = zoneLootUsableRadius(zone, pulse);
  if (usableR <= 0) return false;
  return dist2(x, y, zone.x, zone.y) <= usableR * usableR;
}
