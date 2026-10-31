/**
 * Combatants: the human player and the AI bots share one data shape.
 *
 * @packageDocumentation
 */

import { ENTITY_RADIUS, MAX_HP, TAU, WEAPON_SLOT_COUNT } from '../config/constants';
import { STARTING_AMMO, WEAPONS, type AmmoType, type WeaponType } from '../config/weapons';
import { rand } from '../utils/random';
import type { LootItem } from './loot';

/** A weapon held in an inventory slot, with its current magazine. */
export interface WeaponInstance {
  /** Which weapon this is. */
  type: WeaponType;
  /** Rounds currently loaded. */
  mag: number;
}

/** Weapon inventory; length is {@link WEAPON_SLOT_COUNT}. `null` means empty. */
export type WeaponSlots = (WeaponInstance | null)[];

/** Index of an inventory slot (0 .. {@link WEAPON_SLOT_COUNT} - 1). */
export type SlotIndex = number;

/** Creates an empty weapon inventory. */
export function emptyWeaponSlots(): WeaponSlots {
  return Array.from({ length: WEAPON_SLOT_COUNT }, () => null);
}

/** Per-bot AI memory. See `systems/ai.ts` for how each field is used. */
export interface BotBrain {
  /** Enemy currently being fought, if any. */
  target: Entity | null;
  /** Seconds until the next target scan. */
  retarget: number;
  /** Reaction delay remaining before the bot may shoot a newly acquired target. */
  react: number;
  /** Smoothed random aim offset in radians. */
  aimNoise: number;
  /** Strafe direction while fighting (-1 or 1). */
  strafe: number;
  /** Seconds until the strafe direction is re-rolled. */
  strafeT: number;
  /** Loot item the bot is walking towards. */
  loot: LootItem | null;
  /** Seconds until the next loot scan. */
  lootT: number;
  /** Current wander waypoint X. */
  wx: number;
  /** Current wander waypoint Y. */
  wy: number;
  /** Seconds until a new wander waypoint is chosen. */
  wanderT: number;
  /** Remaining time of the "unstick" detour. */
  avoidT: number;
  /** Detour direction X (unit vector). */
  ax: number;
  /** Detour direction Y (unit vector). */
  ay: number;
  /** Seconds until the next stuck check. */
  stuckT: number;
  /** X position at the last stuck check. */
  lx: number;
  /** Y position at the last stuck check. */
  ly: number;
  /** Who last damaged this bot (used to retaliate beyond normal sight). */
  attacker: Entity | null;
  /** Skill in [0.45, 0.95]: affects aim error, lead and reaction time. */
  skill: number;
}

/** A combatant (player or bot). */
export interface Entity {
  /** `true` for the human player. */
  isPlayer: boolean;
  /** Display name. */
  name: string;
  /** Body color (`#rrggbb`). */
  color: string;
  /** Centre X. */
  x: number;
  /** Centre Y. */
  y: number;
  /** Velocity X (px/s). */
  vx: number;
  /** Velocity Y (px/s). */
  vy: number;
  /** Collision radius. */
  r: number;
  /** Facing / aim angle in radians. */
  angle: number;
  /** Health, 0..100. */
  hp: number;
  /** Armor, 0..100. */
  armor: number;
  /** Weapon inventory ({@link WEAPON_SLOT_COUNT} slots). */
  weapons: WeaponSlots;
  /** Selected slot. */
  slot: SlotIndex;
  /** Reserve ammunition per family. */
  ammo: Record<AmmoType, number>;
  /** Seconds until the weapon can fire again. */
  cool: number;
  /** Seconds of reload remaining (0 = not reloading). */
  reloading: number;
  /** Total duration of the current reload (for the progress bar). */
  reloadTotal: number;
  /** Whether the entity is still in the match. */
  alive: boolean;
  /** Eliminations scored. */
  kills: number;
  /** Total damage dealt. */
  damage: number;
  /** Remaining time of the white hit flash. */
  hitFlash: number;
  /** Final placement (1 = winner); 0 while alive. */
  place: number;
  /** Match time of death in seconds. */
  diedAt: number;
  /** Accumulator for zone damage ticks. */
  zoneTick: number;
  /** AI memory, or `null` for the player. */
  ai: BotBrain | null;
}

/**
 * Creates fresh AI memory for a bot spawning at (x, y).
 *
 * @param x - Spawn X.
 * @param y - Spawn Y.
 * @returns A new brain with a random skill level.
 */
export function createBrain(x: number, y: number): BotBrain {
  return {
    target: null,
    retarget: 0,
    react: 0,
    aimNoise: 0,
    strafe: 1,
    strafeT: 0,
    loot: null,
    lootT: 0,
    wx: x,
    wy: y,
    wanderT: 0,
    avoidT: 0,
    ax: 0,
    ay: 0,
    stuckT: 0.5,
    lx: x,
    ly: y,
    attacker: null,
    skill: rand(0.45, 0.95),
  };
}

/**
 * Creates a combatant with a loaded pistol and 24 light rounds in reserve.
 *
 * @param isPlayer - Whether this is the human player (bots get a {@link BotBrain}).
 * @param name - Display name.
 * @param color - Body color.
 * @param x - Spawn X.
 * @param y - Spawn Y.
 * @returns The new entity.
 */
export function createEntity(
  isPlayer: boolean,
  name: string,
  color: string,
  x: number,
  y: number,
): Entity {
  const angle = rand(0, TAU);
  return {
    isPlayer,
    name,
    color,
    x,
    y,
    vx: 0,
    vy: 0,
    r: ENTITY_RADIUS,
    angle,
    hp: MAX_HP,
    armor: 0,
    weapons: (() => {
      const slots = emptyWeaponSlots();
      slots[0] = { type: 'pistol', mag: WEAPONS.pistol.mag };
      return slots;
    })(),
    slot: 0,
    ammo: { ...STARTING_AMMO },
    cool: 0,
    reloading: 0,
    reloadTotal: 1,
    alive: true,
    kills: 0,
    damage: 0,
    hitFlash: 0,
    place: 0,
    diedAt: 0,
    zoneTick: 0,
    ai: isPlayer ? null : createBrain(x, y),
  };
}

/**
 * Returns the weapon in the entity's selected slot.
 *
 * @param e - The entity.
 * @returns The active weapon, or `null` if the slot is empty.
 */
export function activeWeapon(e: Entity): WeaponInstance | null {
  return e.weapons[e.slot];
}

/**
 * Returns the next slot index, wrapping at {@link WEAPON_SLOT_COUNT}.
 *
 * @param slot - Current slot.
 */
export function nextWeaponSlot(slot: SlotIndex): SlotIndex {
  return ((slot + 1) % WEAPON_SLOT_COUNT) as SlotIndex;
}
