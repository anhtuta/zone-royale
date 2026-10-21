/**
 * Short-lived visual effect data: particles and floating damage numbers.
 *
 * @packageDocumentation
 */

/** A particle (blood, debris, muzzle flash). */
export interface Particle {
  /** X. */
  x: number;
  /** Y. */
  y: number;
  /** Velocity X. */
  vx: number;
  /** Velocity Y. */
  vy: number;
  /** Remaining life in seconds. */
  life: number;
  /** Initial life, used for fading. */
  max: number;
  /** Radius. */
  size: number;
  /** Fill color. */
  color: string;
  /** Muzzle flashes shrink as they fade. */
  flash?: boolean;
}

/** A floating damage number. */
export interface Floater {
  /** X. */
  x: number;
  /** Y (drifts upwards). */
  y: number;
  /** Text to show. */
  text: string;
  /** Remaining life in seconds. */
  life: number;
  /** Text color (blue while the target still has armor). */
  color: string;
}

/** A line in the kill feed. */
export type KillFeedEntry =
  | {
      /** Discriminator for kill lines. */
      sys?: undefined;
      /** Killer name, or `null` when the zone did it. */
      killer: string | null;
      /** Victim name. */
      victim: string;
      /** Weapon display name, or `null` for zone kills. */
      weapon: string | null;
      /** Killer is the player (blue highlight). */
      kp?: boolean;
      /** Victim is the player (red highlight). */
      vp: boolean;
      /** Remaining display time in seconds. */
      t: number;
    }
  | {
      /** System message text (e.g. "The zone is closing in!"). */
      sys: string;
      /** Remaining display time in seconds. */
      t: number;
    };

/** The centre-screen toast message. */
export interface Toast {
  /** Text. */
  text: string;
  /** Remaining display time in seconds. */
  t: number;
}
