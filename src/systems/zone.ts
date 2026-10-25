/**
 * The shrinking safe zone: phase progression, interpolation and damage.
 *
 * @packageDocumentation
 */

import { TAU, ZONE_TICK } from '../config/constants';
import { zoneStartRadius } from '../config/matchSettings';
import {
  buildZonePhases,
  FINAL_ZONE_DPS_MULTIPLIER,
  FIRST_PHASE_DRIFT,
  LATER_PHASE_DRIFT,
  type ZonePhase,
} from '../config/zone';
import { clamp, dist, lerp } from '../utils/math';
import { rand, random } from '../utils/random';

/** What the zone is doing right now. */
export type ZoneState = 'wait' | 'shrink' | 'final';

/** The safe circle plus the circle it is shrinking towards. */
export interface Zone {
  /** Square map side length this zone belongs to. */
  mapSize: number;
  /** Wait/shrink schedule for this match. */
  phases: readonly ZonePhase[];
  /** Current centre X. */
  x: number;
  /** Current centre Y. */
  y: number;
  /** Current radius. */
  r: number;
  /** Index into {@link Zone.phases}. */
  phase: number;
  /** Current state. */
  state: ZoneState;
  /** Seconds left in the current wait or shrink. */
  timer: number;
  /** Target centre X. */
  tx: number;
  /** Target centre Y. */
  ty: number;
  /** Target radius. */
  tr: number;
  /** Centre X when the shrink started. */
  sx: number;
  /** Centre Y when the shrink started. */
  sy: number;
  /** Radius when the shrink started. */
  sr: number;
}

/** Events {@link updateZone} can report back to the caller. */
export type ZoneEvent = 'shrinkStarted' | 'phaseAdvanced' | 'closed';

/**
 * Creates the initial zone covering the whole map and prepares phase 1.
 *
 * @param mapSize - World width and height in pixels.
 * @returns A zone in the `wait` state of phase 0.
 */
export function createZone(mapSize: number): Zone {
  const startR = zoneStartRadius(mapSize);
  const phases = buildZonePhases(startR);
  const zone: Zone = {
    mapSize,
    phases,
    x: mapSize / 2,
    y: mapSize / 2,
    r: startR,
    phase: 0,
    state: 'wait',
    timer: 0,
    tx: 0,
    ty: 0,
    tr: 0,
    sx: 0,
    sy: 0,
    sr: 0,
  };
  setupPhase(zone);
  return zone;
}

/**
 * Starts the wait period of `zone.phase` and picks the next (smaller) circle.
 * The new circle always lies inside the map and is offset from the current
 * centre by a random amount.
 *
 * @param zone - Zone to mutate.
 */
export function setupPhase(zone: Zone): void {
  const P = zone.phases[zone.phase];
  if (!P) return;
  zone.state = 'wait';
  zone.timer = P.wait;
  const maxOff =
    Math.max(0, zone.r - P.r) * (zone.phase === 0 ? FIRST_PHASE_DRIFT : LATER_PHASE_DRIFT);
  const a = rand(0, TAU);
  const d = Math.sqrt(random()) * maxOff;
  const m = Math.min(P.r + 60, zone.mapSize / 2);
  zone.tx = clamp(zone.x + Math.cos(a) * d, m, zone.mapSize - m);
  zone.ty = clamp(zone.y + Math.sin(a) * d, m, zone.mapSize - m);
  zone.tr = P.r;
}

/**
 * Advances the zone by `dt` seconds: counts down the wait, then interpolates
 * the centre and radius towards the target during the shrink, then moves to
 * the next phase (or the `final` state after the last one).
 *
 * @param zone - Zone to mutate.
 * @param dt - Step in seconds.
 * @returns An event if a transition happened this step, otherwise `null`.
 */
export function updateZone(zone: Zone, dt: number): ZoneEvent | null {
  if (zone.state === 'final') return null;
  zone.timer -= dt;
  const P = zone.phases[zone.phase];
  if (!P) return null;
  if (zone.state === 'wait') {
    if (zone.timer <= 0) {
      zone.state = 'shrink';
      zone.timer = P.shrink;
      zone.sx = zone.x;
      zone.sy = zone.y;
      zone.sr = zone.r;
      return 'shrinkStarted';
    }
  } else {
    const k = 1 - Math.max(0, zone.timer) / P.shrink;
    zone.x = lerp(zone.sx, zone.tx, k);
    zone.y = lerp(zone.sy, zone.ty, k);
    zone.r = lerp(zone.sr, zone.tr, k);
    if (zone.timer <= 0) {
      zone.x = zone.tx;
      zone.y = zone.ty;
      zone.r = zone.tr;
      if (zone.phase < zone.phases.length - 1) {
        zone.phase++;
        setupPhase(zone);
        return 'phaseAdvanced';
      }
      zone.state = 'final';
      return 'closed';
    }
  }
  return null;
}

/**
 * Damage per second dealt outside the zone right now.
 *
 * @param zone - The zone.
 * @returns The phase's dps, ×1.5 once the zone has fully closed.
 */
export function zoneDps(zone: Zone): number {
  const P = zone.phases[zone.phase] ?? zone.phases[zone.phases.length - 1];
  return (P ? P.dps : 0) * (zone.state === 'final' ? FINAL_ZONE_DPS_MULTIPLIER : 1);
}

/**
 * Whether a point is outside the safe circle.
 *
 * @param zone - The zone.
 * @param x - Point X.
 * @param y - Point Y.
 * @returns `true` if strictly outside the radius.
 */
export function isOutsideZone(zone: Zone, x: number, y: number): boolean {
  return dist(x, y, zone.x, zone.y) > zone.r;
}

/**
 * Accumulates time spent outside the zone and returns the damage to apply
 * this step. Damage is dealt in ticks every {@link ZONE_TICK} seconds.
 *
 * @param holder - Object holding the tick accumulator (an entity).
 * @param dt - Step in seconds.
 * @param dps - Current zone damage per second.
 * @returns Damage to apply now (0 if no tick elapsed).
 */
export function zoneTickDamage(holder: { zoneTick: number }, dt: number, dps: number): number {
  holder.zoneTick += dt;
  if (holder.zoneTick >= ZONE_TICK) {
    holder.zoneTick -= ZONE_TICK;
    return dps * ZONE_TICK;
  }
  return 0;
}

/**
 * Total length of a match's zone schedule (all waits and shrinks).
 *
 * @param zone - Zone whose phase table to sum.
 * @returns Seconds from match start until the zone fully closes.
 */
export function totalZoneDuration(zone: Zone): number {
  return zone.phases.reduce((s, p) => s + p.wait + p.shrink, 0);
}
