/**
 * Match lifecycle: spawning a new match, end conditions and the end summary.
 *
 * @packageDocumentation
 */

import { MAP_SIZE, NUM_BOTS, PLAYER_COLOR } from '../config/constants';
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

/** How a match ended for the player. */
export type MatchOutcome = 'won' | 'dead';

/**
 * Finds a spawn point on open ground, outside houses and at least `minDist`
 * from every existing entity. After 300 failed attempts the spacing rule is
 * dropped so a point is always returned.
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
): { x: number; y: number } {
  for (let tries = 0; tries < 300; tries++) {
    const x = rand(120, MAP_SIZE - 120);
    const y = rand(120, MAP_SIZE - 120);
    if (inHouse(houses, x, y, 30) || !circleFree(obstacles, x, y, 30)) continue;
    if (entities.some((e) => dist2(e.x, e.y, x, y) < minDist * minDist)) continue;
    return { x, y };
  }
  for (;;) {
    const x = rand(120, MAP_SIZE - 120);
    const y = rand(120, MAP_SIZE - 120);
    if (circleFree(obstacles, x, y, 30)) return { x, y };
  }
}

/**
 * Builds a brand-new match: map, loot, the player, {@link NUM_BOTS} bots and
 * the zone. The camera is snapped onto the player.
 *
 * @param camera - Camera to use (kept across matches).
 * @param sound - Audio output, or `null` for silent/headless play.
 * @returns A world in the `playing` phase.
 */
export function createMatch(camera: Camera, sound: SoundSink | null = null): World {
  const map = generateMap();
  const loot = spawnInitialLoot(map.houses, map.obstacles);
  const entities: Entity[] = [];
  let p = findSpawnPoint(map.obstacles, map.houses, entities, 0);
  const player = createEntity(true, 'You', PLAYER_COLOR, p.x, p.y);
  entities.push(player);
  const names = shuffled(BOT_NAMES);
  for (let i = 0; i < NUM_BOTS; i++) {
    p = findSpawnPoint(map.obstacles, map.houses, entities, BOT_SPAWN_SPACING);
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
  const zone = createZone();
  camera.centerOn(player);
  return {
    phase: 'playing',
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
    gameTime: 0,
    endTimer: -1,
    shake: 0,
    message: { text: 'Find weapons and survive the zone!', t: 3.5 },
    sfxBudget: 0,
    sound,
  };
}

/**
 * Checks the end conditions after a simulation step:
 * - the player wins as soon as they are the last one alive (placement #1);
 * - after the player dies a short countdown runs before the defeat screen.
 *
 * @param world - The game world (its `endTimer` is advanced).
 * @param dt - Step in seconds.
 * @returns The outcome once the match is over, otherwise `null`.
 */
export function checkMatchEnd(world: World, dt: number): MatchOutcome | null {
  const alive = countAlive(world.entities);
  const p = world.player;
  if (p.alive && alive === 1) {
    p.place = 1;
    return 'won';
  }
  if (!p.alive && world.endTimer > 0) {
    world.endTimer -= dt;
    if (world.endTimer <= 0) return 'dead';
  }
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
