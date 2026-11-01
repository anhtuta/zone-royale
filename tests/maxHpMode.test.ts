import { describe, expect, it } from 'vitest';
import { hpScale } from '../src/config/constants';
import { DEFAULT_MATCH_SETTINGS, normalizeMatchSettings, zoneStartRadius } from '../src/config/matchSettings';
import { buildZonePhases } from '../src/config/zone';
import { Camera } from '../src/core/camera';
import { createMatch } from '../src/systems/match';
import { zoneTickDamage } from '../src/systems/zone';

describe('max HP match settings', () => {
  it('defaults to Normal (100 HP)', () => {
    expect(DEFAULT_MATCH_SETTINGS.maxHp).toBe(100);
    expect(normalizeMatchSettings({})).toMatchObject({ maxHp: 100 });
  });

  it('normalizes invalid maxHp to Normal', () => {
    expect(normalizeMatchSettings({ maxHp: 250 })).toMatchObject({ maxHp: 100 });
    expect(normalizeMatchSettings({ maxHp: 500, mapSize: 5000, numPlayers: 50 })).toMatchObject({
      maxHp: 500,
    });
  });

  it('hpScale is 1 for Normal and dampens zone scale from Extended upward', () => {
    expect(hpScale(100)).toBe(1);
    expect(hpScale(300)).toBe(1.2);
    expect(hpScale(500)).toBe(2);
  });

  it('scales zone phase wait, shrink, and dps by hpScale', () => {
    const startR = zoneStartRadius(5000);
    const normal = buildZonePhases(startR, 100);
    const extended = buildZonePhases(startR, 300);
    const marathon = buildZonePhases(startR, 500);
    expect(normal[0]).toMatchObject({ wait: 45, shrink: 30, dps: 1, r: normal[0]!.r });
    expect(extended[0]).toMatchObject({ wait: 54, shrink: 36, dps: 1.2, r: normal[0]!.r });
    expect(marathon[0]).toMatchObject({ wait: 90, shrink: 60, dps: 2, r: normal[0]!.r });
  });

  it('scales total zone duration with dampened hpScale', () => {
    const startR = zoneStartRadius(DEFAULT_MATCH_SETTINGS.mapSize);
    const normalDur = buildZonePhases(startR, 100).reduce((s, p) => s + p.wait + p.shrink, 0);
    const marathonDur = buildZonePhases(startR, 500).reduce((s, p) => s + p.wait + p.shrink, 0);
    expect(normalDur).toBe(252);
    expect(marathonDur).toBe(252 * 2);
  });

  it('spawns combatants at full maxHp', () => {
    const w = createMatch(new Camera(800, 600), null, {
      mapSize: 1000,
      numPlayers: 5,
      maxHp: 500,
    });
    expect(w.maxHp).toBe(500);
    for (const e of w.entities) expect(e.hp).toBe(500);
  });

  it('zone tick damage scales with phase dps', () => {
    const startR = zoneStartRadius(5000);
    const phases = buildZonePhases(startR, 300);
    expect(zoneTickDamage({ zoneTick: 0 }, 0.5, phases[0]!.dps)).toBeCloseTo(0.6);
  });
});
