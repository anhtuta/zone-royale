import { afterEach, describe, expect, it } from 'vitest';
import { AMMO_AMOUNT, WEAPONS } from '../src/config/weapons';
import { circleFree } from '../src/systems/collision';
import {
  categoryForRoll,
  rollLoot,
  spawnInitialLoot,
  weaponForRoll,
} from '../src/systems/lootSpawner';
import { createSeededRandom, setRandomSource } from '../src/utils/random';
import { generateMap } from '../src/world/mapgen';

afterEach(() => setRandomSource(Math.random));

describe('loot tables', () => {
  it('maps rolls to weapon rarity bands', () => {
    expect(weaponForRoll(0)).toBe('pistol');
    expect(weaponForRoll(0.3)).toBe('smg');
    expect(weaponForRoll(0.6)).toBe('shotgun');
    expect(weaponForRoll(0.8)).toBe('rifle');
    expect(weaponForRoll(0.95)).toBe('sniper');
  });

  it('maps rolls to loot categories', () => {
    expect(categoryForRoll(0.1)).toBe('weapon');
    expect(categoryForRoll(0.5)).toBe('ammo');
    expect(categoryForRoll(0.7)).toBe('health');
    expect(categoryForRoll(0.9)).toBe('armor');
  });

  it('weapon spots come with a full magazine and matching ammo', () => {
    const rolls = [0.1, 0.8, 0];
    setRandomSource(() => rolls.shift() ?? 0);
    const items = rollLoot(500, 500, []);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ kind: 'weapon', type: 'rifle', mag: WEAPONS.rifle.mag });
    expect(items[1]).toMatchObject({ kind: 'ammo', type: 'medium', amount: AMMO_AMOUNT.medium });
    expect(Math.hypot(items[1]!.x - 500, items[1]!.y - 500)).toBeCloseTo(30);
  });

  it('places paired ammo on the weapon when the offset spot is blocked', () => {
    const rolls = [0.1, 0.8, 0];
    setRandomSource(() => rolls.shift() ?? 0);
    const obstacles = [{ t: 'rock' as const, x: 530, y: 500, r: 30 }];
    const items = rollLoot(500, 500, obstacles);
    expect(items[1]).toMatchObject({ kind: 'ammo', x: 500, y: 500 });
  });

  it('health and armor spots give 40 hp / 50 armor', () => {
    setRandomSource(() => 0.7);
    expect(rollLoot(0, 0, [])).toEqual([{ kind: 'health', amount: 40, x: 0, y: 0 }]);
    setRandomSource(() => 0.9);
    expect(rollLoot(0, 0, [])).toEqual([{ kind: 'armor', amount: 50, x: 0, y: 0 }]);
  });
});

describe('map generation and loot spawning', () => {
  it('generates houses, rocks, trees and decor without overlaps', () => {
    setRandomSource(createSeededRandom(2024));
    const map = generateMap();
    expect(map.houses.length).toBeGreaterThanOrEqual(5);
    expect(map.obstacles.filter((o) => o.t === 'wall')).toHaveLength(map.houses.length * 6);
    expect(map.obstacles.filter((o) => o.t === 'rock').length).toBeGreaterThan(20);
    expect(map.obstacles.filter((o) => o.t === 'tree').length).toBeGreaterThan(60);
    expect(map.decor).toHaveLength(500);
  });

  it('places loot inside houses and across the map on free ground', () => {
    setRandomSource(createSeededRandom(77));
    const map = generateMap();
    const loot = spawnInitialLoot(map.houses, map.obstacles);
    expect(loot.length).toBeGreaterThan(130);
    for (const l of loot) expect(circleFree(map.obstacles, l.x, l.y, 20)).toBe(true);
    const inHouses = loot.filter((l) =>
      map.houses.some((h) => l.x > h.x && l.x < h.x + h.w && l.y > h.y && l.y < h.y + h.h),
    );
    expect(inHouses.length).toBeGreaterThanOrEqual(map.houses.length * 3);
  });
});
