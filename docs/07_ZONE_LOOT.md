# Zone combat supply

Late matches can run out of ground ammunition and weapons: initial loot is finite, bots hoard
reserves and better guns, and eliminations do not create ammo boxes when the victim had **zero
reserve**. Survivors may be unable to fight until the zone kills them.

This feature **replenishes ammo and weapons** inside the current safe circle when a **zone phase
pulse** fires (`phaseAdvanced` or `closed`). Every pulse that actually spawns loot is
**telegraphed** (system kill-feed line + centre HUD toast). Silent spawns are not allowed.

**Shipped today:** ammo floors (Phases 1–2). **Planned:** weapon floors (Phase 3 below).

Elimination drops are unchanged except by explicit policy below: **no ammo boxes from kills when
reserve is 0**; weapons still drop with whatever rounds remain in the magazine.

Vocab:

- **Pulse** — one run of the zone supply logic (after a shrink ends or when the zone fully closes).
  - Phase pulse: after a shrink ends or when the zone fully closes.
- **Top-up** — add only what’s missing so ground loot reaches the configured **floor** (per ammo
  family or total weapons), not a fixed extra bundle every time.

## Player-facing behaviour

| When | What happens |
| ---- | ------------ |
| End of a zone shrink (`phaseAdvanced`) | Top up ground **ammo** (and **weapons**, Phase 3) to survivor-scaled floors inside the safe zone. Telegraph if anything spawned. |
| Zone fully closed (`closed`) | Same floor checks once for endgame (last safe circle). Telegraph if anything spawned. |
| Start of shrink (`shrinkStarted`) | **No** supply drop (only the existing “zone is closing in” feed). |

Ammo boxes use the same pickup rules as map loot (player auto-pickup for ammo, bots use
`botWants()`). Supply drops are normal `LootItem` entries in `world.loot`, not a separate entity
type.

### Telegraph copy

Use the same sentence for kill-feed and HUD toast when a pulse spawns at least one supply item
(ammo box and/or weapon):

| Version | When | Text |
| ------- | ---- | ---- |
| v1 (ammo only) | Phases 1–2 | `Ammunition supply dropped in the safe zone` |
| v2 (ammo + weapons) | Phase 3 | `Combat supply dropped in the safe zone` |

- **Kill-feed:** `pushSystemFeed` (purple system line, 5s) — see `systems/feedback.ts`
- **HUD:** `showMessage` (centre toast, default duration)

If a pulse runs but **nothing** was added (already at floors, or all placement retries failed),
do **not** show either message.

## Scope

| In scope | Out of scope |
| -------- | ------------ |
| Ammo boxes (`kind: 'ammo'`) for all four families in `AMMO_TYPES` | Med kits, armor |
| Ground weapons (`kind: 'weapon'`) on zone pulses (Phase 3) | Weapon supply on shrink **start** |
| Placement inside current safe circle | Drops outside the zone |
| Scaling minimum counts by **alive players** (capped at survivor count) | Scaling by map size |
| Supply on `phaseAdvanced` and `closed` | Drops when shrink **starts**; timer-based top-up between shrinks |
| Tests with seeded RNG | UI redesign beyond existing feed + toast |

## Minimum loot — ammunition (per family)

Count only items on the ground: `world.loot` where `kind === 'ammo'`, grouped by `type`
(`light`, `shells`, `medium`, `heavy`).

For each family `t`:

```js
floor(t) = min(alive, max(1, round(baseFloor(t) * alive / ZONE_LOOT_FLOOR_ALIVE_DIVISOR)))
```

- **`alive`:** living combatants when the pulse runs (`countAlive(world.entities)`).
- **`ZONE_LOOT_FLOOR_ALIVE_DIVISOR`:** `10` — scales floors with survivors; lower → more boxes (not tied to lobby settings).
- **`baseFloor(t)`:** config constants in `config/zoneLoot.ts`.

**Example floors @ 100 alive** (divisor **10**; each value is **boxes on the ground**, not rounds inside boxes):

| Family | `baseFloor` | Floor @ 100 alive |
| ------ | ----------- | ----------------- |
| `light` | 8 | 80 |
| `medium` | 6 | 60 |
| `shells` | 4 | 40 |
| `heavy` | 4 | 40 |

After a pulse tops up to these counts, **later pulses spawn nothing** until pickups or eliminations
reduce ground counts below the floor again (see **Top-up** above).

Each spawned box uses existing **`AMMO_AMOUNT[type]`** from `config/weapons.ts` (not a new stack
size).

### Zone phase pulse (ammo)

On **`phaseAdvanced`** and **`closed`**:

- For each family, `deficit = max(0, floor(t) - countOnGround(t))`.
- Spawn up to `deficit` boxes for that family (one box per successful placement).

## Minimum loot — weapons (Phase 3)

Count items on the ground: `world.loot` where `kind === 'weapon'` (all types combined).

```js
weaponFloor(alive) = min(alive, max(1, round(ZONE_LOOT_WEAPON_BASE_FLOOR * alive / ZONE_LOOT_FLOOR_ALIVE_DIVISOR)))
```

- **`ZONE_LOOT_WEAPON_BASE_FLOOR`:** config constant in `config/zoneLoot.ts` (start at **2**; tune
  after playtests — weapons are scarcer than ammo boxes).
- Reuse **`ZONE_LOOT_FLOOR_ALIVE_DIVISOR`** (`10`) so scaling matches ammo.

**Example @ 100 alive** (base **2**, divisor **10**): floor **20** weapons on the ground.

### Zone phase pulse (weapons)

On the same events as ammo:

- `deficit = max(0, weaponFloor(alive) - countWeaponsOnGround())`.
- Spawn up to `deficit` weapons (one per successful placement).

Each spawned weapon:

- **Type:** `weaponForRoll(random())` from `systems/lootSpawner.ts` (same weights as initial map
  loot).
- **Magazine:** full `WEAPONS[type].mag` (not partial mags from eliminations).
- **Paired ammo (recommended):** one box of the weapon’s ammo family, offset **30px** from the
  gun (same geometry as `rollLoot`’s weapon branch); skip offset placement if `circleFree` fails
  and place the box on the weapon tile instead.

Run **ammo fill first, then weapon fill** in one handler so paired ammo from weapons counts toward
the next ammo pulse’s ground counts (no double telegraph).

## Placement

Implement in `systems/zoneLoot.ts`:

1. Sample a point uniformly in the disk: centre `(zone.x, zone.y)`, radius **`placementR`**
   (full safe circle, including tiny late-game radii).
2. **`placementR`:** current `zone.r` for `phaseAdvanced`; for **`closed`**, the last
   positive phase end radius from the schedule (`zoneLootClosedPlacementRadius`) because
   `zone.r` is **0** when the pulse runs.
3. Reuse **`circleFree(obstacles, x, y, LOOT_CLEARANCE, mapSize)`** from `systems/collision.ts`.
4. Up to **25** tries per box; on failure skip that box (do not place inside geometry).

## Triggers and simulation hook

Call from **`core/simulation.ts`** immediately after **`updateZone(world.zone, dt)`**:

```js
event = updateZone(...)
if event === 'shrinkStarted' → pushSystemFeed (existing)
else if event === 'phaseAdvanced' | 'closed' → handleZoneSupplyEvent(world, event)
```

**`handleZoneSupplyEvent`** (rename from `handleZoneAmmoSupplyEvent` in Phase 3): ammo fill, then
weapon fill; if **any** ammo box or weapon spawned, **`pushSystemFeed`** + **`showMessage`** once
(v1 until Phase 3 ships weapons, then v2 copy above).

Do not spawn from **`eliminate()`** for this feature.

### Eliminations (policy)

Keep current behaviour in `systems/combat.ts`:

- Drop **weapons** with current `mag` regardless of reserve.
- Drop **ammo boxes** only when `e.ammo[t] > 0`.
- **No** “drip” or bonus ammo on kill when reserve is zero.

## Implementation phases

Work through in order; each phase should pass `pnpm typecheck && pnpm test` before
the next.

### Phase 1 — Zone pulse supply

- [x] Add `config/zoneLoot.ts` (`ammoFloorForAlive`, base floors, placement tries).
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

- [x] `combat.test.ts`: elimination with zero reserve → no ammo loot; weapon drops keep
  `mag`.
- [x] Headless sim: drain ground ammo, advance zone, assert new boxes exist.
- [x] Tune `ZONE_LOOT_BASE_FLOOR` after playtests.

**Exit criteria:** No accidental elimination ammo drip; late-match dry scenario covered by
tests; knobs documented in this file match shipped constants.

### Phase 3 — Zone pulse weapon supply

- [ ] Add `ZONE_LOOT_WEAPON_BASE_FLOOR` and `weaponFloorForAlive()` in `config/zoneLoot.ts`.
- [ ] Add `countGroundWeapons()`, `trySpawnWeaponInZone()` (full mag + paired ammo), and
  `fillZoneWeaponsToFloor()` in `systems/zoneLoot.ts` (reuse `zoneLootUsableRadius`,
  `ZONE_LOOT_PLACEMENT_TRIES`, `circleFree`).
- [ ] Extend pulse handler: run ammo fill then weapon fill; telegraph once when
  `spawnedAmmo + spawnedWeapons > 0`; set `ZONE_LOOT_SUPPLY_MESSAGE` to v2 copy.
- [ ] Tests: `weaponFloorForAlive`, weapon placement inside zone disk, `phaseAdvanced` /
  `closed` weapon top-up, telegraph when weapons spawn (and when only weapons spawn with ammo
  already at floor).

**Exit criteria:** After a shrink ends (or zone closes), ground weapon count reaches the
survivor-scaled weapon floor when placement succeeds; paired ammo follows the same rules as map
weapon loot; players see feed + toast when any supply item appears.

## Tuning notes

- If large lobbies feel flooded, lower `ZONE_LOOT_BASE_FLOOR` and/or
  `ZONE_LOOT_WEAPON_BASE_FLOOR`.
- With few survivors, `min(alive, …)` keeps floors from exceeding living players; `max(1, …)` still
  guarantees at least one box per family when below floor and `alive ≥ 1`.
- Bot cap (`BOT_AMMO_CAP`) can still pull ammo off the ground; floors measure **ground** only, which
  is intentional so supply pulses stay visible on the map.

## Related docs

- Zone phases and events: `src/systems/zone.ts`, `src/config/zone.ts`
- Initial loot: `src/systems/lootSpawner.ts`
- Match settings: [05_MATCH_SETTINGS.md](05_MATCH_SETTINGS.md)
