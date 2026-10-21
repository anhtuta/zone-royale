/**
 * Projectiles.
 *
 * @packageDocumentation
 */

import type { Entity } from './entity';

/** A bullet in flight. */
export interface Bullet {
  /** Current X. */
  x: number;
  /** Current Y. */
  y: number;
  /** Muzzle X: on its first step the bullet travels from the shooter's centre to the muzzle. */
  nx: number;
  /** Muzzle Y. */
  ny: number;
  /** Velocity X (px/s). */
  vx: number;
  /** Velocity Y (px/s). */
  vy: number;
  /** Remaining flight time in seconds (range / speed). */
  life: number;
  /** Damage dealt on hit. */
  dmg: number;
  /** Who fired it (never hit by its own bullets). */
  owner: Entity;
  /** Weapon display name, for the kill feed. */
  weapon: string;
  /** Tracer color. */
  color: string;
  /** `true` until the centre-to-muzzle step has been processed. */
  first: boolean;
}
