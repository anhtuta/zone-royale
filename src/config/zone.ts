/**
 * Safe-zone phase table.
 *
 * @packageDocumentation
 */

import { DEFAULT_MATCH_SETTINGS, zoneStartRadius } from './matchSettings';

/** Tuning for one zone phase. */
export interface ZonePhase {
  /** Seconds the zone holds still before it starts shrinking. */
  readonly wait: number;
  /** Seconds the shrink animation takes. */
  readonly shrink: number;
  /** Radius the zone shrinks to by the end of this phase. */
  readonly r: number;
  /** Damage per second dealt to anyone outside the zone during this phase. */
  readonly dps: number;
}

/**
 * Safe radius after each shrink, as a fraction of the opening radius
 * (last entry → fully closed).
 */
const PHASE_END_RADIUS_FRAC: readonly number[] = [0.5, 0.3, 0.18, 0.1, 0.04, 0];

const PHASE_TIMING: readonly Omit<ZonePhase, 'r'>[] = [
  { wait: 45, shrink: 30, dps: 1 },
  { wait: 30, shrink: 22, dps: 2 },
  { wait: 25, shrink: 18, dps: 4 },
  { wait: 20, shrink: 15, dps: 6 },
  { wait: 15, shrink: 12, dps: 9 },
  { wait: 10, shrink: 10, dps: 14 },
];

/** Maps a fraction of the opening radius to an integer phase end radius. */
function scaledPhaseRadius(frac: number, startRadius: number): number {
  return frac === 0 ? 0 : Math.round(startRadius * frac);
}

/**
 * Builds the six zone phases for a match from its opening safe radius.
 *
 * @param startRadius - Radius at match start ({@link zoneStartRadius}).
 * @returns Phase table with scaled end radii.
 */
export function buildZonePhases(startRadius: number): readonly ZonePhase[] {
  return PHASE_TIMING.map((phase, i) => ({
    ...phase,
    r: scaledPhaseRadius(PHASE_END_RADIUS_FRAC[i]!, startRadius),
  }));
}

/** Default phase table (medium map). Used in tests and docs. */
export const PHASES = buildZonePhases(zoneStartRadius(DEFAULT_MATCH_SETTINGS.mapSize));

/** Multiplier applied to the last phase's damage once the zone is fully closed. */
export const FINAL_ZONE_DPS_MULTIPLIER = 1.5;

/** How far (as a fraction of the radius difference) the first phase's centre may drift. */
export const FIRST_PHASE_DRIFT = 0.35;

/** How far (as a fraction of the radius difference) later phases' centres may drift. */
export const LATER_PHASE_DRIFT = 0.8;
