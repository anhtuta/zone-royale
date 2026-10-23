import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyDamage, countAlive, eliminate, splitDamage } from '../src/systems/combat';
import { pushSystemFeed } from '../src/systems/feedback';
import { createSeededRandom, setRandomSource } from '../src/utils/random';
import { bot, makeWorld } from './helpers';

beforeEach(() => setRandomSource(createSeededRandom(5)));
afterEach(() => setRandomSource(Math.random));

describe('splitDamage (armor)', () => {
  it('armor absorbs 60% of weapon damage', () => {
    expect(splitDamage(50, 20, true)).toEqual({ armor: 38, hpDamage: 8, absorbed: 12 });
  });
  it('armor can only absorb what it has left', () => {
    expect(splitDamage(5, 20, true)).toEqual({ armor: 0, hpDamage: 15, absorbed: 5 });
  });
  it('no armor means full damage', () => {
    expect(splitDamage(0, 20, true)).toEqual({ armor: 0, hpDamage: 20, absorbed: 0 });
  });
  it('zone damage ignores armor', () => {
    expect(splitDamage(100, 7, false)).toEqual({ armor: 100, hpDamage: 7, absorbed: 0 });
  });
});

describe('applyDamage', () => {
  it('reduces hp/armor, credits the attacker and shows a damage number', () => {
    const w = makeWorld();
    const b = bot(1600, 1500);
    w.entities.push(b);
    b.armor = 50;
    applyDamage(w, b, 20, w.player, 'Pistol');
    expect(b.hp).toBe(92);
    expect(b.armor).toBe(38);
    expect(w.player.damage).toBe(8);
    expect(w.floaters[0]?.text).toBe('8');
    expect(w.floaters[0]?.color).toBe('#90caf9');
    expect(b.hitFlash).toBeGreaterThan(0);
  });

  it('makes a bot remember its attacker', () => {
    const w = makeWorld();
    const b = bot(1600, 1500);
    w.entities.push(b);
    b.ai!.retarget = 5;
    applyDamage(w, b, 10, w.player, 'Pistol');
    expect(b.ai!.attacker).toBe(w.player);
    expect(b.ai!.retarget).toBe(0);
  });

  it('ignores dead targets', () => {
    const w = makeWorld();
    const b = bot(1600, 1500);
    b.alive = false;
    applyDamage(w, b, 50, w.player, 'Pistol');
    expect(b.hp).toBe(100);
  });
});

describe('eliminations', () => {
  it('lethal damage eliminates, credits the kill and records placement', () => {
    const w = makeWorld();
    const a = bot(1600, 1500, 'A');
    const b = bot(1700, 1500, 'B');
    w.entities.push(a, b);
    w.gameTime = 42;
    applyDamage(w, a, 200, w.player, 'Sniper');
    expect(a.alive).toBe(false);
    expect(a.hp).toBe(0);
    expect(a.place).toBe(3);
    expect(a.diedAt).toBe(42);
    expect(w.player.kills).toBe(1);
    expect(countAlive(w.entities)).toBe(2);
    expect(w.killfeed.at(-1)).toMatchObject({
      killer: 'You',
      victim: 'A',
      weapon: 'Sniper',
      kp: true,
      vp: false,
    });
    expect(w.message.text).toBe('Eliminated A!  (2 left)');
  });

  it('drops the victim inventory as loot', () => {
    const w = makeWorld();
    const a = bot(1600, 1500);
    w.entities.push(a);
    a.weapons[1] = { type: 'rifle', mag: 7 };
    a.ammo.medium = 15;
    eliminate(w, a, w.player, 'Pistol');
    expect(
      w.loot.filter((l) => l.kind === 'weapon').map((l) => l.kind === 'weapon' && l.type),
    ).toEqual(['pistol', 'rifle']);
    expect(w.loot.find((l) => l.kind === 'weapon' && l.type === 'rifle')).toMatchObject({ mag: 7 });
    expect(w.loot.filter((l) => l.kind === 'ammo')).toHaveLength(2);
  });

  it('zone kills are reported without a killer', () => {
    const w = makeWorld();
    const a = bot(1600, 1500, 'Zed');
    w.entities.push(a);
    applyDamage(w, a, 150, null, null);
    expect(w.killfeed.at(-1)).toMatchObject({ killer: null, victim: 'Zed' });
  });

  it("the player's death starts spectating the killer", () => {
    const w = makeWorld();
    const a = bot(1600, 1500);
    w.entities.push(a);
    applyDamage(w, w.player, 500, a, 'SMG');
    expect(w.player.alive).toBe(false);
    expect(w.player.place).toBe(2);
    expect(w.spectating).toBe(true);
    expect(w.endTimer).toBe(-1);
    expect(w.camTarget).toBe(a);
    expect(a.kills).toBe(1);
  });

  it('the kill feed keeps at most six lines', () => {
    const w = makeWorld();
    for (let i = 0; i < 10; i++) pushSystemFeed(w, 'msg ' + i);
    expect(w.killfeed).toHaveLength(6);
    expect(w.killfeed[0]).toMatchObject({ sys: 'msg 4' });
  });
});
