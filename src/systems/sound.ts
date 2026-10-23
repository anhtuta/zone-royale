/**
 * Positional sound triggering with a per-step budget.
 *
 * @packageDocumentation
 */

import { SFX_LISTENER_GAIN, SFX_MAX_DISTANCE } from '../config/constants';
import type { WeaponType } from '../config/weapons';
import type { SoundKind, WeaponShotKind, World } from '../core/world';
import { dist } from '../utils/math';

/**
 * World position used for positional SFX (earshot checks and volume falloff).
 *
 * @param world - The game world.
 * @returns Listener X/Y — the player while alive, otherwise the spectate target.
 */
export function soundListenerPosition(world: World): { x: number; y: number } {
  const ear =
    !world.player.alive && world.spectating && world.camTarget ? world.camTarget : world.player;
  return { x: ear.x, y: ear.y };
}

/**
 * Volume for a sound at a given distance from the listener.
 *
 * @param distance - Distance from the player in pixels.
 * @returns Linear gain, {@link SFX_LISTENER_GAIN} at the listener falling to 0 at {@link SFX_MAX_DISTANCE}.
 */
export function soundVolume(distance: number): number {
  if (distance > SFX_MAX_DISTANCE) return 0;
  return Math.pow(1 - distance / SFX_MAX_DISTANCE, 1.5) * SFX_LISTENER_GAIN;
}

/** Maps a {@link WeaponType} to its dedicated shot {@link SoundKind}. */
export function weaponShotKind(type: WeaponType): WeaponShotKind {
  return `shot_${type}`;
}

/**
 * Requests a weapon gunshot at a world position (see {@link emitSound}).
 *
 * @param world - The game world.
 * @param weapon - Which weapon fired.
 * @param x - Source X.
 * @param y - Source Y.
 */
export function emitWeaponShot(world: World, weapon: WeaponType, x: number, y: number): void {
  emitSound(world, weaponShotKind(weapon), x, y);
}

/**
 * Requests a sound effect at a world position. Sounds out of earshot, or
 * beyond this step's budget, are dropped.
 *
 * @param world - The game world.
 * @param kind - Which effect.
 * @param x - Source X.
 * @param y - Source Y.
 * @param extra - Effect-specific parameter (see {@link SoundSink.play}).
 */
export function emitSound(
  world: World,
  kind: SoundKind,
  x: number,
  y: number,
  extra?: number,
): void {
  if (!world.sound || world.sfxBudget <= 0) return;
  const ear = soundListenerPosition(world);
  const d = dist(x, y, ear.x, ear.y);
  if (d > SFX_MAX_DISTANCE) return;
  world.sfxBudget--;
  world.sound.play(kind, soundVolume(d), extra);
}
