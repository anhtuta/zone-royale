/**
 * Ageing of short-lived visual state: particles, damage numbers, kill feed,
 * toast and screen shake.
 *
 * @packageDocumentation
 */

import type { World } from '../core/world';

/**
 * Advances every transient effect by `dt` and drops expired ones.
 *
 * @param world - The game world.
 * @param dt - Step in seconds.
 */
export function updateEffects(world: World, dt: number): void {
  const { particles, floaters, killfeed } = world;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (!p) continue;
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    if (!f) continue;
    f.life -= dt;
    f.y -= 40 * dt;
    if (f.life <= 0) floaters.splice(i, 1);
  }
  for (let i = killfeed.length - 1; i >= 0; i--) {
    const k = killfeed[i];
    if (!k) continue;
    k.t -= dt;
    if (k.t <= 0) killfeed.splice(i, 1);
  }
  world.message.t -= dt;
  world.shake *= Math.pow(0.001, dt);
}
