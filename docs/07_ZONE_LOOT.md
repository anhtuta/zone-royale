# Zone ammunition supply

Late matches can run out of ground ammunition: initial loot is finite, bots hoard reserves, and
eliminations do not create ammo boxes when the victim had **zero reserve**. Survivors may be unable
to fight until the zone kills them.

This feature **replenishes ammo only** inside the current safe circle, on a schedule tied to the
zone and a periodic top-up during wait phases. Every replenishment pulse that actually spawns loot
is **telegraphed** (system kill-feed line + centre HUD toast). Silent spawns are not allowed.

Elimination drops are unchanged except by explicit policy below: **no ammo boxes from kills when
reserve is 0**; weapons still drop with whatever rounds remain in the magazine.

## Player-facing behaviour

| When | What happens |
| ---- | ------------ |
| End of a zone shrink (`phaseAdvanced`) | If any ammo family is below its minimum on the ground, spawn boxes inside the safe zone until floors are met (or placement fails). Telegraph if anything spawned. |
| Zone fully closed (`closed`) | Same floor check once for endgame (last safe circle). Telegraph if anything spawned. |
| During a phase **wait** (zone not shrinking) | On a fixed timer, run a smaller top-up per family if below the same floors. Telegraph if anything spawned. |
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
| Scaling minimum counts by **map size only** | Scaling by player count |
| Periodic + phase-boundary guarantees | Drops when shrink **starts** |
| Tests with seeded RNG | UI redesign beyond existing feed + toast |

## Minimum loot (per ammo family)

Count only items on the ground: `world.loot` where `kind === 'ammo'`, grouped by `type`
(`light`, `shells`, `medium`, `heavy`).

For each family `t`:

```text
floor(t) = max(1, round(baseFloor(t) * mapSize / REFERENCE_MAP_SIZE))
```

- **`REFERENCE_MAP_SIZE`:** `5000` (medium preset; same reference as default match settings).
- **`baseFloor(t)`:** config constants at reference map (suggested starting values below; tune in
  `config/zoneLoot.ts`).

Suggested **`baseFloor`** at 5000×5000 (implementation may adjust after playtesting):

| Family | `baseFloor` | Rationale |
| ------ | ----------- | --------- |
| `light` | 4 | Pistol / SMG; most common |
| `medium` | 3 | Rifle |
| `shells` | 2 | Shotgun |
| `heavy` | 2 | Sniper |

Each spawned box uses existing **`AMMO_AMOUNT[type]`** from `config/weapons.ts` (not a new stack
size).

### Phase pulse vs periodic top-up

**Phase pulse** (`phaseAdvanced`, and `closed`):

- For each family, `deficit = max(0, floor(t) - countOnGround(t))`.
- Spawn up to `deficit` boxes for that family (one box per successful placement).

**Periodic top-up** (only while `zone.state === 'wait'` and not `final`):

- Accumulate time on the world (e.g. `world.zoneLootTimer` or dedicated field on `World`).
- Every **`PERIODIC_SUPPLY_INTERVAL_S`** (config at reference map; suggest **90s**, not scaled by
  map size unless playtests say otherwise), run the **same deficit fill** as above, but cap each
  family per tick with **`PERIODIC_MAX_BOXES_PER_FAMILY`** (suggest **1**) so phase boundaries stay
  the main catch-up and periodic only nudges stalemates.

After a phase pulse, reset the periodic accumulator to **0** (optional but avoids double-pulse the
same frame as `phaseAdvanced`).

## Placement

Implement in `systems/` (extend `lootSpawner.ts` or add `zoneLoot.ts`):

1. Sample a point uniformly in the disk: centre `(zone.x, zone.y)`, radius `zone.r - margin`.
2. **`margin`:** config constant (suggest **80px**), clamped so `zone.r > margin`.
3. Reuse **`circleFree(obstacles, x, y, LOOT_CLEARANCE, mapSize)`** from `systems/collision.ts`.
4. Up to **25** tries per box; on failure skip that box (do not place inside geometry).

Ammo type for a box is fixed by whichever family is being refilled (not a random `pick()`), except
you may use the same weighted table only if you later add “random family” pulses (not in v1).

## Triggers and simulation hook

Call from **`core/simulation.ts`** immediately after **`updateZone(world.zone, dt)`** (same place as
the existing shrink-started feed):

```text
event = updateZone(...)
if event === 'shrinkStarted' → pushSystemFeed (existing)
else → maybeZoneAmmoSupply(world, { reason: event | 'periodic' })
```

**`maybeZoneAmmoSupply`** (owner: new or `lootSpawner`):

1. If `reason === 'periodic'`: only proceed when `zone.state === 'wait'` and interval elapsed;
   respect per-tick caps.
2. If `reason === 'phaseAdvanced' | 'closed'`: full floor fill per family.
3. If any loot was pushed to `world.loot`, call **`pushSystemFeed`** + **`showMessage`** with the
   v1 copy above.

Do not spawn from **`eliminate()`** for this feature.

### Eliminations (policy)

Keep current behaviour in `systems/combat.ts`:

- Drop **weapons** with current `mag` regardless of reserve.
- Drop **ammo boxes** only when `e.ammo[t] > 0`.
- **No** “drip” or bonus ammo on kill when reserve is zero.

## Configuration

New file **`src/config/zoneLoot.ts`** (preferred over bloating `constants.ts`):

- `REFERENCE_MAP_SIZE`
- `ZONE_LOOT_BASE_FLOOR: Record<AmmoType, number>`
- `ZONE_LOOT_EDGE_MARGIN`
- `PERIODIC_SUPPLY_INTERVAL_S`
- `PERIODIC_MAX_BOXES_PER_FAMILY`
- `ZONE_LOOT_PLACEMENT_TRIES`
- Export **`ammoFloorForMap(mapSize, type)`** (pure)

Match **`mapSize`** comes from `world.mapSize` (set in `createMatch()`).

## Implementation phases

Work through in order; each phase should pass `pnpm typecheck && pnpm test` before
the next. The whole feature can still ship in one PR if you prefer—phases 2–3 reuse
`fillDeficit()` and placement from phase 1.

### Phase 1 — Zone pulse supply

- [ ] Add `config/zoneLoot.ts` (`ammoFloorForMap`, base floors, margin, placement tries).
- [ ] Add `systems/zoneLoot.ts`: count ground ammo per family, spawn in safe disk
  (`circleFree`), build `LootItem` ammo boxes.
- [ ] Telegraph when `spawned > 0`: `pushSystemFeed` + `showMessage` (v1 copy above).
- [ ] Wire `core/simulation.ts` after `updateZone`: run supply on `phaseAdvanced` and
  `closed` only (not `shrinkStarted`).
- [ ] Tests: `ammoFloorForMap`, placement inside zone, `phaseAdvanced` fill, telegraph
  on spawn vs no spawn.

**Exit criteria:** After a shrink ends (or zone closes), ground ammo per family reaches
map-scaled floors when placement succeeds; players see feed + toast when boxes appear.

### Phase 2 — Periodic wait top-up

- [ ] Add `world.zoneLootTimer` (init in `createMatch()`).
- [ ] During `zone.state === 'wait'` (not `final`), tick timer; every
  `PERIODIC_SUPPLY_INTERVAL_S` run deficit fill with `PERIODIC_MAX_BOXES_PER_FAMILY` cap.
- [ ] Reset timer after a zone pulse (`phaseAdvanced` / `closed` supply run).
- [ ] Tests: periodic only in `wait`, respects per-family cap, telegraph unchanged.

**Exit criteria:** Long waits between shrinks can add ammo without waiting for the next
`phaseAdvanced`; phase boundaries remain the main catch-up.

### Phase 3 — Regression, sim smoke, tuning

- [ ] `combat.test.ts`: elimination with zero reserve → no ammo loot; weapon drops keep
  `mag`.
- [ ] Headless sim: drain ground ammo, advance zone, assert new boxes exist.
- [ ] Tune `ZONE_LOOT_BASE_FLOOR` / `PERIODIC_SUPPLY_INTERVAL_S` after playtests.

**Exit criteria:** No accidental elimination ammo drip; late-match dry scenario covered by
tests; knobs documented in this file match shipped constants.

## Code map (planned)

| Area | Responsibility |
| ---- | -------------- |
| `config/zoneLoot.ts` | Floors, intervals, margins; map scaling helper |
| `systems/zoneLoot.ts` (or `lootSpawner.ts`) | Count ground ammo, spawn in zone, telegraph |
| `core/world.ts` | Optional: `zoneLootTimer` (seconds since last periodic tick) |
| `core/simulation.ts` | Wire zone events + periodic step |
| `systems/combat.ts` | No change except regression tests for elimination drops |
| `systems/feedback.ts` | Reuse `pushSystemFeed` + `showMessage` |

## Tests (planned)

| Test | Assert |
| ---- | ------ |
| `ammoFloorForMap` | Scales with `mapSize`; minimum 1 per family |
| Placement | Seeded positions inside `zone.r - margin`; `circleFree` |
| `phaseAdvanced` | Ground counts per family ≥ floor when obstacles sparse |
| Telegraph | Spawning calls feed + message; zero spawn does not |
| Periodic | Only in `wait`; respects cap per family |
| `combat.test.ts` | Elimination with zero reserve → no ammo loot; weapon mag unchanged |

Headless sim smoke: drain ammo, advance zone to `phaseAdvanced`, assert new ammo exists.

## Tuning notes

- If large maps feel flooded, lower `baseFloor` or raise `PERIODIC_SUPPLY_INTERVAL_S`.
- If small maps still dry up, `max(1, …)` already guarantees at least one box per family per pulse
  when below floor.
- Bot cap (`BOT_AMMO_CAP`) can still pull ammo off the ground; floors measure **ground** only, which
  is intentional so supply pulses stay visible on the map.

## Related docs

- Zone phases and events: `src/systems/zone.ts`, `src/config/zone.ts`
- Initial loot: `src/systems/lootSpawner.ts`
- Match map size: [05_MATCH_SETTINGS.md](05_MATCH_SETTINGS.md)
