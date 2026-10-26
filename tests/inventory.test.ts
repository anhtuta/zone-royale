import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MAX_ARMOR, MAX_HP } from '../src/config/constants';
import type { LootItem } from '../src/entities/loot';
import { lootColor, lootName } from '../src/entities/loot';
import {
  applyLoot,
  botWants,
  chooseWeaponSlot,
  nearestLoot,
  pickupRefusal,
  playerPickup,
} from '../src/systems/inventory';
import { createSeededRandom, setRandomSource } from '../src/utils/random';
import { bot, makeWorld } from './helpers';

beforeEach(() => setRandomSource(createSeededRandom(9)));
afterEach(() => setRandomSource(Math.random));

describe('loot labels', () => {
  it('names every kind of loot', () => {
    expect(lootName({ kind: 'weapon', type: 'rifle', mag: 30, x: 0, y: 0 })).toBe('Assault Rifle');
    expect(lootName({ kind: 'ammo', type: 'light', amount: 30, x: 0, y: 0 })).toBe(
      'Light Ammo x30',
    );
    expect(lootName({ kind: 'health', amount: 40, x: 0, y: 0 })).toBe('Med Kit (+40 HP)');
    expect(lootName({ kind: 'armor', amount: 50, x: 0, y: 0 })).toBe('Armor (+50)');
    expect(lootColor({ kind: 'health', amount: 40, x: 0, y: 0 })).toBe('#ef5350');
  });
});

describe('chooseWeaponSlot', () => {
  it('uses the first empty slot', () => {
    const { player: p } = makeWorld();
    expect(chooseWeaponSlot(p)).toEqual({ slot: 1, replaced: null });
    p.weapons[0] = null;
    expect(chooseWeaponSlot(p)).toEqual({ slot: 0, replaced: null });
  });

  it('the player replaces the selected weapon when full', () => {
    const { player: p } = makeWorld();
    p.weapons[1] = { type: 'smg', mag: 30 };
    p.slot = 1;
    expect(chooseWeaponSlot(p)).toEqual({ slot: 1, replaced: { type: 'smg', mag: 30 } });
  });

  it('a bot replaces its weaker weapon when full', () => {
    const b = bot(0, 0);
    b.weapons = [
      { type: 'sniper', mag: 5 },
      { type: 'smg', mag: 30 },
    ];
    expect(chooseWeaponSlot(b).slot).toBe(1);
  });
});

describe('applyLoot', () => {
  it('weapon pickup equips, selects and drops the replaced gun', () => {
    const w = makeWorld();
    const p = w.player;
    p.weapons[1] = { type: 'smg', mag: 10 };
    const item: LootItem = { kind: 'weapon', type: 'shotgun', mag: 5, x: p.x, y: p.y };
    w.loot.push(item);
    applyLoot(w, p, item);
    expect(p.weapons[0]).toEqual({ type: 'shotgun', mag: 5 });
    expect(p.slot).toBe(0);
    expect(w.loot).toHaveLength(1);
    expect(w.loot[0]).toMatchObject({ kind: 'weapon', type: 'pistol', mag: 12 });
    expect(item.gone).toBe(true);
    expect(w.message.text).toBe('Picked up Shotgun');
  });

  it('ammo adds to the reserve', () => {
    const w = makeWorld();
    const item: LootItem = { kind: 'ammo', type: 'heavy', amount: 6, x: 0, y: 0 };
    w.loot.push(item);
    applyLoot(w, w.player, item);
    expect(w.player.ammo.heavy).toBe(6);
    expect(w.loot).toHaveLength(0);
  });

  it('health and armor are capped at max', () => {
    const w = makeWorld();
    w.player.hp = MAX_HP - 20;
    applyLoot(w, w.player, { kind: 'health', amount: 40, x: 0, y: 0 });
    expect(w.player.hp).toBe(MAX_HP);
    w.player.armor = MAX_ARMOR - 30;
    applyLoot(w, w.player, { kind: 'armor', amount: 50, x: 0, y: 0 });
    expect(w.player.armor).toBe(MAX_ARMOR);
  });

  it('a bot only switches to a new weapon of at least equal tier', () => {
    const w = makeWorld();
    const b = bot(0, 0);
    b.weapons = [{ type: 'rifle', mag: 30 }, null];
    applyLoot(w, b, { kind: 'weapon', type: 'pistol', mag: 12, x: 0, y: 0 });
    expect(b.weapons[1]?.type).toBe('pistol');
    expect(b.slot).toBe(0);
    applyLoot(w, b, { kind: 'weapon', type: 'sniper', mag: 5, x: 0, y: 0 });
    expect(b.weapons[1]?.type).toBe('sniper');
    expect(b.slot).toBe(1);
  });
});

describe('player pickup rules', () => {
  it('nearestLoot returns the closest item in range that passes the filter', () => {
    const a: LootItem = { kind: 'health', amount: 40, x: 10, y: 0 };
    const b: LootItem = { kind: 'armor', amount: 50, x: 5, y: 0 };
    expect(nearestLoot([a, b], 0, 0, 60)).toBe(b);
    expect(nearestLoot([a, b], 0, 0, 60, (it) => it.kind === 'health')).toBe(a);
    expect(nearestLoot([a, b], 0, 0, 3)).toBeNull();
  });

  it('refuses med kits at full health and armor at full armor', () => {
    const { player: p } = makeWorld();
    expect(pickupRefusal(p, { kind: 'health', amount: 40, x: 0, y: 0 })).toBe(
      'Health is already full',
    );
    p.hp = 50;
    expect(pickupRefusal(p, { kind: 'health', amount: 40, x: 0, y: 0 })).toBeNull();
    p.armor = 100;
    expect(pickupRefusal(p, { kind: 'armor', amount: 50, x: 0, y: 0 })).toBe(
      'Armor is already full',
    );
  });

  it('playerPickup picks the nearest item within 60px', () => {
    const w = makeWorld();
    w.loot.push({ kind: 'weapon', type: 'smg', mag: 30, x: w.player.x + 30, y: w.player.y });
    w.loot.push({ kind: 'weapon', type: 'rifle', mag: 30, x: w.player.x + 100, y: w.player.y });
    expect(playerPickup(w)).toBe(true);
    expect(w.player.weapons[1]?.type).toBe('smg');
    expect(playerPickup(w)).toBe(false);
  });

  it('playerPickup shows a message instead of wasting a med kit', () => {
    const w = makeWorld();
    w.loot.push({ kind: 'health', amount: 40, x: w.player.x, y: w.player.y });
    expect(playerPickup(w)).toBe(false);
    expect(w.loot).toHaveLength(1);
    expect(w.message.text).toBe('Health is already full');
  });

  it('playerPickup skips a wasted med kit and takes the next nearest loot', () => {
    const w = makeWorld();
    w.loot.push({ kind: 'health', amount: 40, x: w.player.x, y: w.player.y });
    w.loot.push({ kind: 'weapon', type: 'smg', mag: 30, x: w.player.x + 25, y: w.player.y });
    expect(playerPickup(w)).toBe(true);
    expect(w.player.weapons[1]?.type).toBe('smg');
    expect(w.loot).toHaveLength(1);
    expect(w.loot[0]?.kind).toBe('health');
  });
});

describe('botWants', () => {
  it('wants a new weapon type while it has a free slot', () => {
    const b = bot(0, 0);
    expect(botWants(b, { kind: 'weapon', type: 'smg', mag: 30, x: 0, y: 0 })).toBe(true);
    expect(botWants(b, { kind: 'weapon', type: 'pistol', mag: 12, x: 0, y: 0 })).toBe(false);
  });

  it('with full slots only wants an upgrade over its weaker weapon', () => {
    const b = bot(0, 0);
    b.weapons = [
      { type: 'pistol', mag: 12 },
      { type: 'rifle', mag: 30 },
    ];
    expect(botWants(b, { kind: 'weapon', type: 'smg', mag: 30, x: 0, y: 0 })).toBe(true);
    expect(botWants(b, { kind: 'weapon', type: 'rifle', mag: 30, x: 0, y: 0 })).toBe(false);
    b.weapons = [
      { type: 'shotgun', mag: 5 },
      { type: 'rifle', mag: 30 },
    ];
    expect(botWants(b, { kind: 'weapon', type: 'smg', mag: 30, x: 0, y: 0 })).toBe(false);
    expect(botWants(b, { kind: 'weapon', type: 'sniper', mag: 5, x: 0, y: 0 })).toBe(true);
  });

  it('wants ammo only for carried weapons and below 120 rounds', () => {
    const b = bot(0, 0);
    expect(botWants(b, { kind: 'ammo', type: 'light', amount: 30, x: 0, y: 0 })).toBe(true);
    expect(botWants(b, { kind: 'ammo', type: 'heavy', amount: 6, x: 0, y: 0 })).toBe(false);
    b.ammo.light = 120;
    expect(botWants(b, { kind: 'ammo', type: 'light', amount: 30, x: 0, y: 0 })).toBe(false);
  });

  it('wants med kits below 85 hp and armor below 70', () => {
    const b = bot(0, 0);
    expect(botWants(b, { kind: 'health', amount: 40, x: 0, y: 0 })).toBe(false);
    b.hp = 84;
    expect(botWants(b, { kind: 'health', amount: 40, x: 0, y: 0 })).toBe(true);
    expect(botWants(b, { kind: 'armor', amount: 50, x: 0, y: 0 })).toBe(true);
    b.armor = 70;
    expect(botWants(b, { kind: 'armor', amount: 50, x: 0, y: 0 })).toBe(false);
  });
});
