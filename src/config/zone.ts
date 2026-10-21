/**
 * Safe-zone phase table.
 *
 * @packageDocumentation
 */

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

/** The six phases of a match, in order. The last phase closes to radius 0. */
export const PHASES: readonly ZonePhase[] = [
  { wait: 45, shrink: 30, r: 1050, dps: 1 },
  { wait: 30, shrink: 22, r: 650, dps: 2 },
  { wait: 25, shrink: 18, r: 380, dps: 4 },
  { wait: 20, shrink: 15, r: 200, dps: 6 },
  { wait: 15, shrink: 12, r: 80, dps: 9 },
  { wait: 10, shrink: 10, r: 0, dps: 14 },
];

/** Multiplier applied to the last phase's damage once the zone is fully closed. */
export const FINAL_ZONE_DPS_MULTIPLIER = 1.5;

/** How far (as a fraction of the radius difference) the first phase's centre may drift. */
export const FIRST_PHASE_DRIFT = 0.35;

/** How far (as a fraction of the radius difference) later phases' centres may drift. */
export const LATER_PHASE_DRIFT = 0.8;
