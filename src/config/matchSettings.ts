/**
 * Per-match tuning: map size and player count (human + bots).
 *
 * @packageDocumentation
 */

import { ENTITY_RADIUS } from './constants';

/** One selectable map size preset. */
export interface MapSizeOption {
  /** UI label, e.g. `"Medium"`. */
  readonly label: string;
  /** World side length in pixels. */
  readonly value: number;
}

/** Selectable map sizes (square world, pixels per side). */
export const MAP_SIZE_OPTIONS: readonly MapSizeOption[] = [
  { label: 'Small', value: 1000 },
  { label: 'Medium', value: 5000 },
  { label: 'Large', value: 10000 },
  { label: 'Huge', value: 20000 },
  { label: 'Gigantic', value: 50000 },
];

/** Selectable total player counts (you + bots). */
export const PLAYER_COUNT_OPTIONS: readonly number[] = [20, 50, 100, 500, 1000];

/** Saved match options used when starting a game. */
export interface MatchSettings {
  /** World width and height in pixels. */
  mapSize: number;
  /** Human plus bots (bots = numPlayers − 1). */
  numPlayers: number;
}

/** First-time defaults and fallback when storage is invalid. */
export const DEFAULT_MATCH_SETTINGS: MatchSettings = {
  mapSize: 5000,
  numPlayers: 50,
};

const MAP_VALUES = new Set(MAP_SIZE_OPTIONS.map((o) => o.value));
const PLAYER_VALUES = new Set(PLAYER_COUNT_OPTIONS);

/** Inset from map edges where combatants may spawn (`findSpawnPoint`). */
export const SPAWN_EDGE_MARGIN = 120;

/**
 * Fraction of the spawn grid treated as placeable before obstacle layout is
 * known (houses, rocks, trees block {@link SPAWN_EDGE_MARGIN} clearance).
 */
const SPAWN_CAPACITY_FRACTION = 0.5;

/** Usable spawn square side length inside map margins. */
export function spawnUsableSide(mapSize: number): number {
  return mapSize - 2 * SPAWN_EDGE_MARGIN;
}

/** Estimated spawnable area inside margins after static obstacles. */
export function spawnCapacityArea(mapSize: number): number {
  return spawnUsableSide(mapSize) ** 2 * SPAWN_CAPACITY_FRACTION;
}

/** Minimum center distance so entity circles do not overlap at spawn. */
export function minBodySpawnSeparation(): number {
  return 2 * ENTITY_RADIUS;
}

/**
 * Upper bound on total players that can fit with non-overlapping bodies on a
 * map, before obstacle placement is known.
 *
 * @param mapSize - World side length in pixels.
 */
export function maxPlayersForMap(mapSize: number): number {
  const side = spawnUsableSide(mapSize);
  const pitch = minBodySpawnSeparation();
  if (side < pitch) return 1;
  return Math.max(1, Math.floor(spawnCapacityArea(mapSize) / (pitch * pitch)));
}

/**
 * Largest {@link PLAYER_COUNT_OPTIONS} entry that fits on the map.
 *
 * @param mapSize - World side length in pixels.
 */
export function maxSelectablePlayers(mapSize: number): number {
  const cap = maxPlayersForMap(mapSize);
  let best = PLAYER_COUNT_OPTIONS[0]!;
  for (const n of PLAYER_COUNT_OPTIONS) {
    if (n <= cap) best = n;
  }
  return best;
}

/**
 * Coerces arbitrary input into a valid {@link MatchSettings}.
 *
 * @param raw - Partial or parsed storage payload.
 * @returns A normalized settings object.
 */
export function normalizeMatchSettings(raw: Partial<MatchSettings>): MatchSettings {
  const mapSize = MAP_VALUES.has(raw.mapSize as number)
    ? (raw.mapSize as number)
    : DEFAULT_MATCH_SETTINGS.mapSize;
  let numPlayers = PLAYER_VALUES.has(raw.numPlayers as number)
    ? (raw.numPlayers as number)
    : DEFAULT_MATCH_SETTINGS.numPlayers;
  const playerCap = maxSelectablePlayers(mapSize);
  if (numPlayers > playerCap) numPlayers = playerCap;
  return { mapSize, numPlayers };
}

/**
 * AI opponents for a match.
 *
 * @param settings - Match settings.
 * @returns `numPlayers - 1`.
 */
export function numBots(settings: MatchSettings): number {
  return settings.numPlayers - 1;
}

/**
 * Opening safe-zone radius for a square map.
 *
 * @param mapSize - World side length in pixels.
 * @returns Radius that covers the map corners.
 */
export function zoneStartRadius(mapSize: number): number {
  return Math.ceil((mapSize / 2) * Math.SQRT2) + 30;
}
