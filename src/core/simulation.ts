/**
 * One fixed order of system updates per simulation step.
 *
 * This is the heart of the game loop and contains no DOM code, so a whole
 * match can be simulated headlessly (see `tests/simulation.test.ts`).
 *
 * @packageDocumentation
 */

import { SFX_PER_STEP } from '../config/constants';
import { updateBot } from '../systems/ai';
import { updateBullets } from '../systems/bullets';
import { resolveCollision, separateBodies } from '../systems/collision';
import { applyDamage } from '../systems/combat';
import { updateEffects } from '../systems/effects';
import { pushSystemFeed } from '../systems/feedback';
import { checkMatchEnd, resolveSpectateTarget, type MatchOutcome } from '../systems/match';
import { updatePlayer, type PlayerControls } from '../systems/player';
import { tickWeaponTimers } from '../systems/weapons';
import { handleZoneSupplyEvent } from '../systems/zoneLoot';
import { isOutsideZone, updateZone, zoneDps, zoneTickDamage } from '../systems/zone';
import type { World } from './world';

/**
 * Picks who the camera should follow: the player while alive, otherwise their
 * killer, otherwise any survivor.
 *
 * @param world - The game world (its `camTarget` may be updated).
 * @returns The entity to follow, or `null`.
 */
function updateCameraTarget(world: World): World['camTarget'] {
  if (world.player.alive) return world.player;
  world.camTarget = resolveSpectateTarget(world.camTarget, world.entities);
  return world.camTarget;
}

/**
 * Advances the world by one step. Order matters and mirrors the original
 * prototype: zone → player input → bots + timers + movement → separation →
 * map collision → zone damage → bullets → effects → camera → end check.
 *
 * @param world - The game world.
 * @param controls - Player input for this step.
 * @param dt - Step in seconds.
 * @returns The match outcome if the match ended during this step, otherwise `null`.
 */
export function stepWorld(world: World, controls: PlayerControls, dt: number): MatchOutcome | null {
  world.gameTime += dt;
  world.sfxBudget = SFX_PER_STEP;
  const zoneEvent = updateZone(world.zone, dt);
  if (zoneEvent === 'shrinkStarted') pushSystemFeed(world, 'The zone is closing in!');
  else if (zoneEvent) handleZoneSupplyEvent(world, zoneEvent);
  if (world.player.alive) updatePlayer(world, controls);
  for (const e of world.entities) {
    if (!e.alive) continue;
    if (e.ai) updateBot(world, e, dt);
    tickWeaponTimers(e, dt);
    e.hitFlash -= dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }
  separateBodies(world.entities);
  for (const e of world.entities)
    if (e.alive) resolveCollision(world.obstacles, e, world.mapSize);
  const dps = zoneDps(world.zone);
  for (const e of world.entities) {
    if (e.alive && isOutsideZone(world.zone, e.x, e.y)) {
      const dmg = zoneTickDamage(e, dt, dps);
      if (dmg > 0) applyDamage(world, e, dmg, null, null);
    }
  }
  updateBullets(world, dt);
  updateEffects(world, dt);
  const ct = updateCameraTarget(world);
  if (ct) world.camera.follow(ct, dt);
  const outcome = checkMatchEnd(world, dt);
  if (outcome) world.phase = outcome;
  return outcome;
}
