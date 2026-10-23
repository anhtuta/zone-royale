/**
 * Damage, armor and eliminations.
 *
 * @packageDocumentation
 */

import { ARMOR_ABSORB, MEDKIT_AMOUNT, TAU } from '../config/constants';
import { AMMO_TYPES } from '../config/weapons';
import type { World } from '../core/world';
import type { Entity } from '../entities/entity';
import { rand, random } from '../utils/random';
import { pushFeed, showMessage } from './feedback';
import { emitSound } from './sound';

/** Result of splitting incoming damage between armor and health. */
export interface DamageSplit {
  /** Armor left after the hit. */
  armor: number;
  /** Damage that reaches health. */
  hpDamage: number;
  /** Damage soaked by armor. */
  absorbed: number;
}

/**
 * Splits incoming damage between armor and health. Armor soaks up to
 * {@link ARMOR_ABSORB} (60%) of each hit from a weapon until it runs out.
 * Zone damage (`fromSource === false`) ignores armor.
 *
 * @param armor - Current armor.
 * @param amount - Incoming damage.
 * @param fromSource - Whether the damage came from another combatant.
 * @returns The new armor value and the damage dealt to health.
 */
export function splitDamage(armor: number, amount: number, fromSource: boolean): DamageSplit {
  if (armor > 0 && fromSource) {
    const absorbed = Math.min(armor, amount * ARMOR_ABSORB);
    return { armor: armor - absorbed, hpDamage: amount - absorbed, absorbed };
  }
  return { armor, hpDamage: amount, absorbed: 0 };
}

/**
 * Number of combatants still alive.
 *
 * @param entities - All combatants.
 * @returns How many have `alive === true`.
 */
export function countAlive(entities: readonly Entity[]): number {
  let n = 0;
  for (const e of entities) if (e.alive) n++;
  return n;
}

/**
 * Deals damage to an entity, crediting the attacker and eliminating the
 * target when its health reaches zero.
 *
 * @param world - The game world.
 * @param e - Target.
 * @param amount - Raw damage before armor.
 * @param src - Attacker, or `null` for zone damage.
 * @param weaponName - Weapon display name for the kill feed.
 */
export function applyDamage(
  world: World,
  e: Entity,
  amount: number,
  src: Entity | null,
  weaponName: string | null,
): void {
  if (!e.alive) return;
  const split = splitDamage(e.armor, amount, !!src);
  e.armor = split.armor;
  const amt = split.hpDamage;
  e.hp -= amt;
  e.hitFlash = 0.12;
  if (src) {
    src.damage += amt;
    if (src.isPlayer) {
      world.floaters.push({
        x: e.x + rand(-10, 10),
        y: e.y - 26,
        text: String(Math.round(amt)),
        life: 0.8,
        color: e.armor > 0 ? '#90caf9' : '#fff',
      });
      emitSound(world, 'hit', e.x, e.y);
    }
    if (e.ai) {
      e.ai.attacker = src;
      if (!e.ai.target) e.ai.retarget = 0;
    }
  }
  for (let i = 0; i < 4; i++) {
    world.particles.push({
      x: e.x,
      y: e.y,
      vx: rand(-120, 120),
      vy: rand(-120, 120),
      life: 0.35,
      max: 0.35,
      size: rand(2, 4),
      color: '#c62828',
    });
  }
  if (e.hp <= 0) eliminate(world, e, src, weaponName);
}

/**
 * Eliminates an entity: records its placement, credits the kill, drops its
 * inventory as loot (plus a 50% chance of a med kit), spawns a burst of
 * particles and writes the kill feed.
 *
 * @param world - The game world.
 * @param e - Entity being eliminated.
 * @param src - Killer, or `null` for the zone.
 * @param weaponName - Weapon display name for the kill feed.
 */
export function eliminate(
  world: World,
  e: Entity,
  src: Entity | null,
  weaponName: string | null,
): void {
  e.alive = false;
  e.hp = 0;
  e.diedAt = world.gameTime;
  const alive = countAlive(world.entities);
  e.place = alive + 1;
  if (src && src !== e) src.kills++;
  for (const w of e.weapons) {
    if (w)
      world.loot.push({
        kind: 'weapon',
        type: w.type,
        mag: w.mag,
        x: e.x + rand(-25, 25),
        y: e.y + rand(-25, 25),
      });
  }
  for (const t of AMMO_TYPES) {
    if (e.ammo[t] > 0)
      world.loot.push({
        kind: 'ammo',
        type: t,
        amount: e.ammo[t],
        x: e.x + rand(-30, 30),
        y: e.y + rand(-30, 30),
      });
  }
  if (random() < 0.5)
    world.loot.push({
      kind: 'health',
      amount: MEDKIT_AMOUNT,
      x: e.x + rand(-30, 30),
      y: e.y + rand(-30, 30),
    });
  for (let i = 0; i < 18; i++) {
    const a = rand(0, TAU);
    const s = rand(60, 260);
    world.particles.push({
      x: e.x,
      y: e.y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.7,
      max: 0.7,
      size: rand(2, 5),
      color: i % 3 ? '#b71c1c' : e.color,
    });
  }
  emitSound(world, 'death', e.x, e.y);
  if (src && src !== e) {
    pushFeed(world, {
      killer: src.name,
      victim: e.name,
      weapon: weaponName,
      kp: src.isPlayer,
      vp: e.isPlayer,
      t: 6,
    });
  } else {
    pushFeed(world, { killer: null, victim: e.name, weapon: null, vp: e.isPlayer, t: 6 });
  }
  if (src && src.isPlayer && e !== src)
    showMessage(world, 'Eliminated ' + e.name + '!  (' + alive + ' left)');
  if (e.isPlayer) {
    world.camTarget = src && src.alive ? src : null;
    world.spectating = true;
    world.endTimer = -1;
  }
}
