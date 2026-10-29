# Tree collision centre refactor

Why we removed the separate **map scatter anchor** for trees and aligned stored
`(x, y)` with **gameplay collision**, matching rocks. Related:
[06_OBSTACLE_SPRITES.md](06_OBSTACLE_SPRITES.md), [04_GAME_MATH.md](04_GAME_MATH.md).

## Problem (before)

Trees used two different ideas at once:

1. **Stored `(x, y)`** — mapgen scatter point (called “anchor” in debug).
2. **Foot** — `x + drawOffsetX`, `y + drawOffsetY`, shared by sprite, shadow, **and** collision lift.

Rocks already stored **collision centre** at `(x, y)`; `drawOffset` only nudged art.

That asymmetry caused:

- Yellow debug crosses **below** every tree while pink rings sat on the trunk.
- Tuning `drawOffsetY` moved **hitboxes**, not just PNG alignment — easy to misread with
  `VITE_DEBUG_OBSTACLE_COLLISION`.
- `TreeObstacle` TSDoc said “foot” but runtime treated `(x, y)` as a pre-offset scatter point.
- Empty ground at the anchor could block nothing while collision lived elsewhere when offsets were large.

Combat never used the anchor directly (only `circleObstacleCollision`), but the extra coordinate
confused art tuning and docs without helping gameplay.

## What we do now

| Kind | `TreeObstacle.x`, `TreeObstacle.y` | Collision | Draw |
| ---- | ----------------------------------- | --------- | ---- |
| **Rock** | Collision circle centre | Circle at `(x, y)`, radius `r` | Centre anchor + **visual** `drawOffset` |
| **Tree** | **Same:** trunk collision centre | Circle at `(x, y)`, radius `r` | Bottom-centre at **sprite foot** derived below |

### Geometry helpers (`world/obstacleGeometry.ts`)

```text
collision centre  (stored x, y)  ──lift = collisionLiftR × r──►  model foot  (x, y + lift)
                                                                      │
                                                              visual drawOffset (catalog)
                                                                      ▼
                                                              sprite foot  →  PNG / shadow
```

| Function | Role |
| -------- | ---- |
| `treeCollisionCenter` | `{ x: tree.x, y: tree.y }` — bullets, movement, minimap, debug ring |
| `treeCollisionLiftPx` | `collisionLiftR × r` |
| `treeModelFoot` | Ground point under the trunk circle (before visual offset) |
| `treeSpriteFoot` | Model foot + catalog `drawOffset` — render + shadows only |
| `treeFootCollisionCenter` | Inverse helper (tests / tooling) |

`circleObstacleCollision` is unchanged for callers: still one pink circle per tree/rock.

### Mapgen (`world/mapgen.ts`)

Tree scatter matches rocks:

1. Pick random `(x, y)` as the **collision centre**.
2. `circleFree(x, y, r + margin)` and `inHouse(..., x, y, ...)`.
3. Store that centre on the obstacle.

No foot/anchor chain at generation time.

### Catalog (`config/obstacleSprites.ts`)

- Per-tree **`drawOffsetX/Y`** are **visual-only** (from model foot), like rocks.
- Legacy negative tree `drawOffsetY` values (used to pull foot up from the old anchor) were
  **removed**; use small nudges only for transparent PNG padding after this change.
- **`collisionLiftR`** still controls how far the stored centre sits above the model foot.

### Debug overlay

`VITE_DEBUG_OBSTACLE_COLLISION` draws **pink collision rings** only (no yellow anchor / teal foot).
For trees and rocks, `(x, y)` is the circle centre.

### Procedural trees

Canvas fallback uses `treeSpriteFoot` for trunk/clump placement so procedural and WebP paths
share the same foot math.

## Migration / maps

- Each new match runs `generateMap()` — **start a new game** to pick up placement semantics.
- Seeded **variant lists** in tests stay stable; **world positions** for the same seed differ
  from pre-refactor maps (scatter target changed from anchor to centre).
- No save-game migration (matches are ephemeral).

## Retuning art

After this refactor, expect to adjust per variant:

| Knob | Use |
| ---- | --- |
| `collisionLiftR` | Pink ring vs trunk / model foot |
| `drawOffsetX/Y` | PNG vs model foot (does **not** move collision) |
| `heightMul`, shadow fields | Size and shadow (unchanged) |

Use `VITE_DEBUG_OBSTACLE_COLLISION=true` and `VITE_USE_OBSTACLE_IMAGES=true`; tweak catalog;
refresh dev server.

## Files touched

- `world/types.ts` — tree `(x, y)` documented as collision centre
- `world/obstacleGeometry.ts` — model foot + stored centre
- `world/mapgen.ts` — scatter collision centre directly
- `render/treeRenderer.ts` — draw from `treeSpriteFoot`
- `render/obstacleCollisionDebug.ts` — removed anchor markers
- `config/obstacleSprites.ts` — comments + tree offset cleanup
- `tests/obstacleGeometry.test.ts`, `tests/treeRenderer.test.ts`
- [06_OBSTACLE_SPRITES.md](06_OBSTACLE_SPRITES.md) — summary + link here
