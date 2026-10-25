# Configurable map size and player count

Match scale used to be fixed globals (`MAP_SIZE`, `NUM_BOTS` in `constants.ts`). Players can
now choose map size and total player count from the start screen before each match. Choices
are saved in the browser and drive map generation, spawning, the safe zone, and rendering.

## Player-facing flow

1. **Start screen** — subtitle shows the current **player count** and **map** preset (highlighted;
   change them in **SETTINGS**).
2. **SETTINGS** — pick map size and players → **SAVE** (stored in `localStorage`).
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

Invalid or missing storage values fall back to the defaults above.

## Code map

| Piece | Role |
| ----- | ---- |
| [`config/matchSettings.ts`](../src/config/matchSettings.ts) | Presets, `MatchSettings`, `normalizeMatchSettings()`, `numBots()`, `zoneStartRadius(mapSize)` |
| [`ui/matchSettingsStorage.ts`](../src/ui/matchSettingsStorage.ts) | `loadMatchSettings()` / `saveMatchSettings()` → key `zoneRoyale.matchSettings` |
| [`ui/settings.ts`](../src/ui/settings.ts) | Settings modal; `matchSettingsBlurb()` for the start subtitle HTML |
| [`core/world.ts`](../src/core/world.ts) | `World.mapSize` — per-match world width/height |
| [`systems/match.ts`](../src/systems/match.ts) | `createMatch(camera, sound, settings)` spawns `numBots(settings)` bots |
| [`config/zone.ts`](../src/config/zone.ts) + [`systems/zone.ts`](../src/systems/zone.ts) | `buildZonePhases(zoneStartRadius(mapSize))` on each zone; phase radii scale with map |
| [`world/mapgen.ts`](../src/world/mapgen.ts) | `generateMap(mapSize)`; obstacle counts scale with map area |

Systems that need bounds (collision clamp, loot spawn, AI wander, render, minimap) read
`world.mapSize` or take `mapSize` as an argument — there is no global `MAP_SIZE` constant
anymore.

## Adding a preset

1. Append to `MAP_SIZE_OPTIONS` or `PLAYER_COUNT_OPTIONS` in `matchSettings.ts`.
2. `normalizeMatchSettings()` picks up new values automatically via the option sets.
3. No change to storage format (plain JSON `{ mapSize, numPlayers }`).

## Tests

[`tests/matchSettings.test.ts`](../tests/matchSettings.test.ts) covers defaults, normalization,
and zone start radius. Match/zone tests use `DEFAULT_MATCH_SETTINGS` or explicit settings
passed into `createMatch()`.
