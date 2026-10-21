/**
 * Bullet flight and hit detection.
 *
 * @packageDocumentation
 */

import type { World } from '../core/world';
import type { Entity } from '../entities/entity';
import { segmentCircle } from '../utils/geometry';
import { rand } from '../utils/random';
import { segmentObstacle } from './collision';
import { applyDamage } from './combat';

/**
 * Moves every bullet along its path for one step. Each step is a swept
 * segment test against obstacles and living combatants (except the shooter);
 * the closest hit wins. Entity hits deal damage; obstacle hits spawn sparks.
 * On its first step a bullet travels from the shooter's centre to the muzzle
 * so that point-blank shots through walls are blocked.
 *
 * @param world - The game world.
 * @param dt - Step in seconds.
 */
export function updateBullets(world: World, dt: number): void {
  const bullets = world.bullets;
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    if (!b) continue;
    const x1 = b.x;
    const y1 = b.y;
    let x2: number;
    let y2: number;
    if (b.first) {
      x2 = b.nx;
      y2 = b.ny;
      b.first = false;
    } else {
      x2 = b.x + b.vx * dt;
      y2 = b.y + b.vy * dt;
      b.life -= dt;
    }
    let tHit = segmentObstacle(world.obstacles, x1, y1, x2, y2);
    let hitE: Entity | null = null;
    for (const e of world.entities) {
      if (!e.alive || e === b.owner) continue;
      const t = segmentCircle(x1, y1, x2, y2, e.x, e.y, e.r);
      if (t >= 0 && (tHit < 0 || t < tHit)) {
        tHit = t;
        hitE = e;
      }
    }
    if (tHit >= 0) {
      const hx = x1 + (x2 - x1) * tHit;
      const hy = y1 + (y2 - y1) * tHit;
      if (hitE) applyDamage(world, hitE, b.dmg, b.owner, b.weapon);
      else {
        for (let k = 0; k < 3; k++) {
          world.particles.push({
            x: hx,
            y: hy,
            vx: rand(-90, 90),
            vy: rand(-90, 90),
            life: 0.25,
            max: 0.25,
            size: 2,
            color: '#ffe0b2',
          });
        }
      }
      bullets.splice(i, 1);
      continue;
    }
    b.x = x2;
    b.y = y2;
    if (b.life <= 0) bullets.splice(i, 1);
  }
}
