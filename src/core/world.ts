/**
 * The game world: every piece of mutable match state in one plain object.
 *
 * Systems in `src/systems` read and mutate a {@link World}; renderers in
 * `src/render` and `src/ui` only read it. Nothing in here touches the DOM, so
 * a world can be created and simulated inside unit tests.
 *
 * @packageDocumentation
 */

import type { Camera } from './camera';
import type { Bullet } from '../entities/bullet';
import type { Floater, KillFeedEntry, Particle, Toast } from '../entities/effects';
import type { Entity } from '../entities/entity';
import type { LootItem } from '../entities/loot';
import type { Zone } from '../systems/zone';
import type { WeaponType } from '../config/weapons';
import type { Decor, House, Obstacle } from '../world/types';

/** High-level state of the game. */
export type GamePhase = 'start' | 'playing' | 'dead' | 'won';

/** Per-weapon gunshot SFX id (matches {@link WeaponType}). */
export type WeaponShotKind = `shot_${WeaponType}`;

/** Kinds of sound effect the game can request. */
export type SoundKind = WeaponShotKind | 'hit' | 'pickup' | 'death';

/** Abstract audio output so logic does not depend on the Web Audio API. */
export interface SoundSink {
  /**
   * Plays a sound effect.
   *
   * @param kind - Which effect.
   * @param volume - Linear gain (already attenuated by distance).
   * @param extra - Reserved for effect-specific parameters (unused for weapon shots).
   */
  play(kind: SoundKind, volume: number, extra?: number): void;
}

/** All mutable state of one match. */
export interface World {
  /** Current high-level state. */
  phase: GamePhase;
  /** Square play area side length in world pixels. */
  mapSize: number;
  /** Solid obstacles. */
  obstacles: Obstacle[];
  /** House footprints. */
  houses: House[];
  /** Ground decoration. */
  decor: Decor[];
  /** Loot lying on the ground. */
  loot: LootItem[];
  /** All combatants; index 0 is the player. */
  entities: Entity[];
  /** The human player. */
  player: Entity;
  /** Bullets in flight. */
  bullets: Bullet[];
  /** Visual particles. */
  particles: Particle[];
  /** Floating damage numbers. */
  floaters: Floater[];
  /** Kill feed lines (max 6). */
  killfeed: KillFeedEntry[];
  /** The safe zone. */
  zone: Zone;
  /** The camera (shared across matches). */
  camera: Camera;
  /** Who the camera follows after the player dies. */
  camTarget: Entity | null;
  /** When true, the match keeps simulating after the player dies until one bot remains. */
  spectating: boolean;
  /** Seconds since the match started. */
  gameTime: number;
  /** Unused legacy field (always `-1`). */
  endTimer: number;
  /** Screen-shake intensity in pixels. */
  shake: number;
  /** Centre-screen toast. */
  message: Toast;
  /** Sound effects still allowed this step. */
  sfxBudget: number;
  /** Audio output, or `null` before audio is unlocked / in tests. */
  sound: SoundSink | null;
}
