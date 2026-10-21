/**
 * Bot AI.
 *
 * Each step a bot:
 * 1. switches to a weapon that can still fire and reloads empty magazines;
 * 2. periodically scans for the closest visible enemy (or its last attacker);
 * 3. periodically picks a loot item it wants that is inside the zone;
 * 4. chooses a movement intent — fight (strafe at a preferred range),
 *    escape the zone, walk to loot, or wander towards the next safe circle;
 * 5. detects being stuck on geometry and takes a short detour;
 * 6. picks up wanted loot it walks over.
 *
 * The decision helpers are exported separately so they can be unit-tested.
 *
 * @packageDocumentation
 */

import { BOT_PICK_RANGE, BOT_SIGHT, BOT_SPEED, MAP_SIZE, TAU } from '../config/constants';
import { WEAPONS, type WeaponStats } from '../config/weapons';
import type { World } from '../core/world';
import { otherSlot, type BotBrain, type Entity } from '../entities/entity';
import { angleDelta, clamp, dist, dist2 } from '../utils/math';
import { rand, random } from '../utils/random';
import type { Obstacle } from '../world/types';
import { lineOfSight } from './collision';
import { applyLoot, botWants, nearestLoot } from './inventory';
import { hasAmmoFor, startReload, switchSlot, tryShoot } from './weapons';
import type { Zone } from './zone';

/** A 2D movement intent (not necessarily normalised). */
export interface MoveIntent {
  /** X component. */
  x: number;
  /** Y component. */
  y: number;
}

/** A circle in world space. */
export interface Circle {
  /** Centre X. */
  x: number;
  /** Centre Y. */
  y: number;
  /** Radius. */
  r: number;
}

/**
 * Finds the closest living enemy within sight range and line of sight. If
 * none is visible, falls back to the bot's last attacker when that attacker
 * is within 1.4× sight range and visible.
 *
 * @param b - The bot.
 * @param entities - All combatants.
 * @param obstacles - Map obstacles (for line of sight).
 * @returns The chosen target, or `null`.
 */
export function scanForTarget(
  b: Entity,
  entities: readonly Entity[],
  obstacles: readonly Obstacle[],
): Entity | null {
  let best: Entity | null = null;
  let bd = BOT_SIGHT * BOT_SIGHT;
  for (const o of entities) {
    if (o === b || !o.alive) continue;
    const d = dist2(b.x, b.y, o.x, o.y);
    if (d < bd && lineOfSight(obstacles, b.x, b.y, o.x, o.y)) {
      bd = d;
      best = o;
    }
  }
  const at = b.ai?.attacker ?? null;
  if (
    !best &&
    at &&
    at.alive &&
    dist2(b.x, b.y, at.x, at.y) < (BOT_SIGHT * 1.4) ** 2 &&
    lineOfSight(obstacles, b.x, b.y, at.x, at.y)
  ) {
    best = at;
  }
  return best;
}

/**
 * Distance a bot tries to keep from its target with a given weapon.
 *
 * @param ws - Weapon stats.
 * @returns Half the weapon range, capped at 420px.
 */
export function preferredRange(ws: WeaponStats): number {
  return Math.min(ws.range * 0.5, 420);
}

/**
 * Radial movement while fighting: close in when too far, back off when too
 * close, hold distance inside a ±60px band.
 *
 * @param distance - Current distance to the target.
 * @param preferred - Preferred distance (see {@link preferredRange}).
 * @returns `1` (approach), `-0.7` (retreat) or `0` (hold).
 */
export function combatRadial(distance: number, preferred: number): number {
  return distance > preferred + 60 ? 1 : distance < preferred - 60 ? -0.7 : 0;
}

/**
 * Magnitude of a bot's aim error.
 *
 * @param skill - Bot skill in [0, 1].
 * @param distance - Distance to the target.
 * @returns Error scale in radians; grows with distance and with lower skill.
 */
export function aimErrorScale(skill: number, distance: number): number {
  return (1 - skill) * 0.3 + 0.05 + distance / 4000;
}

/**
 * The circle bots should head for: the next zone target, or the current
 * circle once the zone has fully closed.
 *
 * @param zone - The zone.
 * @returns Centre and radius of the safe circle.
 */
export function safeCircle(zone: Zone): Circle {
  return zone.state === 'final'
    ? { x: zone.x, y: zone.y, r: zone.r }
    : { x: zone.tx, y: zone.ty, r: zone.tr };
}

/**
 * Whether a wandering bot should move into the next safe circle now: it is
 * outside 85% of that circle and the zone is shrinking or will start
 * shrinking within 18 seconds.
 *
 * @param x - Bot X.
 * @param y - Bot Y.
 * @param zone - The zone.
 * @returns `true` if the bot should prioritise safety.
 */
export function needsSafety(x: number, y: number, zone: Zone): boolean {
  const s = safeCircle(zone);
  return dist(x, y, s.x, s.y) > s.r * 0.85 && (zone.state === 'shrink' || zone.timer < 18);
}

/**
 * Whether a bot is outside (or within 30px of the edge of) the current zone.
 *
 * @param x - Bot X.
 * @param y - Bot Y.
 * @param zone - The zone.
 * @returns `true` if the bot should head back towards the zone centre.
 */
export function isNearZoneEdge(x: number, y: number, zone: Zone): boolean {
  return (dist(x, y, zone.x, zone.y) || 1) > zone.r - 30;
}

/**
 * Picks a new wander waypoint. In phase 1 (with no urgency) bots roam
 * within 500px of themselves; afterwards they roam inside 75% of the safe circle.
 *
 * @param b - The bot.
 * @param zone - The zone.
 * @param needSafe - Result of {@link needsSafety}.
 * @returns The waypoint, clamped inside the map.
 */
export function chooseWanderPoint(b: Entity, zone: Zone, needSafe: boolean): MoveIntent {
  let cx = b.x;
  let cy = b.y;
  let rr = 500;
  if (needSafe || zone.phase > 0) {
    const s = safeCircle(zone);
    cx = s.x;
    cy = s.y;
    rr = Math.max(10, s.r * 0.75);
  }
  const a = rand(0, TAU);
  const d = Math.sqrt(random()) * rr;
  return {
    x: clamp(cx + Math.cos(a) * d, 60, MAP_SIZE - 60),
    y: clamp(cy + Math.sin(a) * d, 60, MAP_SIZE - 60),
  };
}

/**
 * Adds a weighted unit vector pointing from (fromX, fromY) to (x, y) into `m`.
 *
 * @param m - Intent accumulator (mutated).
 * @param fromX - Origin X.
 * @param fromY - Origin Y.
 * @param x - Destination X.
 * @param y - Destination Y.
 * @param w - Weight.
 */
export function steerTowards(
  m: MoveIntent,
  fromX: number,
  fromY: number,
  x: number,
  y: number,
  w: number,
): void {
  const d = dist(fromX, fromY, x, y) || 1;
  m.x += ((x - fromX) / d) * w;
  m.y += ((y - fromY) / d) * w;
}

/**
 * Ticks the brain's timers.
 *
 * @param ai - Bot memory.
 * @param dt - Step in seconds.
 */
function tickTimers(ai: BotBrain, dt: number): void {
  ai.retarget -= dt;
  ai.lootT -= dt;
  ai.wanderT -= dt;
  ai.react -= dt;
}

/**
 * Fighting behaviour: aims (with lead and noise), shoots when ready and in
 * range, and strafes while keeping the preferred distance.
 *
 * @param world - The game world.
 * @param b - The bot.
 * @param ai - Its memory.
 * @param t - Target.
 * @param ws - Active weapon stats.
 * @param outside - Whether the bot is near/outside the zone edge.
 * @param dt - Step in seconds.
 * @returns The movement intent.
 */
function fight(
  world: World,
  b: Entity,
  ai: BotBrain,
  t: Entity,
  ws: WeaponStats,
  outside: boolean,
  dt: number,
): MoveIntent {
  const d = dist(b.x, b.y, t.x, t.y) || 1;
  const err = aimErrorScale(ai.skill, d);
  ai.aimNoise += (rand(-1, 1) * err - ai.aimNoise) * Math.min(1, dt * 5);
  const lead = (d / ws.speed) * ai.skill;
  b.angle = Math.atan2(t.y + t.vy * lead - b.y, t.x + t.vx * lead - b.x) + ai.aimNoise;
  if (ai.react <= 0 && d < ws.range * 0.95) tryShoot(world, b);
  const fx = (t.x - b.x) / d;
  const fy = (t.y - b.y) / d;
  const radial = combatRadial(d, preferredRange(ws));
  ai.strafeT -= dt;
  if (ai.strafeT <= 0) {
    ai.strafe = random() < 0.5 ? -1 : 1;
    ai.strafeT = rand(0.5, 1.5);
  }
  const m: MoveIntent = {
    x: fx * radial - fy * ai.strafe * 0.8,
    y: fy * radial + fx * ai.strafe * 0.8,
  };
  if (b.hp < 30 && ai.loot && ai.loot.kind === 'health')
    steerTowards(m, b.x, b.y, ai.loot.x, ai.loot.y, 1.2);
  if (outside) steerTowards(m, b.x, b.y, world.zone.x, world.zone.y, 2);
  return m;
}

/**
 * Non-fighting behaviour: escape the zone, go to loot, or wander; flee from
 * a visible enemy when unarmed.
 *
 * @param world - The game world.
 * @param b - The bot.
 * @param ai - Its memory.
 * @param outside - Whether the bot is near/outside the zone edge.
 * @returns The movement intent.
 */
function roam(world: World, b: Entity, ai: BotBrain, outside: boolean): MoveIntent {
  const zone = world.zone;
  const m: MoveIntent = { x: 0, y: 0 };
  if (outside) steerTowards(m, b.x, b.y, zone.x, zone.y, 1);
  else if (ai.loot) steerTowards(m, b.x, b.y, ai.loot.x, ai.loot.y, 1);
  else {
    const s = safeCircle(zone);
    const needSafe = needsSafety(b.x, b.y, zone);
    if (
      ai.wanderT <= 0 ||
      dist2(b.x, b.y, ai.wx, ai.wy) < 40 * 40 ||
      (needSafe && dist(ai.wx, ai.wy, s.x, s.y) > s.r * 0.85)
    ) {
      ai.wanderT = rand(3, 7);
      const p = chooseWanderPoint(b, zone, needSafe);
      ai.wx = p.x;
      ai.wy = p.y;
    }
    steerTowards(m, b.x, b.y, ai.wx, ai.wy, needSafe ? 1 : 0.75);
  }
  if (ai.target) {
    // unarmed with an enemy in sight: back away
    const t = ai.target;
    const d = dist(b.x, b.y, t.x, t.y) || 1;
    m.x -= ((t.x - b.x) / d) * 0.8;
    m.y -= ((t.y - b.y) / d) * 0.8;
  }
  return m;
}

/**
 * Detects a bot that has barely moved for 0.5s while trying to walk and
 * starts a 0.5–1s detour at an angle away from its intended direction.
 *
 * @param b - The bot.
 * @param ai - Its memory.
 * @param m - Current movement intent.
 * @param mag - Magnitude of `m`.
 * @param dt - Step in seconds.
 */
function checkStuck(b: Entity, ai: BotBrain, m: MoveIntent, mag: number, dt: number): void {
  ai.stuckT -= dt;
  if (ai.stuckT > 0) return;
  ai.stuckT = 0.5;
  if (mag > 0.3 && dist2(b.x, b.y, ai.lx, ai.ly) < 22 * 22 && ai.avoidT <= 0) {
    const a = Math.atan2(m.y, m.x) + (random() < 0.5 ? 1 : -1) * rand(1.2, 2.2);
    ai.ax = Math.cos(a);
    ai.ay = Math.sin(a);
    ai.avoidT = rand(0.5, 1.0);
  }
  ai.lx = b.x;
  ai.ly = b.y;
}

/**
 * Runs one AI step for a bot: updates its memory, aim, velocity and may
 * shoot, reload, switch weapons or pick up loot.
 *
 * @param world - The game world.
 * @param b - The bot (must have a brain).
 * @param dt - Step in seconds.
 */
export function updateBot(world: World, b: Entity, dt: number): void {
  const ai = b.ai;
  if (!ai) return;
  const zone = world.zone;
  tickTimers(ai, dt);
  if (!hasAmmoFor(b, b.slot) && hasAmmoFor(b, otherSlot(b.slot))) switchSlot(b, otherSlot(b.slot));
  const cw = b.weapons[b.slot];
  const armed = hasAmmoFor(b, b.slot);
  if (cw && cw.mag === 0 && b.reloading <= 0) startReload(b);

  if (ai.retarget <= 0) {
    ai.retarget = rand(0.15, 0.35);
    const best = scanForTarget(b, world.entities, world.obstacles);
    if (best !== ai.target) {
      ai.target = best;
      ai.react = rand(0.45, 0.9) / ai.skill;
    }
  }
  if (ai.target && !ai.target.alive) ai.target = null;
  if (ai.loot && ai.loot.gone) ai.loot = null;
  if (ai.lootT <= 0) {
    ai.lootT = rand(0.8, 1.4);
    ai.loot = nearestLoot(
      world.loot,
      b.x,
      b.y,
      750,
      (it) => botWants(b, it) && dist(it.x, it.y, zone.x, zone.y) < zone.r - 20,
    );
  }

  const outside = isNearZoneEdge(b.x, b.y, zone);
  const fighting = !!(ai.target && armed && cw);
  let m =
    fighting && ai.target && cw
      ? fight(world, b, ai, ai.target, WEAPONS[cw.type], outside, dt)
      : roam(world, b, ai, outside);

  if (ai.avoidT > 0) {
    ai.avoidT -= dt;
    m = { x: ai.ax, y: ai.ay };
  }
  const mag = Math.hypot(m.x, m.y);
  const sp = BOT_SPEED * (mag > 1 ? 1 : mag);
  if (mag > 0.01) {
    b.vx = (m.x / mag) * sp;
    b.vy = (m.y / mag) * sp;
  } else {
    b.vx = 0;
    b.vy = 0;
  }
  if (!fighting && mag > 0.01)
    b.angle += angleDelta(b.angle, Math.atan2(m.y, m.x)) * Math.min(1, dt * 8);
  checkStuck(b, ai, m, mag, dt);
  for (const it of world.loot) {
    if (dist2(b.x, b.y, it.x, it.y) < BOT_PICK_RANGE * BOT_PICK_RANGE && botWants(b, it)) {
      applyLoot(world, b, it);
      ai.lootT = 0;
      break;
    }
  }
}
