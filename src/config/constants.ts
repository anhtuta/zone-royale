/**
 * Global gameplay constants shared by every system.
 *
 * @packageDocumentation
 */

/** Width and height of the square play area, in world pixels. */
export const MAP_SIZE = 3000;

/** A full turn in radians (2π). */
export const TAU = Math.PI * 2;

/** Number of AI opponents spawned in every match (plus one human player). */
export const NUM_BOTS = 19;

/** Player movement speed in pixels per second. */
export const PLAYER_SPEED = 245;

/** Bot movement speed in pixels per second. */
export const BOT_SPEED = 205;

/** How far a bot can spot an enemy, in pixels. */
export const BOT_SIGHT = 520;

/** Radius within which the player can pick up loot with the E key. */
export const PICK_RANGE = 60;

/** Radius within which the player auto-collects ammo boxes. */
export const AMMO_AUTO_PICK_RANGE = 34;

/** Radius within which a bot collects loot it wants. */
export const BOT_PICK_RANGE = 30;

/** Collision radius of every combatant. */
export const ENTITY_RADIUS = 18;

/** Maximum health of a combatant. */
export const MAX_HP = 100;

/** Maximum armor of a combatant. */
export const MAX_ARMOR = 100;

/** Fraction of incoming (non-zone) damage that armor absorbs while it lasts. */
export const ARMOR_ABSORB = 0.6;

/** Health restored by a med kit. */
export const MEDKIT_AMOUNT = 40;

/** Armor granted by an armor vest. */
export const ARMOR_AMOUNT = 50;

/** Seconds between zone damage ticks for an entity standing outside the zone. */
export const ZONE_TICK = 0.5;

/** Radius of the safe zone at the very start of a match (covers the whole map). */
export const ZONE_START_RADIUS = 2150;

/** Max number of kill-feed lines visible at once. */
export const KILLFEED_MAX = 6;

/** Max sound effects that may start in a single simulation step. */
export const SFX_PER_STEP = 6;

/** Sounds further than this from the player are not played. */
export const SFX_MAX_DISTANCE = 1200;

/** Longest simulation step allowed per frame, in seconds (avoids tunnelling after tab switches). */
export const MAX_FRAME_DT = 0.05;

/** Color of the human player. */
export const PLAYER_COLOR = '#42a5f5';
