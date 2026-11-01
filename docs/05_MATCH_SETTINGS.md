# Configurable map size, player count, and HP mode

Match scale used to be fixed globals (`MAP_SIZE`, `NUM_BOTS` in `constants.ts`). Players can
now choose map size, total player count, and **HP mode** from the start screen before each
match. Choices are saved in the browser and drive map generation, spawning, combatant health,
safe-zone pacing, and rendering.

HP mode details: [10_MAX_HP_MODE.md](10_MAX_HP_MODE.md).

## Player-facing flow

1. **Start screen** — subtitle shows **player count**, **map**, and **HP mode** (highlighted;
   change them in **SETTINGS**).
2. **SETTINGS** — pick map size, players, and HP mode → **SAVE** (stored in `localStorage`).
3. **PLAY** — starts a match with the saved settings (`NUM_BOTS = numPlayers − 1`).
4. **End screen** — **PLAY AGAIN** uses the same saved settings; **HOME** returns to the start
   screen (controls + **SETTINGS**). Settings are not shown on the end overlay.

## Presets

| Map label  | `mapSize` (px) |
| ---------- | -------------- |
| Small      | 1000           |
| Medium     | 5000 (default) |
| Large      | 10000          |
| Huge       | 20000          |
| Gigantic   | 50000          |

**Players:** 20, 50 (default), 100, 500, 1000.

| HP mode label | `maxHp` | Default |
| ------------- | ------- | ------- |
| Normal        | 100     | yes     |
| Extended      | 300     |         |
| Marathon      | 500     |         |

Invalid or missing storage values fall back to the defaults above.

## Code map

| Piece | Role |
| ----- | ---- |
| [`config/matchSettings.ts`](../src/config/matchSettings.ts) | Presets, `MatchSettings`, `normalizeMatchSettings()`, `numBots()`, `zoneStartRadius(mapSize)` |
| [`ui/matchSettingsStorage.ts`](../src/ui/matchSettingsStorage.ts) | `loadMatchSettings()` / `saveMatchSettings()` → key `zoneRoyale.matchSettings` |
| [`ui/settings.ts`](../src/ui/settings.ts) | Settings modal; `matchSettingsBlurb()` for the start subtitle HTML |
| [`core/world.ts`](../src/core/world.ts) | `World.mapSize`, `World.maxHp` |
| [`systems/match.ts`](../src/systems/match.ts) | `createMatch(camera, sound, settings)` spawns bots at `settings.maxHp` |
| [`config/zone.ts`](../src/config/zone.ts) + [`systems/zone.ts`](../src/systems/zone.ts) | `buildZonePhases(zoneStartRadius(mapSize), maxHp)`; phase radii scale with map, timing/DPS with HP |
| [`world/mapgen.ts`](../src/world/mapgen.ts) | `generateMap(mapSize)`; obstacle counts scale with map area |

Systems that need bounds (collision clamp, loot spawn, AI wander, render, minimap) read
`world.mapSize` or take `mapSize` as an argument — there is no global `MAP_SIZE` constant
anymore. Health caps and zone scaling read `world.maxHp`.

## Adding a preset

1. Append to `MAP_SIZE_OPTIONS`, `PLAYER_COUNT_OPTIONS`, or `MAX_HP_OPTIONS` in `matchSettings.ts`.
2. `normalizeMatchSettings()` picks up new values automatically via the option sets.
3. Storage JSON: `{ mapSize, numPlayers, maxHp }` (older saves without `maxHp` normalize to 100).

## Tests

[`tests/matchSettings.test.ts`](../tests/matchSettings.test.ts) covers defaults, normalization,
and zone start radius. [`tests/maxHpMode.test.ts`](../tests/maxHpMode.test.ts) covers HP presets
and zone scaling. Match/zone tests use `DEFAULT_MATCH_SETTINGS` or explicit settings passed into
`createMatch()`.
