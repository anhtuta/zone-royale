/**
 * Weapon and ammunition definitions.
 *
 * @packageDocumentation
 */

/** Identifier of one of the five weapons. */
export type WeaponType = 'pistol' | 'smg' | 'shotgun' | 'rifle' | 'sniper';

/** Identifier of an ammunition family. Each weapon consumes exactly one family. */
export type AmmoType = 'light' | 'shells' | 'medium' | 'heavy';

/** Static, per-weapon tuning values. */
export interface WeaponStats {
  /** Display name shown in the HUD and kill feed. */
  readonly name: string;
  /** Ammunition family consumed by this weapon. */
  readonly ammo: AmmoType;
  /** Damage per bullet (per pellet for shotguns). */
  readonly dmg: number;
  /** Seconds between shots. */
  readonly rate: number;
  /** Magazine capacity. */
  readonly mag: number;
  /** Reload duration in seconds. */
  readonly reload: number;
  /** Bullet speed in pixels per second. */
  readonly speed: number;
  /** Half-angle of the random spread cone in radians. */
  readonly spread: number;
  /** Bullets fired per trigger pull. */
  readonly pellets: number;
  /** Maximum bullet travel distance in pixels. */
  readonly range: number;
  /** Whether holding the mouse button keeps firing. */
  readonly auto: boolean;
  /** Rough power ranking used by bots when choosing weapons (1 = weakest). */
  readonly tier: number;
  /** Accent color for the gun, its bullets and its HUD label. */
  readonly color: string;
  /** Barrel length in pixels (rendering and muzzle position). */
  readonly len: number;
  /** Barrel thickness in pixels (rendering only). */
  readonly w: number;
}

/** Every weapon in the game keyed by {@link WeaponType}. */
export const WEAPONS: Readonly<Record<WeaponType, WeaponStats>> = {
  pistol: {
    name: 'Pistol',
    ammo: 'light',
    dmg: 20,
    rate: 0.26,
    mag: 12,
    reload: 1.1,
    speed: 1150,
    spread: 0.035,
    pellets: 1,
    range: 750,
    auto: false,
    tier: 1,
    color: '#cfd8dc',
    len: 14,
    w: 6,
  },
  smg: {
    name: 'SMG',
    ammo: 'light',
    dmg: 11,
    rate: 0.075,
    mag: 30,
    reload: 1.6,
    speed: 1050,
    spread: 0.12,
    pellets: 1,
    range: 600,
    auto: true,
    tier: 2,
    color: '#4dd0e1',
    len: 19,
    w: 7,
  },
  shotgun: {
    name: 'Shotgun',
    ammo: 'shells',
    dmg: 12,
    rate: 0.85,
    mag: 5,
    reload: 2.0,
    speed: 950,
    spread: 0.3,
    pellets: 8,
    range: 400,
    auto: false,
    tier: 3,
    color: '#ffab40',
    len: 22,
    w: 8,
  },
  rifle: {
    name: 'Assault Rifle',
    ammo: 'medium',
    dmg: 16,
    rate: 0.11,
    mag: 30,
    reload: 1.9,
    speed: 1450,
    spread: 0.055,
    pellets: 1,
    range: 950,
    auto: true,
    tier: 3,
    color: '#9ccc65',
    len: 26,
    w: 7,
  },
  sniper: {
    name: 'Sniper',
    ammo: 'heavy',
    dmg: 85,
    rate: 1.3,
    mag: 5,
    reload: 2.6,
    speed: 2600,
    spread: 0.004,
    pellets: 1,
    range: 1600,
    auto: false,
    tier: 4,
    color: '#ce93d8',
    len: 34,
    w: 6,
  },
};

/** All weapon ids, in the order used by the loot table. */
export const WEAPON_TYPES: readonly WeaponType[] = ['pistol', 'smg', 'shotgun', 'rifle', 'sniper'];

/** All ammo ids. */
export const AMMO_TYPES: readonly AmmoType[] = ['light', 'shells', 'medium', 'heavy'];

/** Color of each ammo family's pickup box and HUD label. */
export const AMMO_COLORS: Readonly<Record<AmmoType, string>> = {
  light: '#ffe082',
  shells: '#ff8a65',
  medium: '#aed581',
  heavy: '#b39ddb',
};

/** Human-readable ammo family names. */
export const AMMO_NAMES: Readonly<Record<AmmoType, string>> = {
  light: 'Light',
  shells: 'Shells',
  medium: 'Medium',
  heavy: 'Heavy',
};

/** Rounds contained in one ammo box of each family. */
export const AMMO_AMOUNT: Readonly<Record<AmmoType, number>> = {
  light: 30,
  shells: 10,
  medium: 30,
  heavy: 6,
};

/** Reserve ammo every combatant spawns with (enough for two pistol reloads). */
export const STARTING_AMMO: Readonly<Record<AmmoType, number>> = {
  light: 24,
  shells: 0,
  medium: 0,
  heavy: 0,
};

/** Bots stop wanting more ammo of a family once they carry this many rounds. */
export const BOT_AMMO_CAP = 120;
