/**
 * Loot items lying on the ground.
 *
 * @packageDocumentation
 */

import {
  AMMO_COLORS,
  AMMO_NAMES,
  WEAPONS,
  type AmmoType,
  type WeaponType,
} from '../config/weapons';

/** Fields shared by every loot item. */
interface LootBase {
  /** World X. */
  x: number;
  /** World Y. */
  y: number;
  /** Set once the item has been picked up (so AI can drop stale references). */
  gone?: boolean;
}

/** A weapon on the ground, keeping whatever was left in its magazine. */
export interface WeaponLoot extends LootBase {
  /** Discriminator. */
  kind: 'weapon';
  /** Weapon id. */
  type: WeaponType;
  /** Rounds in the magazine. */
  mag: number;
}

/** A box of ammunition. */
export interface AmmoLoot extends LootBase {
  /** Discriminator. */
  kind: 'ammo';
  /** Ammo family. */
  type: AmmoType;
  /** Rounds in the box. */
  amount: number;
}

/** A med kit. */
export interface HealthLoot extends LootBase {
  /** Discriminator. */
  kind: 'health';
  /** HP restored. */
  amount: number;
}

/** An armor vest. */
export interface ArmorLoot extends LootBase {
  /** Discriminator. */
  kind: 'armor';
  /** Armor granted. */
  amount: number;
}

/** Any loot item. */
export type LootItem = WeaponLoot | AmmoLoot | HealthLoot | ArmorLoot;

/**
 * Human-readable label for a loot item (pickup prompt, floating labels, messages).
 *
 * @param it - The item.
 * @returns E.g. `"Shotgun"`, `"Light Ammo x30"`, `"Med Kit (+40 HP)"`, `"Armor (+50)"`.
 */
export function lootName(it: LootItem): string {
  switch (it.kind) {
    case 'weapon':
      return WEAPONS[it.type].name;
    case 'ammo':
      return AMMO_NAMES[it.type] + ' Ammo x' + it.amount;
    case 'health':
      return 'Med Kit (+' + it.amount + ' HP)';
    case 'armor':
      return 'Armor (+' + it.amount + ')';
  }
}

/**
 * Accent color for drawing a loot item.
 *
 * @param it - The item.
 * @returns A CSS color.
 */
export function lootColor(it: LootItem): string {
  switch (it.kind) {
    case 'weapon':
      return WEAPONS[it.type].color;
    case 'ammo':
      return AMMO_COLORS[it.type];
    case 'health':
      return '#ef5350';
    case 'armor':
      return '#42a5f5';
  }
}
