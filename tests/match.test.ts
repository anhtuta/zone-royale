import { afterEach, describe, expect, it } from 'vitest';
import { BOT_NAMES } from '../src/config/bots';
import {
  DEFAULT_MATCH_SETTINGS,
  minBodySpawnSeparation,
  numBots,
} from '../src/config/matchSettings';
import { Camera } from '../src/core/camera';
import { stepWorld } from '../src/core/simulation';
import {
  buildEndSummary,
  BOT_SPAWN_SPACING,
  checkMatchEnd,
  createMatch,
  findSpawnPoint,
  resolveSpectateTarget,
} from '../src/systems/match';
import { applyDamage } from '../src/systems/combat';
import { circleFree, inHouse } from '../src/systems/collision';
import { IDLE_CONTROLS } from '../src/systems/player';
import { createSeededRandom, setRandomSource } from '../src/utils/random';
import { bot, makeWorld } from './helpers';

afterEach(() => setRandomSource(Math.random));

describe('match end conditions', () => {
  it('nothing happens while several combatants are alive', () => {
    const w = makeWorld();
    w.entities.push(bot(0, 0));
    expect(checkMatchEnd(w, 0.016)).toBeNull();
  });

  it('the player wins as the last one standing', () => {
    const w = makeWorld();
    const b = bot(1600, 1500);
    w.entities.push(b);
    b.alive = false;
    expect(checkMatchEnd(w, 0.016)).toBe('won');
    expect(w.player.place).toBe(1);
  });

  it('after the player dies the match keeps running until one bot remains', () => {
    const w = makeWorld();
    const a = bot(1600, 1500);
    const b = bot(1700, 1500);
    w.entities.push(a, b);
    applyDamage(w, w.player, 999, a, 'Pistol');
    expect(w.spectating).toBe(true);
    expect(checkMatchEnd(w, 0.1)).toBeNull();
    b.alive = false;
    expect(checkMatchEnd(w, 0.1)).toBe('dead');
  });

  it('spectating keeps the match running until one bot remains', () => {
    const w = makeWorld();
    const a = bot(1600, 1500);
    const b = bot(1700, 1500);
    w.entities.push(a, b);
    w.player.alive = false;
    w.spectating = true;
    w.endTimer = -1;
    expect(checkMatchEnd(w, 0.1)).toBeNull();
    b.alive = false;
    expect(checkMatchEnd(w, 0.1)).toBe('dead');
  });

  it('ends in defeat when everyone is eliminated while spectating', () => {
    const w = makeWorld();
    const a = bot(1600, 1500);
    w.entities.push(a);
    w.player.alive = false;
    w.spectating = true;
    a.alive = false;
    expect(checkMatchEnd(w, 0.1)).toBe('dead');
  });

  it('the player never wins after dying, even if only one bot is left', () => {
    const w = makeWorld();
    const a = bot(1600, 1500);
    w.entities.push(a);
    w.player.alive = false;
    w.spectating = false;
    expect(checkMatchEnd(w, 0.1)).toBeNull();
    w.spectating = true;
    expect(checkMatchEnd(w, 0.1)).toBe('dead');
  });
});

describe('end summary', () => {
  it('describes a win', () => {
    const w = makeWorld();
    w.player.place = 1;
    w.player.kills = 7;
    w.player.damage = 812.6;
    w.gameTime = 200;
    expect(buildEndSummary(w, 'won')).toEqual({
      title: 'WINNER! #1',
      subtitle: 'Last one standing. The zone bows to you.',
      place: '#1',
      kills: '7',
      damage: '813',
      time: '3:20',
    });
  });

  it('describes a defeat with placement and survival time', () => {
    const w = makeWorld();
    for (let i = 0; i < 19; i++) w.entities.push(bot(0, 0));
    w.player.place = 4;
    w.player.diedAt = 95;
    const s = buildEndSummary(w, 'dead');
    expect(s.title).toBe('ELIMINATED');
    expect(s.subtitle).toBe('You placed #4 of 20. Drop back in and claim the crown.');
    expect(s.time).toBe('1:35');
  });
});

describe('spectate target', () => {
  it('keeps following the killer while they are alive', () => {
    const killer = bot(0, 0, 'K');
    killer.kills = 1;
    const top = bot(100, 0, 'Top');
    top.kills = 5;
    expect(resolveSpectateTarget(killer, [killer, top])).toBe(killer);
  });

  it('switches to the bot with the most kills when the killer dies', () => {
    const killer = bot(0, 0, 'K');
    killer.alive = false;
    killer.kills = 3;
    const a = bot(100, 0, 'A');
    a.kills = 2;
    const b = bot(200, 0, 'B');
    b.kills = 7;
    expect(resolveSpectateTarget(killer, [killer, a, b])).toBe(b);
  });
});

describe('match setup', () => {
  it('creates 1 player + bots on free, spaced-out ground outside houses', () => {
    setRandomSource(createSeededRandom(4242));
    const w = createMatch(new Camera(1280, 720), null, DEFAULT_MATCH_SETTINGS);
    const botCount = numBots(DEFAULT_MATCH_SETTINGS);
    expect(w.entities).toHaveLength(1 + botCount);
    expect(w.entities.filter((e) => e.isPlayer)).toEqual([w.player]);
    expect(new Set(w.entities.map((e) => e.name)).size).toBe(
      1 + Math.min(botCount, BOT_NAMES.length),
    );
    const bodySep = minBodySpawnSeparation();
    for (const e of w.entities) {
      expect(circleFree(w.obstacles, e.x, e.y, 30, w.mapSize)).toBe(true);
      expect(e.weapons[0]?.type).toBe('pistol');
    }
    for (let i = 0; i < w.entities.length; i++) {
      for (let j = i + 1; j < w.entities.length; j++) {
        const a = w.entities[i]!;
        const b = w.entities[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(bodySep - 0.01);
      }
    }
    if (botCount <= 19) {
      const bots = w.entities.slice(1);
      let close = 0;
      for (let i = 0; i < bots.length; i++)
        for (let j = i + 1; j < bots.length; j++)
          if (Math.hypot(bots[i]!.x - bots[j]!.x, bots[i]!.y - bots[j]!.y) < BOT_SPAWN_SPACING)
            close++;
      expect(close).toBe(0);
    }
    expect(w.phase).toBe('playing');
    expect(w.camera.x).toBeCloseTo(w.player.x - 640);
  });

  it('findSpawnPoint avoids houses', () => {
    setRandomSource(createSeededRandom(8));
    const houses = [{ x: 0, y: 0, w: 3000, h: 1500 }];
    const p = findSpawnPoint([], houses, [], 0, 5000);
    expect(inHouse(houses, p.x, p.y, 30)).toBeNull();
  });

  it('rejects overcrowded small-map settings without overlapping spawns', () => {
    setRandomSource(createSeededRandom(99));
    const w = createMatch(new Camera(1280, 720), null, { mapSize: 1000, numPlayers: 1000 });
    expect(w.mapSize).toBe(1000);
    expect(w.entities.length).toBe(100);
    const bodySep = minBodySpawnSeparation();
    for (let i = 0; i < w.entities.length; i++) {
      for (let j = i + 1; j < w.entities.length; j++) {
        const a = w.entities[i]!;
        const b = w.entities[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(bodySep - 0.01);
      }
    }
  });
});

describe('headless simulation', { timeout: 60_000 }, () => {
  it('a full match (bots only, player kept alive in the zone centre) ends with a single survivor', () => {
    setRandomSource(createSeededRandom(2026));
    const w = createMatch(new Camera(1280, 720), null, { mapSize: 5000, numPlayers: 20 });
    const botCount = numBots({ mapSize: 5000, numPlayers: 20 });
    let outcome = null;
    let steps = 0;
    while (!outcome && steps < 60 * 400) {
      w.player.hp = 1e6; // effectively invulnerable observer
      w.player.x = w.zone.x;
      w.player.y = w.zone.y;
      outcome = stepWorld(w, IDLE_CONTROLS, 1 / 60);
      steps++;
    }
    expect(outcome).toBe('won');
    expect(w.phase).toBe('won');
    expect(w.entities.filter((e) => e.alive)).toEqual([w.player]);
    const places = w.entities
      .filter((e) => !e.isPlayer)
      .map((e) => e.place)
      .sort((a, b) => a - b);
    expect(places).toEqual(Array.from({ length: botCount }, (_, i) => i + 2));
  });

  it('an idle player outside a closed zone is eventually eliminated', () => {
    setRandomSource(createSeededRandom(7));
    const w = createMatch(new Camera(1280, 720), null, DEFAULT_MATCH_SETTINGS);
    for (const e of w.entities) if (!e.isPlayer) e.alive = false;
    w.entities.push(bot(10, 10)); // keep the match going
    w.entities.at(-1)!.alive = true;
    w.zone.r = 10;
    w.zone.x = w.mapSize - 100;
    w.zone.y = w.mapSize - 100;
    w.player.x = 200;
    w.player.y = 200;
    let outcome = null;
    for (let i = 0; i < 60 * 300 && !outcome; i++) outcome = stepWorld(w, IDLE_CONTROLS, 1 / 60);
    expect(w.player.alive).toBe(false);
    expect(outcome).toBe('dead');
  });
});
