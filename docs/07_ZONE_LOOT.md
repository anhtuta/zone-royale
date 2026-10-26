# Zone ammunition supply

Late matches can run out of ground ammunition: initial loot is finite, bots hoard reserves, and
eliminations do not create ammo boxes when the victim had **zero reserve**. Survivors may be unable
to fight until the zone kills them.

This feature **replenishes ammo only** inside the current safe circle when a **zone phase pulse**
fires (`phaseAdvanced` or `closed`). Every pulse that actually spawns loot is **telegraphed**
(system kill-feed line + centre HUD toast). Silent spawns are not allowed.

Elimination drops are unchanged except by explicit policy below: **no ammo boxes from kills when
reserve is 0**; weapons still drop with whatever rounds remain in the magazine.

Vocab:

- **Pulse** — one run of the ammo supply logic (after a shrink ends or when the zone fully closes).
  - Phase pulse: after a shrink ends or when the zone fully closes.
- **Top-up** — add only what’s missing so ground ammo reaches the configured **floor** per family, not a fixed extra bundle every time.

## Player-facing behaviour

| When | What happens |
| ---- | ------------ |
| End of a zone shrink (`phaseAdvanced`) | If any ammo family is below its minimum on the ground, spawn boxes inside the safe zone until floors are met (or placement fails). Telegraph if anything spawned. |
| Zone fully closed (`closed`) | Same floor check once for endgame (last safe circle). Telegraph if anything spawned. |
| Start of shrink (`shrinkStarted`) | **No** supply drop (only the existing “zone is closing in” feed). |

Ammo boxes use the same pickup rules as map loot (player auto-pickup for ammo, bots use
`botWants()`). Supply drops are normal `LootItem` entries in `world.loot`, not a separate entity
type.

### Telegraph copy (v1)

Use the same sentence for kill-feed and HUD toast when a pulse spawns at least one box:

- **Text:** `Ammunition supply dropped in the safe zone`
- **Kill-feed:** `pushSystemFeed` (purple system line, 5s) — see `systems/feedback.ts`
- **HUD:** `showMessage` (centre toast, default duration)

If a pulse runs but **no** boxes were added (already at floor, or all placement retries failed),
do **not** show either message.

## Scope

| In scope | Out of scope |
| -------- | ------------ |
| Ammo boxes (`kind: 'ammo'`) for all four families in `AMMO_TYPES` | Weapons, med kits, armor |
| Placement inside current safe circle | Drops outside the zone |
| Scaling minimum counts by **alive players** (capped at survivor count) | Scaling by map size |
| Supply on `phaseAdvanced` and `closed` | Drops when shrink **starts**; timer-based top-up between shrinks |
| Tests with seeded RNG | UI redesign beyond existing feed + toast |

## Minimum loot (per ammo family)

Count only items on the ground: `world.loot` where `kind === 'ammo'`, grouped by `type`
(`light`, `shells`, `medium`, `heavy`).

For each family `t`:

```text
floor(t) = min(alive, max(1, round(baseFloor(t) * alive / REFERENCE_PLAYER_COUNT)))
```

- **`alive`:** living combatants when the pulse runs (`countAlive(world.entities)`).
- **`REFERENCE_PLAYER_COUNT`:** `50` (default match size from `matchSettings`).
- **`baseFloor(t)`:** config constants at that reference alive count (tune in
  `config/zoneLoot.ts`).

**`baseFloor`** with **50** survivors:

| Family | `baseFloor` | Rationale |
| ------ | ----------- | --------- |
| `light` | 8 | Pistol / SMG; most common |
| `medium` | 6 | Rifle |
| `shells` | 4 | Shotgun |
| `heavy` | 4 | Sniper |

Each spawned box uses existing **`AMMO_AMOUNT[type]`** from `config/weapons.ts` (not a new stack
size).

### Zone phase pulse

On **`phaseAdvanced`** and **`closed`**:

- For each family, `deficit = max(0, floor(t) - countOnGround(t))`.
- Spawn up to `deficit` boxes for that family (one box per successful placement).

## Placement

Implement in `systems/zoneLoot.ts`:

1. Sample a point uniformly in the disk: centre `(zone.x, zone.y)`, radius `zone.r - margin`.
2. **`margin`:** `ZONE_LOOT_EDGE_MARGIN` (**80px**), clamped so `zone.r > margin`.
3. Reuse **`circleFree(obstacles, x, y, LOOT_CLEARANCE, mapSize)`** from `systems/collision.ts`.
4. Up to **25** tries per box; on failure skip that box (do not place inside geometry).

## Triggers and simulation hook

Call from **`core/simulation.ts`** immediately after **`updateZone(world.zone, dt)`**:

```text
event = updateZone(...)
if event === 'shrinkStarted' → pushSystemFeed (existing)
else if event === 'phaseAdvanced' | 'closed' → handleZoneAmmoSupplyEvent(world, event)
```

**`handleZoneAmmoSupplyEvent`**: full floor fill per family; if any box spawned,
**`pushSystemFeed`** + **`showMessage`** with the v1 copy above.

Do not spawn from **`eliminate()`** for this feature.

### Eliminations (policy)

Keep current behaviour in `systems/combat.ts`:

- Drop **weapons** with current `mag` regardless of reserve.
- Drop **ammo boxes** only when `e.ammo[t] > 0`.
- **No** “drip” or bonus ammo on kill when reserve is zero.

## Configuration

**`src/config/zoneLoot.ts`:**

- `REFERENCE_PLAYER_COUNT`
- `ZONE_LOOT_BASE_FLOOR: Record<AmmoType, number>`
- `ZONE_LOOT_EDGE_MARGIN`
- `ZONE_LOOT_PLACEMENT_TRIES`
- `ZONE_LOOT_SUPPLY_MESSAGE`
- Export **`ammoFloorForAlive(aliveCount, type)`** (pure)

**`alive`** comes from `countAlive(world.entities)` at pulse time (shrinks as players die).

## Implementation phases

Work through in order; each phase should pass `pnpm typecheck && pnpm test` before
the next.

### Phase 1 — Zone pulse supply

- [x] Add `config/zoneLoot.ts` (`ammoFloorForAlive`, base floors, margin, placement tries).
- [x] Add `systems/zoneLoot.ts`: count ground ammo per family, spawn in safe disk
  (`circleFree`), build `LootItem` ammo boxes.
- [x] Telegraph when `spawned > 0`: `pushSystemFeed` + `showMessage` (v1 copy above).
- [x] Wire `core/simulation.ts` after `updateZone`: run supply on `phaseAdvanced` and
  `closed` only (not `shrinkStarted`).
- [x] Tests: `ammoFloorForAlive`, placement inside zone, `phaseAdvanced` fill, telegraph
  on spawn vs no spawn.

**Exit criteria:** After a shrink ends (or zone closes), ground ammo per family reaches
survivor-scaled floors when placement succeeds; players see feed + toast when boxes appear.

### Phase 2 — Regression, sim smoke, tuning

- [ ] `combat.test.ts`: elimination with zero reserve → no ammo loot; weapon drops keep
  `mag`.
- [ ] Headless sim: drain ground ammo, advance zone, assert new boxes exist.
- [ ] Tune `ZONE_LOOT_BASE_FLOOR` after playtests.

**Exit criteria:** No accidental elimination ammo drip; late-match dry scenario covered by
tests; knobs documented in this file match shipped constants.

## Code map

| Area | Responsibility |
| ---- | -------------- |
| `config/zoneLoot.ts` | Floors, margins, message copy; `ammoFloorForAlive` |
| `systems/zoneLoot.ts` | Count ground ammo, spawn in zone, telegraph |
| `core/simulation.ts` | Call supply on `phaseAdvanced` / `closed` |
| `systems/combat.ts` | No change except regression tests for elimination drops |
| `systems/feedback.ts` | Reuse `pushSystemFeed` + `showMessage` |

## Tests

| Test | Assert |
| ---- | ------ |
| `ammoFloorForAlive` | Scales with survivors; capped at `alive`; minimum 1 per family |
| Placement | Seeded positions inside `zone.r - margin`; `circleFree` |
| `phaseAdvanced` | Ground counts per family ≥ floor when obstacles sparse |
| Telegraph | Spawning calls feed + message; zero spawn does not |
| `combat.test.ts` | Elimination with zero reserve → no ammo loot; weapon mag unchanged |

Headless sim smoke: drain ammo, advance zone to `phaseAdvanced`, assert new ammo exists.

## Tuning notes

- If large lobbies feel flooded, lower `ZONE_LOOT_BASE_FLOOR`.
- With few survivors, `min(alive, …)` keeps floors from exceeding living players; `max(1, …)` still
  guarantees at least one box per family when below floor and `alive ≥ 1`.
- Bot cap (`BOT_AMMO_CAP`) can still pull ammo off the ground; floors measure **ground** only, which
  is intentional so supply pulses stay visible on the map.

## Related docs

- Zone phases and events: `src/systems/zone.ts`, `src/config/zone.ts`
- Initial loot: `src/systems/lootSpawner.ts`
- Match settings: [05_MATCH_SETTINGS.md](05_MATCH_SETTINGS.md)
