/**
 * Weapon handling: slot switching, reloading and firing.
 *
 * @packageDocumentation
 */

import { AMMO_NAMES, WEAPONS } from '../config/weapons';
import type { World } from '../core/world';
import type { Bullet } from '../entities/bullet';
import type { Entity, SlotIndex } from '../entities/entity';
import { rand, random } from '../utils/random';
import { showMessage } from './feedback';
import { emitSound } from './sound';

/** Delay after switching weapons before the new one can fire. */
export const SWITCH_DELAY = 0.25;

/** Speed above which the shooter counts as moving (more spread). */
const MOVING_SPEED = 30;

/** Spread multiplier while moving. */
export const MOVING_SPREAD_MULTIPLIER = 1.35;

/**
 * Whether the weapon in a slot can fire now or after a reload.
 *
 * @param e - The entity.
 * @param slot - Slot to check.
 * @returns `true` if the slot holds a weapon with rounds in the magazine or in reserve.
 */
export function hasAmmoFor(e: Entity, slot: SlotIndex): boolean {
  const w = e.weapons[slot];
  return !!w && (w.mag > 0 || e.ammo[WEAPONS[w.type].ammo] > 0);
}

/**
 * Selects another slot. Cancels any reload and adds a short draw delay.
 * Does nothing if the slot is already selected or empty.
 *
 * @param e - The entity.
 * @param slot - Slot to switch to.
 */
export function switchSlot(e: Entity, slot: SlotIndex): void {
  if (e.slot === slot || !e.weapons[slot]) return;
  e.slot = slot;
  e.reloading = 0;
  e.cool = Math.max(e.cool, SWITCH_DELAY);
}

/**
 * Begins reloading the active weapon if it is not full and reserve ammo exists.
 *
 * @param e - The entity.
 * @returns `true` if a reload started.
 */
export function startReload(e: Entity): boolean {
  const w = e.weapons[e.slot];
  if (!w || e.reloading > 0) return false;
  const WS = WEAPONS[w.type];
  if (w.mag >= WS.mag || e.ammo[WS.ammo] <= 0) return false;
  e.reloading = e.reloadTotal = WS.reload;
  return true;
}

/**
 * Completes a reload: moves as many rounds as fit from reserve into the magazine.
 *
 * @param e - The entity.
 */
export function finishReload(e: Entity): void {
  const w = e.weapons[e.slot];
  if (!w) return;
  const WS = WEAPONS[w.type];
  const n = Math.min(WS.mag - w.mag, e.ammo[WS.ammo]);
  w.mag += n;
  e.ammo[WS.ammo] -= n;
}

/**
 * Advances cooldown and reload timers for one step.
 *
 * @param e - The entity.
 * @param dt - Step in seconds.
 */
export function tickWeaponTimers(e: Entity, dt: number): void {
  e.cool -= dt;
  if (e.reloading > 0) {
    e.reloading -= dt;
    if (e.reloading <= 0) {
      e.reloading = 0;
      finishReload(e);
    }
  }
}

/**
 * Spread multiplier for the shooter's current movement.
 *
 * @param e - The shooter.
 * @returns {@link MOVING_SPREAD_MULTIPLIER} while moving, otherwise 1.
 */
export function movementSpreadFactor(e: Entity): number {
  return Math.hypot(e.vx, e.vy) > MOVING_SPEED ? MOVING_SPREAD_MULTIPLIER : 1;
}

/**
 * Attempts to fire the active weapon. On an empty magazine it starts a reload
 * instead (and tells the player if they are completely out of ammo).
 *
 * Spawns one bullet per pellet plus a muzzle-flash particle, applies screen
 * shake for the player and plays a shot sound.
 *
 * @param world - The game world (receives bullets, particles, messages).
 * @param e - The shooter.
 * @returns `true` if a shot was fired.
 */
export function tryShoot(world: World, e: Entity): boolean {
  const w = e.weapons[e.slot];
  if (!w || e.reloading > 0 || e.cool > 0) return false;
  if (w.mag <= 0) {
    startReload(e);
    if (e.isPlayer && e.reloading <= 0 && e.cool <= 0) {
      e.cool = 0.3;
      showMessage(world, 'No ammo! Find ' + AMMO_NAMES[WEAPONS[w.type].ammo] + ' ammo');
    }
    return false;
  }
  const WS = WEAPONS[w.type];
  e.cool = WS.rate;
  w.mag--;
  const moving = movementSpreadFactor(e);
  const tipX = e.x + Math.cos(e.angle) * (e.r + WS.len);
  const tipY = e.y + Math.sin(e.angle) * (e.r + WS.len);
  for (let i = 0; i < WS.pellets; i++) {
    const a = e.angle + (random() - 0.5) * 2 * WS.spread * moving;
    const sp = WS.speed * (WS.pellets > 1 ? rand(0.85, 1.1) : 1);
    const bullet: Bullet = {
      x: e.x,
      y: e.y,
      nx: tipX,
      ny: tipY,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: WS.range / WS.speed,
      dmg: WS.dmg,
      owner: e,
      weapon: WS.name,
      color: WS.color,
      first: true,
    };
    world.bullets.push(bullet);
  }
  world.particles.push({
    x: tipX,
    y: tipY,
    vx: 0,
    vy: 0,
    life: 0.06,
    max: 0.06,
    size: WS.pellets > 1 ? 14 : 10,
    color: '#fff59d',
    flash: true,
  });
  if (e.isPlayer) world.shake = Math.max(world.shake, WS.pellets > 1 ? 6 : WS.tier >= 4 ? 7 : 2.5);
  emitSound(world, 'shot', e.x, e.y, WS.pellets > 1 ? 900 : WS.tier >= 4 ? 700 : 2200);
  return true;
}
