import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ammoFloorForAlive,
  REFERENCE_PLAYER_COUNT,
  ZONE_LOOT_BASE_FLOOR,
  ZONE_LOOT_SUPPLY_MESSAGE,
  zoneLootClosedPlacementRadius,
} from '../src/config/zoneLoot';
import { PHASES } from '../src/config/zone';
import { DEFAULT_MATCH_SETTINGS, zoneStartRadius } from '../src/config/matchSettings';
import { stepWorld } from '../src/core/simulation';
import type { PlayerControls } from '../src/systems/player';
import {
  countGroundAmmo,
  fillZoneAmmoToFloors,
  handleZoneAmmoSupplyEvent,
  isInsideZoneLootDisk,
  trySpawnAmmoInZone,
  zoneLootUsableRadius,
} from '../src/systems/zoneLoot';
import { createZone, updateZone } from '../src/systems/zone';
import { createSeededRandom, setRandomSource } from '../src/utils/random';
import { bot, makeWorld } from './helpers';

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

describe('ammoFloorForAlive', () => {
  it('matches base floors at the reference alive count', () => {
    for (const type of Object.keys(ZONE_LOOT_BASE_FLOOR) as (keyof typeof ZONE_LOOT_BASE_FLOOR)[]) {
      expect(ammoFloorForAlive(REFERENCE_PLAYER_COUNT, type)).toBe(ZONE_LOOT_BASE_FLOOR[type]);
    }
  });

  it('never exceeds alive count and never drops below 1', () => {
    expect(ammoFloorForAlive(3, 'light')).toBe(1);
    expect(ammoFloorForAlive(3, 'light')).toBeLessThanOrEqual(3);
    expect(ammoFloorForAlive(2, 'medium')).toBeLessThanOrEqual(2);
  });

  it('scales up with more survivors', () => {
    expect(ammoFloorForAlive(100, 'light')).toBeGreaterThan(ammoFloorForAlive(20, 'light'));
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

  it('places boxes when the safe zone is smaller than the old edge margin', () => {
    const world = makeWorld({ loot: [] });
    world.zone.r = 40;
    expect(zoneLootUsableRadius(world.zone, 'phaseAdvanced')).toBe(40);
    expect(trySpawnAmmoInZone(world, 'light', 'phaseAdvanced')).toBe(true);
  });

  it('fills each family up to the survivor-scaled floor', () => {
    const world = makeWorld({ loot: [] });
    const spawned = fillZoneAmmoToFloors(world);
    expect(spawned).toBeGreaterThan(0);
    const alive = world.entities.filter((e) => e.alive).length;
    const counts = countGroundAmmo(world.loot);
    for (const type of Object.keys(counts) as (keyof typeof counts)[]) {
      expect(counts[type]).toBeGreaterThanOrEqual(ammoFloorForAlive(alive, type));
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

  it('spawns on closed even when zone radius is zero', () => {
    const world = makeWorld({ loot: [] });
    world.zone.state = 'final';
    world.zone.r = 0;
    expect(zoneLootUsableRadius(world.zone, 'phaseAdvanced')).toBe(0);
    const closedR = zoneLootUsableRadius(world.zone, 'closed');
    expect(closedR).toBeGreaterThan(0);
    handleZoneAmmoSupplyEvent(world, 'closed');
    expect(world.loot.length).toBeGreaterThan(0);
    for (const item of world.loot) {
      if (item.kind !== 'ammo') continue;
      expect(isInsideZoneLootDisk(world, item.x, item.y, 'closed')).toBe(true);
    }
    expect(world.killfeed.some((e) => e.sys === ZONE_LOOT_SUPPLY_MESSAGE)).toBe(true);
  });
});

describe('zoneLootClosedPlacementRadius', () => {
  it('uses the last positive phase end radius before collapse', () => {
    const startR = zoneStartRadius(DEFAULT_MATCH_SETTINGS.mapSize);
    const phases = PHASES.map((p) => p.r);
    expect(zoneLootClosedPlacementRadius(phases)).toBe(Math.round(startR * 0.04));
    expect(zoneLootClosedPlacementRadius([0, 0])).toBe(0);
  });

  it('matches endgame placement disk at full radius', () => {
    const zone = createZone(DEFAULT_MATCH_SETTINGS.mapSize);
    zone.state = 'final';
    zone.r = 0;
    const endR = zoneLootClosedPlacementRadius(zone.phases.map((p) => p.r));
    expect(zoneLootUsableRadius(zone, 'closed')).toBe(endR);
  });
});

describe('simulation hook', () => {
  it('spawns supply when a shrink ends', () => {
    const world = makeWorld({ loot: [] });
    updateZone(world.zone, PHASES[0]!.wait);
    updateZone(world.zone, PHASES[0]!.shrink - 0.001);
    stepWorld(world, IDLE, 0.01);
    const alive = world.entities.filter((e) => e.alive).length;
    expect(countGroundAmmo(world.loot).light).toBeGreaterThanOrEqual(
      ammoFloorForAlive(alive, 'light'),
    );
    expect(world.killfeed.some((e) => e.sys === ZONE_LOOT_SUPPLY_MESSAGE)).toBe(true);
  });

  it('uses fewer boxes when few survivors remain', () => {
    const world = makeWorld({ loot: [] });
    world.entities.push(bot(100, 100, 'B2'), bot(200, 200, 'B3'));
    fillZoneAmmoToFloors(world);
    expect(countGroundAmmo(world.loot).light).toBe(ammoFloorForAlive(3, 'light'));
  });
});

describe('headless dry-match smoke', () => {
  it('replenishes ground ammo after the first zone shrink via stepWorld', () => {
    const world = makeWorld({ loot: [] });
    expect(countGroundAmmo(world.loot).light).toBe(0);
    let ammoOnGround = false;
    for (let i = 0; i < 5000 && !ammoOnGround; i++) {
      stepWorld(world, IDLE, 0.2);
      ammoOnGround = world.loot.some((l) => l.kind === 'ammo');
    }
    expect(ammoOnGround).toBe(true);
    const alive = world.entities.filter((e) => e.alive).length;
    const counts = countGroundAmmo(world.loot);
    for (const type of Object.keys(counts) as (keyof typeof counts)[]) {
      expect(counts[type]).toBeGreaterThanOrEqual(ammoFloorForAlive(alive, type));
    }
  });
});
