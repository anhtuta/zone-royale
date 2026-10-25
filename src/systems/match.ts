/**
 * Match lifecycle: spawning a new match, end conditions and the end summary.
 *
 * @packageDocumentation
 */

import { PLAYER_COLOR } from '../config/constants';
import {
  DEFAULT_MATCH_SETTINGS,
  minBodySpawnSeparation,
  normalizeMatchSettings,
  numBots,
  SPAWN_EDGE_MARGIN,
  spawnCapacityArea,
  spawnUsableSide,
  type MatchSettings,
} from '../config/matchSettings';
import { BOT_COLORS, BOT_NAMES } from '../config/bots';
import type { Camera } from '../core/camera';
import type { SoundSink, World } from '../core/world';
import { createEntity, type Entity } from '../entities/entity';
import { dist2, formatTime } from '../utils/math';
import { rand, shuffled } from '../utils/random';
import { generateMap } from '../world/mapgen';
import type { House, Obstacle } from '../world/types';
import { circleFree, inHouse } from './collision';
import { countAlive } from './combat';
import { spawnInitialLoot } from './lootSpawner';
import { createZone } from './zone';

/** Minimum distance between bot spawn points. */
export const BOT_SPAWN_SPACING = 420;

/** Spawn clearance radius checked against obstacles and houses. */
const SPAWN_CLEARANCE = 30;

/**
 * Bot spawn spacing for a map and headcount: prefers {@link BOT_SPAWN_SPACING}
 * but shrinks on small or crowded maps so placement can succeed.
 */
export function botSpawnSpacing(mapSize: number, numPlayers: number): number {
  const body = minBodySpawnSeparation();
  const side = spawnUsableSide(mapSize);
  const densityCap = Math.sqrt(spawnCapacityArea(mapSize) / numPlayers);
  const ideal = (side / Math.sqrt(numPlayers)) * 0.82;
  const preferred = Math.min(BOT_SPAWN_SPACING, Math.max(body, ideal));
  return Math.max(body, Math.min(preferred, densityCap));
}

/** How a match ended for the player. */
export type MatchOutcome = 'won' | 'dead';

/**
 * Finds a spawn point on open ground, outside houses and at least `minDist`
 * from every existing entity (never less than non-overlapping body separation).
 * It is only used to place the player and bots, not to place obstacles.
 *
 * @param obstacles - Map obstacles.
 * @param houses - House footprints.
 * @param entities - Already spawned entities.
 * @param minDist - Required spacing from other entities.
 * @returns A free spawn point.
 */
export function findSpawnPoint(
  obstacles: readonly Obstacle[],
  houses: readonly House[],
  entities: readonly Entity[],
  minDist: number,
  mapSize: number,
): { x: number; y: number } {
  const sep = Math.max(minDist, minBodySpawnSeparation());
  const margin = SPAWN_EDGE_MARGIN;
  for (let tries = 0; tries < 5000; tries++) {
    const x = rand(margin, mapSize - margin);
    const y = rand(margin, mapSize - margin);
    if (inHouse(houses, x, y, SPAWN_CLEARANCE) || !circleFree(obstacles, x, y, SPAWN_CLEARANCE, mapSize))
      continue;
    if (entities.some((e) => dist2(e.x, e.y, x, y) < sep * sep)) continue;
    return { x, y };
  }
  throw new Error(
    'findSpawnPoint: no spawn with separation ' + sep + ' on map ' + mapSize,
  );
}

/**
 * Builds a brand-new match: map, loot, the player, bots and the zone. The
 * camera is snapped onto the player.
 *
 * @param camera - Camera to use (kept across matches).
 * @param sound - Audio output, or `null` for silent/headless play.
 * @param settings - Map size and player count.
 * @returns A world in the `playing` phase.
 */
export function createMatch(
  camera: Camera,
  sound: SoundSink | null = null,
  settings: MatchSettings = DEFAULT_MATCH_SETTINGS,
): World {
  const resolved = normalizeMatchSettings(settings);
  const mapSize = resolved.mapSize;
  const botCount = numBots(resolved);
  const botSpacing = botSpawnSpacing(mapSize, resolved.numPlayers);
  const map = generateMap(mapSize);
  const loot = spawnInitialLoot(map.houses, map.obstacles, mapSize);
  const entities: Entity[] = [];
  let p = findSpawnPoint(map.obstacles, map.houses, entities, 0, mapSize);
  const player = createEntity(true, 'You', PLAYER_COLOR, p.x, p.y);
  entities.push(player);
  const names = shuffled(BOT_NAMES);
  for (let i = 0; i < botCount; i++) {
    p = findSpawnPoint(map.obstacles, map.houses, entities, botSpacing, mapSize);
    entities.push(
      createEntity(
        false,
        names[i % names.length] as string,
        BOT_COLORS[i % BOT_COLORS.length] as string,
        p.x,
        p.y,
      ),
    );
  }
  const zone = createZone(mapSize);
  camera.centerOn(player);
  return {
    phase: 'playing',
    mapSize,
    obstacles: map.obstacles,
    houses: map.houses,
    decor: map.decor,
    loot,
    entities,
    player,
    bullets: [],
    particles: [],
    floaters: [],
    killfeed: [],
    zone,
    camera,
    camTarget: player,
    spectating: false,
    gameTime: 0,
    endTimer: -1,
    shake: 0,
    message: { text: 'Find weapons and survive the zone!', t: 3.5 },
    sfxBudget: 0,
    sound,
  };
}

/**
 * Picks a bot to spectate: keep the current target while it is alive, otherwise
 * the surviving bot with the most kills.
 *
 * @param camTarget - Current follow target (usually the player's killer).
 * @param entities - All combatants.
 * @returns A living bot to follow, or `null` if none remain.
 */
export function resolveSpectateTarget(
  camTarget: Entity | null,
  entities: readonly Entity[],
): Entity | null {
  if (camTarget?.alive && !camTarget.isPlayer) return camTarget;
  let best: Entity | null = null;
  for (const e of entities) {
    if (!e.alive || e.isPlayer) continue;
    if (!best || e.kills > best.kills) best = e;
  }
  return best;
}

/**
 * Checks the end conditions after a simulation step:
 * - the player wins as soon as they are the last one alive (placement #1);
 * - while spectating after death, the match ends when at most one combatant
 *   remains (including none, e.g. zone damage killing everyone in one step).
 *
 * @param world - The game world.
 * @param _dt - Step in seconds (unused; kept for a stable call site).
 * @returns The outcome once the match is over, otherwise `null`.
 */
export function checkMatchEnd(world: World, _dt: number): MatchOutcome | null {
  const alive = countAlive(world.entities);
  const p = world.player;
  if (p.alive && alive === 1) {
    p.place = 1;
    return 'won';
  }
  if (!p.alive && world.spectating && alive <= 1) return 'dead';
  return null;
}

/** Texts shown on the end screen. */
export interface EndSummary {
  /** Big title. */
  title: string;
  /** Sub-title sentence. */
  subtitle: string;
  /** Placement, e.g. `"#3"`. */
  place: string;
  /** Player kills. */
  kills: string;
  /** Damage dealt, rounded. */
  damage: string;
  /** Time survived as `m:ss`. */
  time: string;
}

/**
 * Builds the end-screen texts for the player.
 *
 * @param world - The finished world.
 * @param outcome - How the match ended.
 * @returns The summary.
 */
export function buildEndSummary(world: World, outcome: MatchOutcome): EndSummary {
  const p = world.player;
  const win = outcome === 'won';
  return {
    title: win ? 'WINNER! #1' : 'ELIMINATED',
    subtitle: win
      ? 'Last one standing. The zone bows to you.'
      : 'You placed #' +
        p.place +
        ' of ' +
        world.entities.length +
        '. Drop back in and claim the crown.',
    place: '#' + p.place,
    kills: String(p.kills),
    damage: String(Math.round(p.damage)),
    time: formatTime(win ? world.gameTime : p.diedAt),
  };
}
