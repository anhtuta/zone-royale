/**
 * Initial loot distribution.
 *
 * @packageDocumentation
 */

import { ARMOR_AMOUNT, MAP_SIZE, MEDKIT_AMOUNT, TAU } from '../config/constants';
import { AMMO_AMOUNT, WEAPONS, type AmmoType, type WeaponType } from '../config/weapons';
import type { LootItem } from '../entities/loot';
import { pick, rand, randInt, random } from '../utils/random';
import type { House, Obstacle } from '../world/types';
import { circleFree } from './collision';

/** Number of loot spots scattered in the open (outside houses). */
export const OPEN_LOOT_SPOTS = 130;

/** Ammo families weighted for random ammo drops (light and medium are twice as common). */
const AMMO_WEIGHTS: readonly AmmoType[] = ['light', 'light', 'shells', 'medium', 'medium', 'heavy'];

/**
 * Maps a uniform roll to a weapon type:
 * pistol 28%, SMG 24%, shotgun 22%, rifle 19%, sniper 7%.
 *
 * @param roll - Uniform value in [0, 1).
 * @returns The weapon type.
 */
export function weaponForRoll(roll: number): WeaponType {
  return roll < 0.28
    ? 'pistol'
    : roll < 0.52
      ? 'smg'
      : roll < 0.74
        ? 'shotgun'
        : roll < 0.93
          ? 'rifle'
          : 'sniper';
}

/** Category of a loot spot. */
export type LootCategory = 'weapon' | 'ammo' | 'health' | 'armor';

/**
 * Maps a uniform roll to a loot category:
 * weapon (with matching ammo) 30%, ammo 32%, med kit 22%, armor 16%.
 *
 * @param roll - Uniform value in [0, 1).
 * @returns The category.
 */
export function categoryForRoll(roll: number): LootCategory {
  return roll < 0.3 ? 'weapon' : roll < 0.62 ? 'ammo' : roll < 0.84 ? 'health' : 'armor';
}

/**
 * Rolls a random loot spot at (x, y). Weapons come with a box of their ammo
 * placed 30px away.
 *
 * @param x - Spot X.
 * @param y - Spot Y.
 * @returns One or two new items.
 */
export function rollLoot(x: number, y: number): LootItem[] {
  const category = categoryForRoll(random());
  if (category === 'weapon') {
    const type = weaponForRoll(random());
    const ammo = WEAPONS[type].ammo;
    const a = rand(0, TAU);
    return [
      { kind: 'weapon', type, mag: WEAPONS[type].mag, x, y },
      {
        kind: 'ammo',
        type: ammo,
        amount: AMMO_AMOUNT[ammo],
        x: x + Math.cos(a) * 30,
        y: y + Math.sin(a) * 30,
      },
    ];
  }
  if (category === 'ammo') {
    const type = pick(AMMO_WEIGHTS);
    return [{ kind: 'ammo', type, amount: AMMO_AMOUNT[type], x, y }];
  }
  if (category === 'health') return [{ kind: 'health', amount: MEDKIT_AMOUNT, x, y }];
  return [{ kind: 'armor', amount: ARMOR_AMOUNT, x, y }];
}

/**
 * Distributes the starting loot: 3–5 spots inside every house plus
 * {@link OPEN_LOOT_SPOTS} spots across the open map, all on free ground.
 *
 * @param houses - House footprints.
 * @param obstacles - Map obstacles.
 * @returns All spawned items.
 */
export function spawnInitialLoot(
  houses: readonly House[],
  obstacles: readonly Obstacle[],
): LootItem[] {
  const loot: LootItem[] = [];
  for (const h of houses) {
    const n = randInt(3, 5);
    for (let i = 0; i < n; i++) {
      for (let tries = 0; tries < 20; tries++) {
        const x = rand(h.x + 40, h.x + h.w - 40);
        const y = rand(h.y + 40, h.y + h.h - 40);
        if (circleFree(obstacles, x, y, 22)) {
          loot.push(...rollLoot(x, y));
          break;
        }
      }
    }
  }
  for (let i = 0; i < OPEN_LOOT_SPOTS; i++) {
    for (let tries = 0; tries < 20; tries++) {
      const x = rand(80, MAP_SIZE - 80);
      const y = rand(80, MAP_SIZE - 80);
      if (circleFree(obstacles, x, y, 26)) {
        loot.push(...rollLoot(x, y));
        break;
      }
    }
  }
  return loot;
}
