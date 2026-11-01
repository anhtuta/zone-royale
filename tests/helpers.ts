import { BASE_MAX_HP } from '../src/config/constants';
import { DEFAULT_MATCH_SETTINGS } from '../src/config/matchSettings';
import { Camera } from '../src/core/camera';
import type { SoundKind, SoundSink, World } from '../src/core/world';
import { createEntity, type Entity } from '../src/entities/entity';
import { createZone } from '../src/systems/zone';

/** Records every sound request instead of playing it. */
export class RecordingSound implements SoundSink {
  played: { kind: SoundKind; volume: number; extra?: number }[] = [];
  play(kind: SoundKind, volume: number, extra?: number): void {
    this.played.push({ kind, volume, extra });
  }
}

/** Creates a bot at a position. */
export function bot(x: number, y: number, name = 'Bot', maxHp: number = DEFAULT_MATCH_SETTINGS.maxHp): Entity {
  return createEntity(false, name, '#e57373', x, y, maxHp);
}

/**
 * Builds a minimal world with an empty map, the player at (1500, 1500) and a
 * zone covering the whole map. Extra entities can be appended to `entities`.
 */
export function makeWorld(overrides: Partial<World> = {}): World {
  const mapSize = overrides.mapSize ?? DEFAULT_MATCH_SETTINGS.mapSize;
  const maxHp = overrides.maxHp ?? DEFAULT_MATCH_SETTINGS.maxHp;
  const player = createEntity(true, 'You', '#42a5f5', mapSize / 2, mapSize / 2, maxHp);
  return {
    phase: 'playing',
    mapSize,
    maxHp,
    obstacles: [],
    houses: [],
    decor: [],
    loot: [],
    entities: [player],
    player,
    bullets: [],
    particles: [],
    floaters: [],
    killfeed: [],
    zone: createZone(mapSize, maxHp),
    camera: new Camera(1280, 720),
    camTarget: player,
    spectating: false,
    gameTime: 0,
    endTimer: -1,
    shake: 0,
    message: { text: '', t: 0 },
    sfxBudget: 6,
    sound: null,
    ...overrides,
  };
}

export { BASE_MAX_HP };
