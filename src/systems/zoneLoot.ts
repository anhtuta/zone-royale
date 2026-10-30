/**
 * Replenishes ground ammo and weapons inside the safe zone on zone pulses.
 *
 * @packageDocumentation
 */

import { LOOT_CLEARANCE, TAU } from '../config/constants';
import { AMMO_AMOUNT, AMMO_TYPES, WEAPONS, type AmmoType } from '../config/weapons';
import {
  ammoFloorForAlive,
  weaponFloorForAlive,
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
import { weaponForRoll } from './lootSpawner';
import type { Zone, ZoneEvent } from './zone';

/** Offset for paired ammo next to a ground weapon (matches {@link rollLoot}). */
const WEAPON_PAIRED_AMMO_OFFSET = 30;

/**
 * Sampling radius for a supply pulse (full safe circle, no minimum size).
 *
 * @param zone - Current safe zone.
 * @param event - Zone pulse; `closed` uses the endgame disk at `zone.r === 0`.
 */
export function zoneLootUsableRadius(zone: Zone, event?: ZoneEvent): number {
  if (event === 'closed') {
    return zoneLootClosedPlacementRadius(zone.phases.map((p) => p.r));
  }
  return Math.max(0, zone.r);
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
 * Counts weapons lying on the ground (all types combined).
 *
 * @param loot - Current ground loot.
 */
export function countGroundWeapons(loot: readonly LootItem[]): number {
  let n = 0;
  for (const it of loot) {
    if (it.kind === 'weapon') n++;
  }
  return n;
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

/**
 * Spawns one weapon (full mag + paired ammo) at a random point inside the safe zone.
 *
 * @param world - Match state (mutates `loot` on success).
 * @returns `true` if the weapon was placed.
 */
export function trySpawnWeaponInZone(world: World, event?: ZoneEvent): boolean {
  const zone = world.zone;
  const usableR = zoneLootUsableRadius(zone, event);
  if (usableR <= 0) return false;
  for (let i = 0; i < ZONE_LOOT_PLACEMENT_TRIES; i++) {
    const a = rand(0, TAU);
    const d = Math.sqrt(random()) * usableR;
    const x = zone.x + Math.cos(a) * d;
    const y = zone.y + Math.sin(a) * d;
    if (!circleFree(world.obstacles, x, y, LOOT_CLEARANCE, world.mapSize)) continue;
    const type = weaponForRoll(random());
    const ammo = WEAPONS[type].ammo;
    const aa = rand(0, TAU);
    const ox = x + Math.cos(aa) * WEAPON_PAIRED_AMMO_OFFSET;
    const oy = y + Math.sin(aa) * WEAPON_PAIRED_AMMO_OFFSET;
    const ammoFree = circleFree(world.obstacles, ox, oy, LOOT_CLEARANCE, world.mapSize);
    let ammoX = ammoFree ? ox : x;
    let ammoY = ammoFree ? oy : y;
    if (dist2(ammoX, ammoY, zone.x, zone.y) > usableR * usableR) {
      ammoX = x;
      ammoY = y;
    }
    world.loot.push({ kind: 'weapon', type, mag: WEAPONS[type].mag, x, y });
    world.loot.push({
      kind: 'ammo',
      type: ammo,
      amount: AMMO_AMOUNT[ammo],
      x: ammoX,
      y: ammoY,
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

/** Options for {@link fillZoneWeaponsToFloor}. */
export interface FillZoneWeaponsOptions {
  /** Cap weapons spawned this pulse (`Infinity` = fill to floor). */
  maxWeapons?: number;
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
 * Spawns weapons until the survivor-scaled weapon floor is met (or placement fails).
 *
 * @param world - Match state.
 * @param options - Optional spawn cap.
 * @returns Number of weapons successfully placed (paired ammo is extra loot entries).
 */
export function fillZoneWeaponsToFloor(
  world: World,
  options: FillZoneWeaponsOptions = {},
): number {
  const maxWeapons = options.maxWeapons ?? Infinity;
  const zoneEvent = options.zoneEvent;
  const alive = countAlive(world.entities);
  const floor = weaponFloorForAlive(alive);
  let onGround = countGroundWeapons(world.loot);
  let deficit = Math.max(0, floor - onGround);
  let spawned = 0;
  while (deficit > 0 && spawned < maxWeapons) {
    if (!trySpawnWeaponInZone(world, zoneEvent)) break;
    spawned++;
    onGround++;
    deficit--;
  }
  return spawned;
}

/**
 * Runs zone-pulse combat supply (ammo then weapons) and telegraphs when anything spawned.
 *
 * @param world - Match state.
 * @param event - Zone transition from {@link updateZone}.
 */
export function handleZoneSupplyEvent(world: World, event: ZoneEvent): void {
  if (event !== 'phaseAdvanced' && event !== 'closed') return;
  const spawnedAmmo = fillZoneAmmoToFloors(world, { zoneEvent: event });
  const spawnedWeapons = fillZoneWeaponsToFloor(world, { zoneEvent: event });
  if (spawnedAmmo + spawnedWeapons <= 0) return;
  pushSystemFeed(world, ZONE_LOOT_SUPPLY_MESSAGE);
  showMessage(world, ZONE_LOOT_SUPPLY_MESSAGE);
}

/** @deprecated Use {@link handleZoneSupplyEvent}. */
export const handleZoneAmmoSupplyEvent = handleZoneSupplyEvent;

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
