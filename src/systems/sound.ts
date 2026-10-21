/**
 * Positional sound triggering with a per-step budget.
 *
 * @packageDocumentation
 */

import { SFX_MAX_DISTANCE } from '../config/constants';
import type { SoundKind, World } from '../core/world';
import { dist } from '../utils/math';

/**
 * Volume for a sound at a given distance from the listener.
 *
 * @param distance - Distance from the player in pixels.
 * @returns Linear gain, 0.22 at the listener falling to 0 at {@link SFX_MAX_DISTANCE}.
 */
export function soundVolume(distance: number): number {
  if (distance > SFX_MAX_DISTANCE) return 0;
  return Math.pow(1 - distance / SFX_MAX_DISTANCE, 1.5) * 0.22;
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
  const d = dist(x, y, world.player.x, world.player.y);
  if (d > SFX_MAX_DISTANCE) return;
  world.sfxBudget--;
  world.sound.play(kind, soundVolume(d), extra);
}
