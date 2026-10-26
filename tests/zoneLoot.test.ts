import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_MATCH_SETTINGS } from '../src/config/matchSettings';
import {
  ammoFloorForMap,
  ZONE_LOOT_BASE_FLOOR,
  ZONE_LOOT_SUPPLY_MESSAGE,
} from '../src/config/zoneLoot';
import { PHASES } from '../src/config/zone';
import { stepWorld } from '../src/core/simulation';
import type { PlayerControls } from '../src/systems/player';
import {
  countGroundAmmo,
  fillZoneAmmoToFloors,
  handleZoneAmmoSupplyEvent,
  isInsideZoneLootDisk,
  trySpawnAmmoInZone,
} from '../src/systems/zoneLoot';
import { updateZone } from '../src/systems/zone';
import { createSeededRandom, setRandomSource } from '../src/utils/random';
import { makeWorld } from './helpers';

const MAP_SIZE = DEFAULT_MATCH_SETTINGS.mapSize;
const IDLE: PlayerControls = {
  moveX: 0,
  moveY: 0,
  aimX: 0,
  aimY: 0,
  fireHeld: false,
  firePressed: false,
};

beforeEach(() => setRandomSource(createSeededRandom(90210)));
afterEach(() => setRandomSource(Math.random));

describe('ammoFloorForMap', () => {
  it('matches base floors at the reference map size', () => {
    for (const type of Object.keys(ZONE_LOOT_BASE_FLOOR) as (keyof typeof ZONE_LOOT_BASE_FLOOR)[]) {
      expect(ammoFloorForMap(MAP_SIZE, type)).toBe(ZONE_LOOT_BASE_FLOOR[type]);
    }
  });

  it('scales down on smaller maps but never below 1', () => {
    expect(ammoFloorForMap(1000, 'light')).toBe(1);
    expect(ammoFloorForMap(1000, 'medium')).toBe(1);
  });
});

describe('zone ammo placement', () => {
  it('places boxes inside the safe disk on open ground', () => {
    const world = makeWorld();
    expect(trySpawnAmmoInZone(world, 'light')).toBe(true);
    expect(world.loot).toHaveLength(1);
    const box = world.loot[0]!;
    expect(box.kind).toBe('ammo');
    expect(isInsideZoneLootDisk(world, box.x, box.y)).toBe(true);
  });

  it('fills each family up to the map-scaled floor', () => {
    const world = makeWorld({ loot: [] });
    const spawned = fillZoneAmmoToFloors(world);
    expect(spawned).toBeGreaterThan(0);
    const counts = countGroundAmmo(world.loot);
    for (const type of Object.keys(counts) as (keyof typeof counts)[]) {
      expect(counts[type]).toBeGreaterThanOrEqual(ammoFloorForMap(MAP_SIZE, type));
    }
  });
});

describe('handleZoneAmmoSupplyEvent', () => {
  it('telegraphs when boxes spawn', () => {
    const world = makeWorld({ loot: [] });
    handleZoneAmmoSupplyEvent(world, 'phaseAdvanced');
    expect(world.loot.length).toBeGreaterThan(0);
    expect(world.killfeed.some((e) => e.sys === ZONE_LOOT_SUPPLY_MESSAGE)).toBe(true);
    expect(world.message.text).toBe(ZONE_LOOT_SUPPLY_MESSAGE);
    expect(world.message.t).toBeGreaterThan(0);
  });

  it('does not telegraph when already at the floor', () => {
    const world = makeWorld({ loot: [] });
    fillZoneAmmoToFloors(world);
    world.killfeed = [];
    world.message = { text: '', t: 0 };
    const before = world.loot.length;
    handleZoneAmmoSupplyEvent(world, 'phaseAdvanced');
    expect(world.loot.length).toBe(before);
    expect(world.killfeed).toHaveLength(0);
    expect(world.message.t).toBe(0);
  });

  it('ignores shrinkStarted', () => {
    const world = makeWorld({ loot: [] });
    handleZoneAmmoSupplyEvent(world, 'shrinkStarted');
    expect(world.loot).toHaveLength(0);
  });
});

describe('simulation hook', () => {
  it('spawns supply when a shrink ends', () => {
    const world = makeWorld({ loot: [] });
    updateZone(world.zone, PHASES[0]!.wait);
    updateZone(world.zone, PHASES[0]!.shrink - 0.001);
    stepWorld(world, IDLE, 0.01);
    expect(countGroundAmmo(world.loot).light).toBeGreaterThanOrEqual(
      ammoFloorForMap(MAP_SIZE, 'light'),
    );
    expect(world.killfeed.some((e) => e.sys === ZONE_LOOT_SUPPLY_MESSAGE)).toBe(true);
  });
});
