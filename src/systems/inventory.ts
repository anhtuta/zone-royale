/**
 * Inventory and pickup rules shared by the player and bots.
 *
 * @packageDocumentation
 */

import { BOT_AMMO_CAP, WEAPONS } from '../config/weapons';
import { MAX_ARMOR, MAX_HP, PICK_RANGE } from '../config/constants';
import type { World } from '../core/world';
import type { Entity, SlotIndex, WeaponInstance } from '../entities/entity';
import { lootName, type LootItem, type WeaponLoot } from '../entities/loot';
import { dist2 } from '../utils/math';
import { rand } from '../utils/random';
import { showMessage } from './feedback';
import { emitSound } from './sound';

/** Outcome of choosing where a picked-up weapon goes. */
export interface WeaponSlotChoice {
  /** Slot that will receive the new weapon. */
  slot: SlotIndex;
  /** Weapon that must be dropped to make room, if any. */
  replaced: WeaponInstance | null;
}

/**
 * Decides which slot a new weapon goes into: the first empty slot; when both
 * are full the player swaps out their *selected* weapon, while bots swap out
 * their *weaker* weapon (lower tier; slot 0 on a tie).
 *
 * @param e - Entity picking up the weapon.
 * @returns Target slot and the weapon it displaces.
 */
export function chooseWeaponSlot(e: Entity): WeaponSlotChoice {
  const [w0, w1] = e.weapons;
  if (!w0) return { slot: 0, replaced: null };
  if (!w1) return { slot: 1, replaced: null };
  const slot: SlotIndex = e.isPlayer
    ? e.slot
    : WEAPONS[w0.type].tier <= WEAPONS[w1.type].tier
      ? 0
      : 1;
  return { slot, replaced: e.weapons[slot] };
}

/**
 * Removes an item from the ground and flags it as gone.
 *
 * @param world - The game world.
 * @param it - Item to remove.
 */
export function removeLoot(world: World, it: LootItem): void {
  const i = world.loot.indexOf(it);
  if (i >= 0) world.loot.splice(i, 1);
  it.gone = true;
}

/**
 * Puts a weapon into the entity's inventory, dropping the displaced weapon
 * on the ground. The player always switches to the new weapon; a bot only
 * switches if the new weapon's tier is at least that of its current one.
 *
 * @param world - The game world.
 * @param e - Entity picking up.
 * @param it - Weapon item.
 */
function equipWeapon(world: World, e: Entity, it: WeaponLoot): void {
  const { slot, replaced } = chooseWeaponSlot(e);
  if (replaced) {
    world.loot.push({
      kind: 'weapon',
      type: replaced.type,
      mag: replaced.mag,
      x: e.x + rand(-15, 15),
      y: e.y + rand(-15, 15),
    });
  }
  e.weapons[slot] = { type: it.type, mag: it.mag };
  const current = e.weapons[e.slot];
  if (e.isPlayer || !current || WEAPONS[it.type].tier >= WEAPONS[current.type].tier) {
    e.slot = slot;
    e.reloading = 0;
  }
}

/**
 * Applies a loot item to an entity and removes it from the ground.
 * Health and armor are capped at 100.
 *
 * @param world - The game world.
 * @param e - Entity picking up.
 * @param it - Item being picked up.
 */
export function applyLoot(world: World, e: Entity, it: LootItem): void {
  switch (it.kind) {
    case 'weapon':
      equipWeapon(world, e, it);
      break;
    case 'ammo':
      e.ammo[it.type] += it.amount;
      break;
    case 'health':
      e.hp = Math.min(MAX_HP, e.hp + it.amount);
      break;
    case 'armor':
      e.armor = Math.min(MAX_ARMOR, e.armor + it.amount);
      break;
  }
  removeLoot(world, it);
  if (e.isPlayer) {
    showMessage(world, 'Picked up ' + lootName(it));
    emitSound(world, 'pickup', e.x, e.y);
  }
}

/**
 * Finds the closest loot item within `range` that passes an optional filter.
 *
 * @param loot - Items on the ground.
 * @param x - Search origin X.
 * @param y - Search origin Y.
 * @param range - Search radius.
 * @param filter - Optional predicate an item must satisfy.
 * @returns The nearest matching item, or `null`.
 */
export function nearestLoot(
  loot: readonly LootItem[],
  x: number,
  y: number,
  range: number,
  filter?: (it: LootItem) => boolean,
): LootItem | null {
  let best: LootItem | null = null;
  let bd = range * range;
  for (const it of loot) {
    const d = dist2(x, y, it.x, it.y);
    if (d < bd && (!filter || filter(it))) {
      bd = d;
      best = it;
    }
  }
  return best;
}

/**
 * Reason a player pickup was refused, or `null` if it is allowed.
 *
 * @param e - The player.
 * @param it - Item being picked up.
 * @returns A message to show, or `null` when the pickup may proceed.
 */
export function pickupRefusal(e: Entity, it: LootItem): string | null {
  if (it.kind === 'health' && e.hp >= MAX_HP) return 'Health is already full';
  if (it.kind === 'armor' && e.armor >= MAX_ARMOR) return 'Armor is already full';
  return null;
}

/**
 * Handles the player pressing E: picks up the nearest eligible item within
 * {@link PICK_RANGE}. If the closest item would be wasted (full HP/armor), skips
 * to the next nearest pickable item; only then shows the refusal for the closest
 * item.
 *
 * @param world - The game world.
 * @returns `true` if something was picked up.
 */
export function playerPickup(world: World): boolean {
  const p = world.player;
  const pickable = nearestLoot(
    world.loot,
    p.x,
    p.y,
    PICK_RANGE,
    (it) => pickupRefusal(p, it) === null,
  );
  if (pickable) {
    applyLoot(world, p, pickable);
    return true;
  }
  const nearest = nearestLoot(world.loot, p.x, p.y, PICK_RANGE);
  if (!nearest) return false;
  const refusal = pickupRefusal(p, nearest);
  if (refusal) showMessage(world, refusal);
  return false;
}

/**
 * Bot loot preferences:
 * - weapons: any new weapon type while a slot is free, otherwise only a type
 *   it does not own whose tier beats its weaker weapon;
 * - ammo: only for a weapon it carries, and only while below 120 rounds;
 * - med kits below 85 HP; armor below 70.
 *
 * @param b - The bot.
 * @param it - Candidate item.
 * @returns `true` if the bot wants the item.
 */
export function botWants(b: Entity, it: LootItem): boolean {
  const [w0, w1] = b.weapons;
  switch (it.kind) {
    case 'weapon': {
      const owns = b.weapons.some((w) => w && w.type === it.type);
      if (!w0 || !w1) return !owns;
      const tier = WEAPONS[it.type].tier;
      return tier > Math.min(WEAPONS[w0.type].tier, WEAPONS[w1.type].tier) && !owns;
    }
    case 'ammo':
      return (
        b.weapons.some((w) => w && WEAPONS[w.type].ammo === it.type) &&
        b.ammo[it.type] < BOT_AMMO_CAP
      );
    case 'health':
      return b.hp < 85;
    case 'armor':
      return b.armor < 70;
  }
}
