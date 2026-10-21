/**
 * Applying the human player's input to the player entity.
 *
 * @packageDocumentation
 */

import { AMMO_AUTO_PICK_RANGE, PLAYER_SPEED } from '../config/constants';
import { WEAPONS } from '../config/weapons';
import type { World } from '../core/world';
import { dist2 } from '../utils/math';
import { applyLoot } from './inventory';
import { tryShoot } from './weapons';

/** Input for one simulation step, already translated out of DOM events. */
export interface PlayerControls {
  /** Horizontal movement: -1 (left), 0 or 1 (right). */
  moveX: number;
  /** Vertical movement: -1 (up), 0 or 1 (down). */
  moveY: number;
  /** World X the player is aiming at. */
  aimX: number;
  /** World Y the player is aiming at. */
  aimY: number;
  /** Fire button is held down (automatic weapons keep firing). */
  fireHeld: boolean;
  /** Fire button was pressed since the previous frame. */
  firePressed: boolean;
}

/** Controls that do nothing (used for headless simulation and tests). */
export const IDLE_CONTROLS: Readonly<PlayerControls> = {
  moveX: 0,
  moveY: 0,
  aimX: 0,
  aimY: 0,
  fireHeld: false,
  firePressed: false,
};

/**
 * Converts a movement direction into a velocity at {@link PLAYER_SPEED},
 * normalising diagonals so they are not faster.
 *
 * @param mx - Horizontal direction.
 * @param my - Vertical direction.
 * @returns Velocity in px/s.
 */
export function playerVelocity(mx: number, my: number): { vx: number; vy: number } {
  const m = Math.hypot(mx, my) || 1;
  return { vx: (mx / m) * PLAYER_SPEED, vy: (my / m) * PLAYER_SPEED };
}

/**
 * Applies one step of player input: movement, aiming, shooting and
 * automatic ammo pickup.
 *
 * @param world - The game world.
 * @param c - Controls for this step.
 */
export function updatePlayer(world: World, c: PlayerControls): void {
  const p = world.player;
  const v = playerVelocity(c.moveX, c.moveY);
  p.vx = v.vx;
  p.vy = v.vy;
  p.angle = Math.atan2(c.aimY - p.y, c.aimX - p.x);
  const w = p.weapons[p.slot];
  if (w) {
    const WS = WEAPONS[w.type];
    if ((WS.auto && c.fireHeld) || c.firePressed) tryShoot(world, p);
  }
  for (const it of world.loot) {
    if (
      it.kind === 'ammo' &&
      dist2(p.x, p.y, it.x, it.y) < AMMO_AUTO_PICK_RANGE * AMMO_AUTO_PICK_RANGE
    ) {
      applyLoot(world, p, it);
      break;
    }
  }
}
