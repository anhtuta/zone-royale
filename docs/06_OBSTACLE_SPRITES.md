# Obstacle sprites (rocks and trees)

Plan for multi-variant obstacle art: bundled images when
`VITE_USE_OBSTACLE_IMAGES` is true, procedural Canvas 2D fallback when false.
Gameplay collision stays **circles**; only rendering and culling use sprite bounds.

Related: [01_INIT_PROJECT.md](01_INIT_PROJECT.md) (layers), [04_GAME_MATH.md](04_GAME_MATH.md)
(collision broad phase), [05_MATCH_SETTINGS.md](05_MATCH_SETTINGS.md) (mapgen).

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
| `render/obstacleSprites.ts` (new) | Load images, `getRockImage(n)`, `getTreeImage(n)` |
| `render/rockRenderer.ts` (new) | `drawRock`, `rockSpriteBounds`, culling |
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

### Phase 2 — Mapgen variant + tree foot semantics

- `scatter()` assigns `variant` per rock/tree.
- Mapgen / placement use `treeCollisionCenter()` for `circleFree` and overlap
  checks (foot vs centre documented in comments).
- Optional: migrate existing tree positions if foot semantics shift procedural
  art (tune `lift` so gameplay feel matches pre-change).

**Exit criteria:** Seeded maps pick stable variants; collision uses tree collision
centre.

### Phase 3 — Sprite loading

- Add `render/obstacleSprites.ts`: `loadObstacleSprites()`, gated by
  `USE_OBSTACLE_IMAGES`.
- Wire `main.ts` to call it (deprecate single-image `loadTreeSprite` or make it
  a thin alias).

**Exit criteria:** With flag true, all images load; with false, instant resolve.

### Phase 4 — Rock renderer

- Add `render/rockRenderer.ts`: bounds, shadow, `drawRock` (image + procedural).
- Replace inline rock drawing in `worldRenderer.ts`.

**Exit criteria:** Rocks show random variants when flag true; circles when false.

### Phase 5 — Tree renderer multi-variant

- Refactor `treeRenderer.ts` to use catalog + per-variant images.
- Bottom-centre anchor; per-variant bounds for culling (`treeSpriteInView`).
- Procedural `drawTreeCanvas` unchanged as fallback.

**Exit criteria:** All five tree assets rotate by `variant`; culling correct.

### Phase 6 — Tuning and polish

- In-game pass: adjust `heightMul`, offsets, `collisionLift`, `collisionRadiusScale`
  per asset (cakes vs foothills vs grove).
- Minimap ([`ui/minimap.ts`](../src/ui/minimap.ts)): keep circles at collision
  centre (use helper for trees).
- Update [`.env.example`](../.env.example) / README snippet if needed.

**Exit criteria:** No obvious foot sliding; collision feels fair.

### Known issues (fix in Phases 5–6)

Until foot anchoring and per-variant layout land, **`VITE_USE_OBSTACLE_IMAGES=true`**
with the current [`treeRenderer.ts`](../src/render/treeRenderer.ts) shows mismatches
between art and gameplay:

| Symptom | Cause |
| ------- | ----- |
| Bullets pass through the leafy PNG / canopy but stop lower on the tree | Collision uses only a **trunk circle** at `(x, y)` with radius `r` ([`collision.ts`](../src/systems/collision.ts)); `vr` and the bitmap are **visual-only**. The canopy sits mostly **above** `(x, y)`, so shots often miss the circle. |
| It feels like the **shadow** blocks shots | The shadow is **not** a collider. The ellipse is drawn at `y + 0.5·vr`, which overlaps the same trunk circle players hit near the ground—so blocking aligns with the shadow more than with the sprite. |
| Shadow sits **below** the bottom of the PNG | Shadow uses procedural layout (`y + 0.5·vr`). The PNG is placed with `SPRITE_TOP_FRAC` so its bottom is near `y + 0.27·vr`—about `0.23·vr` higher than the shadow centre. |

**Today’s code** still treats tree `(x, y)` as the **collision centre** (see
[`world/types.ts`](../src/world/types.ts)); the bottom-centre foot model in this doc
is the **target** after Phases 1–2 (`treeCollisionCenter()`).

**Phase 5** should tie shadow + sprite to the same foot / catalog anchors (per variant).
**Phase 6** should tune `collisionLift`, `collisionRadiusScale`, and optionally a
larger blocking radius if cover should match visible foliage (still circles only).

**Local debug:** `VITE_DEBUG_OBSTACLE_COLLISION=true` draws gameplay outlines via
[`render/obstacleCollisionDebug.ts`](../src/render/obstacleCollisionDebug.ts); update
that module when `treeCollisionCenter()` exists so the ring matches sim.

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
