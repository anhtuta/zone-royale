# Configurable max HP (Normal / Extended / Marathon)

**Status:** Implemented.

Large lobbies on small maps die off too quickly: with baseline survivability, most combatants
are eliminated before or right after the first zone phase, leaving a sparse mid-game. This
feature adds a **saved match setting** for max HP that lengthens fights (more health) and
**stretches zone pacing** (longer waits/shrinks, scaled storm DPS). **Weapon damage is unchanged.**

Related: [05_MATCH_SETTINGS.md](05_MATCH_SETTINGS.md) (map size and player count use the same
settings modal and `MatchSettings` pipeline).

## Goals

- Keep matches **longer and denser** when the player chooses higher HP presets (especially
  500 players on a small map).
- **Default** preset matches today’s intended baseline: **100 max HP**.
- **Gun hits** use the same damage numbers at every preset; only “shots to kill” increases with
  max HP.
- **Zone** timing and outside-zone DPS scale with max HP so ring pressure stays meaningful
  without collapsing the lobby in phase 1.
- **Med kits** stay **+40 HP** everywhere (no scaling).

## Non-goals

- Changing weapon tables, armor absorb rules, or armor max (100).
- Scaling zone **end radii** (`PHASE_END_RADIUS_FRAC`) — still derived from map opening
  radius only.
- Scaling med kit heal amount or death-drop med values.

## Player-facing flow

1. **Start screen** — subtitle shows map, player count, and **HP mode** (after implementation).
2. **SETTINGS** — third control: **HP mode** → Normal / Extended / Marathon → **SAVE**
   (`localStorage` with map size and player count).
3. **PLAY** — `createMatch()` applies `maxHp` to every combatant and builds zone phases from
   that value.

## Presets

| UI label   | `maxHp` | Scale vs Normal |
| ---------- | ------- | --------------- |
| Normal     | 100     | ×1 (default)    |
| Extended   | 300     | ×3              |
| Marathon   | 500     | ×5              |

Invalid or missing storage values fall back to **Normal (100)**.

Storage JSON grows to `{ mapSize, numPlayers, maxHp }`. Older saves without `maxHp` normalize
to 100.

## Scaling rules

Define a single reference in config (e.g. `BASE_MAX_HP = 100`) and:

```text
hpScale = maxHp / BASE_MAX_HP
```

### Combatants

- Spawn with `hp = maxHp` (full health).
- Med kit pickup: `hp = min(maxHp, hp + 40)` (`MEDKIT_AMOUNT` unchanged).
- “Health is already full” when `hp >= maxHp`.
- Death drops and loot spawner continue to use fixed `MEDKIT_AMOUNT = 40`.

### Safe zone (`config/zone.ts`)

Keep `PHASE_TIMING` as the **Normal (100 HP) baseline** — current wait/shrink/dps table.

At match start, `buildZonePhases(startRadius, maxHp)` applies:

| Field   | Formula              |
| ------- | -------------------- |
| `wait`  | `base.wait × hpScale` |
| `shrink`| `base.shrink × hpScale` |
| `dps`   | `base.dps × hpScale` |
| `r`     | unchanged (map-scaled fractions only) |

`FINAL_ZONE_DPS_MULTIPLIER` (1.5 after the zone is fully closed) applies on top of the scaled
phase DPS, same as today.

**Example — phase 0 (Normal baseline 45 / 30 / 1 DPS):**

| Mode       | wait (s) | shrink (s) | DPS |
| ---------- | -------- | ---------- | --- |
| Normal     | 45       | 30         | 1   |
| Extended   | 135      | 90         | 3   |
| Marathon   | 225      | 150        | 5   |

Gun damage from bullets is **not** multiplied by `hpScale`.

### UI thresholds (fractions of max HP)

Replace hardcoded HP numbers tuned for 100 with ratios of `world.maxHp` (or `maxHp` passed into
pure helpers):

| Current (100 HP world) | Ratio   | Use |
| ---------------------- | ------- | --- |
| 30                     | 0.30    | Low-HP vignette (`hud.ts`), bot seek med in combat (`ai.ts`) |
| 85                     | 0.85    | `botWants()` med kits |
| 50 / 25                | 0.50 / 0.25 | `healthColor()` band thresholds |

HUD health bar fill: `(hp / maxHp) × barWidth` (fixes today’s `/100` fill when global max HP ≠ 100).

Armor bar stays **0..100** (`MAX_ARMOR` unchanged).

## Code map (implementation)

| Piece | Change |
| ----- | ------ |
| [`config/matchSettings.ts`](../src/config/matchSettings.ts) | `MAX_HP_OPTIONS` with labels; `maxHp` on `MatchSettings`; `normalizeMatchSettings()`; extend `DEFAULT_MATCH_SETTINGS` |
| [`config/constants.ts`](../src/config/constants.ts) | `BASE_MAX_HP = 100` for zone scaling; remove or stop using global spawn cap `MAX_HP` (300 today) in favour of per-match `maxHp` |
| [`core/world.ts`](../src/core/world.ts) | `World.maxHp` |
| [`systems/match.ts`](../src/systems/match.ts) | Pass `resolved.maxHp` into entity spawn and `createZone(mapSize, maxHp)` |
| [`entities/entity.ts`](../src/entities/entity.ts) | `createEntity(..., maxHp)` initial `hp` |
| [`systems/inventory.ts`](../src/systems/inventory.ts) | Cap and pickup checks use `world.maxHp`; `botWants` thresholds via ratio |
| [`config/zone.ts`](../src/config/zone.ts) | `buildZonePhases(startRadius, maxHp)` scales wait/shrink/dps |
| [`systems/zone.ts`](../src/systems/zone.ts) | `createZone(mapSize, maxHp)` |
| [`ui/settings.ts`](../src/ui/settings.ts) + [`index.html`](../index.html) | HP mode `<select>`; blurb includes label |
| [`ui/matchSettingsStorage.ts`](../src/ui/matchSettingsStorage.ts) | Persist `maxHp` (normalization on load/save) |
| [`ui/hud.ts`](../src/ui/hud.ts), [`render/draw.ts`](../src/render/draw.ts), [`render/entityRenderer.ts`](../src/render/entityRenderer.ts) | Vitals and colors vs `maxHp` |
| [`systems/ai.ts`](../src/systems/ai.ts) | Med-seek threshold vs `world.maxHp` |

Layer rules unchanged: scaling math in `config/` + `systems/`; render/UI read `World.maxHp`.

## Implementation checklist

1. **Config & types** — options, defaults, `hpScale` helper (optional), `BASE_MAX_HP`.
2. **World & match** — `maxHp` on `World`; thread through `createMatch` / `createEntity` /
   `createZone`.
3. **Zone phases** — extend `buildZonePhases`; update `PHASES` test export to pass explicit
   `maxHp` (100 for “default table” tests).
4. **Inventory & combat** — cap heals at `world.maxHp`; no change to `applyDamage` weapon path.
5. **AI & HUD** — ratio thresholds and bar widths.
6. **Settings UI** — select + blurb + storage.
7. **Tests** — normalization; phase timing/DPS at 100/300/500; spawn HP; med cap at 40; zone
   tick damage spot-check with scaled DPS.
8. **Docs** — update [05_MATCH_SETTINGS.md](05_MATCH_SETTINGS.md) and
   [01_INIT_PROJECT.md](01_INIT_PROJECT.md) config table when merging.

## Verification

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Manual: 500 players, Small map, **Marathon** — survive past first zone phase with noticeably
more alive combatants than **Normal** at the same settings; weapon TTK vs an isolated target
should feel identical aside from needing more hits at higher HP.

## Design notes

- **Why scale wait/shrink:** delays ring pressure and lengthens total match clock — addresses
  “everyone dead after phase 1.”
- **Why scale zone DPS:** with higher HP, fixed storm DPS would make the ring a minor threat;
  scaling keeps time-outside-zone roughly as punishing in **relative** terms.
- **Why not scale med kits:** simpler loot identity; higher HP modes rely on max pool + slower
  zone, not bigger heals.
- **Global `MAX_HP = 300` today:** implementation should align codebase with **100 default**
  and per-match `World.maxHp`; fix HUD `/100` assumptions in the same pass.
