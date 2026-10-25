# Obstacle sprites (rocks and trees)

Plan for multi-variant obstacle art: bundled images when
`VITE_USE_OBSTACLE_IMAGES` is true, procedural Canvas 2D fallback when false.
Gameplay collision stays **circles**; only rendering and culling use sprite bounds.

Related: [01_INIT_PROJECT.md](01_INIT_PROJECT.md) (layers), [04_GAME_MATH.md](04_GAME_MATH.md)
(collision broad phase), [05_MATCH_SETTINGS.md](05_MATCH_SETTINGS.md) (mapgen).

Vocab:

- Procedural foliage: tán lá được tạo ra bằng thuật toán.
- Canopy: the visible leafy mass above the trunk — what you see as “the tree”, not the collision circle.
  - Gameplay collision uses `r` (small circle at the obstacle centre).
  - Drawing uses **`vr`** (“visual radius”): on the map, `vr ≈ 1.55 × r`, so the art is much larger than the hitbox (see `fuzzyClump` in [`treeRenderer.ts`](../src/render/treeRenderer.ts)).
- Clump: one blob of procedural foliage from `fuzzyClump()`: a wobbly circle with radial green shading and speckles.
  - `drawTreeCanvas` draws three clumps.
- Culling: not drawing something because it can’t be on screen, to save work each frame.
  - See `drawWorld` in [`worldRenderer.ts`](../src/render/worldRenderer.ts).

## Goals

- Draw **rocks** from random variants at map creation (not per frame).
- Draw **trees** from random variants the same way.
- One flag for all circular obstacles: `VITE_USE_OBSTACLE_IMAGES` ([`config/env.ts`](../src/config/env.ts)).
- Keep existing procedural rock circles and painterly trees when the flag is false.
- Asset layout under `src/assets/sprites/obstacles/`.

## World coordinates and anchors

| Kind | `(x, y)` meaning | Collision |
| ---- | ---------------- | --------- |
| **Rock** | Centre of the collision circle | Circle radius `r` at `(x, y)` |
| **Tree** | **Bottom-centre** on the ground (sprite foot) | Circle radius `r` at **derived** centre `(x, y - lift)` |

`lift` is how far the collision centre sits **above** the foot, in pixels or as a
fraction of `r`. It lives in the per-variant catalog (and can default from `r` until
tuned). All movement, bullets, line-of-sight, loot clearance, and AI must use the
**collision centre**, not the foot.

Add a small pure helper (e.g. `treeCollisionCenter(tree)` in `utils/` or
`systems/collision.ts`) so render, mapgen, and tests share one definition.

**Rocks:** sprite is anchored so its visual mass is centred on `(x, y)` (tune per
variant with offset/scale in config).

**Trees:** sprite is drawn with its **bottom-centre** at `(x, y)`; height/width come
from `vr` and natural aspect ratio (same idea as today’s `SPRITE_HEIGHT_MUL` in
[`treeRenderer.ts`](../src/render/treeRenderer.ts)).

## Asset layout

```
src/assets/sprites/obstacles/
  rocks/
    Foothill_6.webp
    Foothill_7.webp
    Sword_Cake.webp
    6th_Anniversary_Cake.webp
  trees/
    BB_Grove.webp
    Clashmas_Tree_2015.webp
    Clashmas_Tree_2024.webp
    Large_Tree.webp
    XmasTree_2025.webp
```

Combatant reference SVGs stay in `src/assets/sprites/` (see
[02_COMBATANT_ART.md](02_COMBATANT_ART.md)).

## Config catalog (`config/obstacleSprites.ts`)

Data only — no `document` / `Image`. Suggested shape per variant:

| Field | Purpose |
| ----- | ------- |
| `id` | Stable string key (tests, optional future saves) |
| `url` | Static import re-exported for the render layer |
| `heightMul` | World height from `r` (rock) or `vr` (tree) |
| `anchor` | `'center'` (rock) or `'bottom-center'` (tree) |
| `collisionLift` | Tree only: foot → collision centre (px or × `r`) |
| `collisionRadiusScale` | Optional multiplier on generated `r` for wide/narrow art |
| `drawOffsetX`, `drawOffsetY` | Fine-tune after first in-game pass |

Ordered arrays define variant indices: `ROCK_VARIANTS`, `TREE_VARIANTS`.

Render code maps `variant` index → metadata + loaded `HTMLImageElement`.

## World types (`world/types.ts`)

Extend obstacles created by mapgen:

```ts
// RockObstacle / TreeObstacle
readonly variant: number; // 0 .. VARIANT_COUNT - 1, chosen once in scatter()
```

Keep `shade` for procedural fallback tinting. Sprite path may ignore it or apply a
subtle global tint later.

## Runtime flag

- `USE_OBSTACLE_IMAGES` from `VITE_USE_OBSTACLE_IMAGES` (default `false` in
  [`.env.example`](../.env.example)).
- When false: no image loads required; `loadObstacleSprites()` resolves immediately.
- When true: preload all rock + tree variants at boot (parallel `Promise.all`).

## Collision policy (unchanged model, tree centre shift)

- **Walls:** AABB (unchanged).
- **Rocks / trees:** circle vs circle / segment-vs-circle in
  [`systems/collision.ts`](../src/systems/collision.ts).
- **Trees:** canopy / overhang in the bitmap does **not** block unless we later
  change `segmentObstacle` (out of scope). Blocking radius remains `r` at the
  collision centre.
- **Tuning:** per-variant `collisionRadiusScale` and tree `collisionLift` so
  transparent grass fringes do not feel unfair.

No alpha hit-testing or polygon footprints in v1.

## Render responsibilities

| Module | Role |
| ------ | ---- |
| [`config/obstacleSprites.ts`](../src/config/obstacleSprites.ts) | Variant tables |
| [`render/obstacleSprites.ts`](../src/render/obstacleSprites.ts) | Load images, `getRockImage(n)`, `getTreeImage(n)` |
| [`render/rockRenderer.ts`](../src/render/rockRenderer.ts) | `drawRock`, `rockSpriteBounds`, culling |
| [`render/treeRenderer.ts`](../src/render/treeRenderer.ts) | Multi-variant trees, foot anchor, bounds |
| [`render/worldRenderer.ts`](../src/render/worldRenderer.ts) | Call rock/tree drawers; remove inline rock circles when images enabled |
| [`main.ts`](../src/main.ts) | `loadObstacleSprites()` (replace or wrap `loadTreeSprite`) |

Procedural fallbacks stay in `rockRenderer` / `treeRenderer` (extract rock Canvas
art from `worldRenderer` when implementing).

## Mapgen (`world/mapgen.ts`)

In `scatter()`:

1. Pick `variant` with the same seeded RNG as today (`utils/random.ts`).
2. Apply optional `collisionRadiusScale` when choosing `r`.
3. For trees, set `vr` as today; position `(x, y)` is the **foot** (may require
   small adjustment to how we think about placement vs houses/other obstacles).

## Implementation phases

Work through in order; each phase should pass `pnpm typecheck && pnpm test` before
the next.

### Phase 0 — Docs and assets (done)

- [x] This document.
- [x] Move sprites into `obstacles/rocks/` and `obstacles/trees/`.
- [x] Fix existing `Large_Tree.webp` import path in `treeRenderer.ts`.

### Phase 1 — Catalog and types (done)

- [x] Add `config/obstacleSprites.ts` with all variants, imports, and placeholder
  layout numbers (copy current tree constants as defaults for `Large_Tree`).
- [x] Add `variant: number` to `RockObstacle` and `TreeObstacle`; update TSDoc for
  tree `(x, y)` = bottom-centre.
- [x] Add `treeCollisionCenter()` in `world/obstacleGeometry.ts` (collision +
  minimap + debug use `circleObstacleCollision()`).
- [x] Update tests/fixtures; `tests/obstacleGeometry.test.ts`.

**Exit criteria:** Types compile; helper unit-tested; no visual change yet (`collisionLiftR`
is `0`; mapgen sets `variant: 0` until Phase 2).

### Phase 2 — Mapgen variant + tree foot semantics (done)

- [x] `scatter()` assigns `variant` per rock/tree (`randInt` over catalog size).
- [x] Tree placement: foot at `(x, y)`; `circleFree` uses
  `treeFootCollisionCenter()` (trunk circle, not the foot point).
- [x] `tests/mapgen.test.ts` — seeded variant lists match.

**Exit criteria:** Seeded maps pick stable variants; collision uses tree collision
centre. With `collisionLiftR === 0`, foot equals legacy centre until Phase 6 tuning.

### Phase 3 — Sprite loading (done)

- [x] [`render/obstacleSprites.ts`](../src/render/obstacleSprites.ts):
  `loadObstacleSprites()`, `obstacleSpritesReady()`, `getRockImage` / `getTreeImage`.
- [x] Gated by `USE_OBSTACLE_IMAGES`; any load failure rejects the batch.
- [x] [`main.ts`](../src/main.ts) calls `loadObstacleSprites()` (fire-and-forget).
- [x] `loadTreeSprite()` → thin alias; trees draw via `getTreeImage(tree.variant)` when ready.

**Exit criteria:** With flag true, all images load; with false, instant resolve.

### Phase 4 — Rock renderer (done)

- [x] [`render/rockRenderer.ts`](../src/render/rockRenderer.ts): bounds, shadow, `drawRock` (image + procedural).
- [x] [`worldRenderer.ts`](../src/render/worldRenderer.ts) uses `rockInView` + `drawRock`.
- [x] `tests/rockRenderer.test.ts` — bounds smoke tests.

**Exit criteria:** Rocks show random variants when flag true; circles when false.

### Phase 5 — Tree renderer multi-variant (done)

- [x] [`treeRenderer.ts`](../src/render/treeRenderer.ts): `treeSpriteDef` per variant (`heightMul`, offsets).
- [x] Bottom-centre foot anchor via `treeSpriteDrawRect`; shadow at foot (`SHADOW_BELOW_FOOT_FRAC`).
- [x] `treeSpriteInView` uses sprite AABB (+ shadow pad); shadow pass uses same culling.
- [x] Procedural `drawTreeCanvas` unchanged as fallback.

**Exit criteria:** All five tree assets rotate by `variant`; culling correct.

### Phase 6 — Tuning and polish (done)

- [x] Per-variant tables in [`config/obstacleSprites.ts`](../src/config/obstacleSprites.ts)
  (`heightMul`, `drawOffset`, `collisionLiftR`, `collisionRadiusScale`).
- [x] Mapgen applies `rockCollisionRadius` / `treeCollisionRadius` when scattering.
- [x] Minimap already uses `circleObstacleCollision()` (collision centre for trees).
- [x] [`.env.example`](../.env.example) points at the catalog for image mode tuning.
- [x] `tests/obstacleSprites.catalog.test.ts` — sanity on tuned constants.

**Exit criteria:** No obvious foot sliding; collision feels fair (re-tune catalog after art changes).

#### Tuning reference

Edit [`config/obstacleSprites.ts`](../src/config/obstacleSprites.ts) per variant:

| Field | Effect |
| ----- | ------ |
| **`heightMul`** | Sprite height = `vr × heightMul` — **make the tree bigger** by raising this (e.g. 3.0 → 3.5). |
| **`drawOffsetY`** | Moves the **image** up (negative) or down (positive) relative to map `(x,y)`. Collision foot uses the same offset. |
| **`collisionLiftR`** | Moves the **collision circle up**: centre at `footY − collisionLiftR × r`. Raise if the pink debug ring sits too low (try +0.1 steps). |
| **`mapgenBaseR`** | Fixed spawn size for this variant (same image ⇒ same `r`, `vr`, and draw scale). |
| **`collisionRadiusScale`** | **Collision only:** stored `r = mapgenBaseR × scale`. Does **not** change sprite size (`vr` / rock `heightMul` use `mapgenBaseR`). |

| Variant | Notes |
| ------- | ----- |
| `foothill_*` | Slightly smaller collision (`~0.9×`) vs grass fringe |
| `*_cake` | Tighter collision, sprite nudged up (`drawOffsetY`) |
| `xmas_2025` / `clashmas_*` | Tall art with transparent padding — higher `heightMul`, negative `drawOffsetY`, `collisionLiftR` ~1.0+ |

Use `VITE_DEBUG_OBSTACLE_COLLISION=true`, restart `pnpm dev`, tweak catalog, refresh.
Gameplay still uses circles only (no canopy hit-test).

### Known issues (ongoing)

Canopy foliage remains **non-blocking** by design; trees use a wider trunk circle via
`collisionRadiusScale` (>1) but not full bitmap coverage. Tighten in the catalog if
cover feels wrong.

### Phase 7 — Tests and CI

- Bounds tests per variant (at least one rock + one tree smoke, pattern like
  [`tests/treeRenderer.test.ts`](../tests/treeRenderer.test.ts)).
- Mapgen test: `variant` in range for N obstacles with fixed seed.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

## WebP vs Canvas (rationale)

- **Images:** Better fidelity for isometric art; `drawImage` cost is low vs heavy
  procedural trees.
- **Canvas fallback:** Zero asset weight, good for dev and `VITE_USE_OBSTACLE_IMAGES=false`.
- **WebP:** Smaller bundles than PNG; one PNG (`6th_Anniversary_Cake`) is fine.

## Out of scope (later)

- Weighted variant tables (biome / rarity).
- Atlases / sprite sheets.
- Pixel-accurate collision.
- Separate flag per obstacle kind (use one env flag unless needs diverge).
