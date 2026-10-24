# Game math patterns (2D shooters / battle royale)

Common formulas and patterns used in top-down games like Zone Royale. Most logic lives in
[`../src/utils/math.ts`](../src/utils/math.ts) and [`../src/utils/geometry.ts`](../src/utils/geometry.ts);
systems apply them each frame with a delta time `dt`.

**Related:** [01_INIT_PROJECT.md](01_INIT_PROJECT.md) (layer boundaries, `stepWorld()`),
[03_MULTIPLAYER.md](03_MULTIPLAYER.md) (determinism, `PlayerControls`).

**Note: World axes (not school Descartes):** The sim uses the same convention as **Canvas / the screen, origin top-left**:

| Direction on screen | World change | Typical velocity |
| ------------------- | ------------ | ---------------- |
| Right (D) | $x$ increases | $v_x > 0$ |
| Left (A) | $x$ decreases | $v_x < 0$ |
| Down (S) | $y$ increases | $v_y > 0$ |
| Up (W) | $y$ decreases | $v_y < 0$ |

There is no single “origin” module — this is wired in [`readControls()`](../src/core/input.ts)
(`W` → `moveY -= 1`, `S` → `moveY += 1`) and applied in [`stepWorld()`](../src/core/simulation.ts)
(`e.y += e.vy * dt`). Map corner **(0, 0)** is the **top-left** of the world; $y$ grows toward the
bottom ([`MAP_SIZE`](../src/config/constants.ts) is the width and height).

---

## 1. Time: move per second, scale by `dt`

**Pattern:** Store speeds in **units per second**, then each simulation step:

$$
x \leftarrow x + v_x \cdot dt,\quad y \leftarrow y + v_y \cdot dt
$$

**Why:** Frame rate varies; `dt` keeps motion consistent.

**Guard rail:** Cap `dt` so a long pause (tab in background) does not teleport entities.
See [`frameDelta()`](../src/core/loop.ts).

**Smooth turning:** Instead of snapping angle, rotate by a fraction of the error per second:

`angle += angleDelta(current, target) * min(1, dt * k)` — used for bot facing in
[`systems/ai.ts`](../src/systems/ai.ts).

**Example (movement):** [`PLAYER_SPEED`](../src/config/constants.ts) is **245** px/s.

- Holding **W**
sets `moveY = -1` → after [`playerVelocity()`](../src/systems/player.ts),
`vx = 0`, `vy = -245` (negative because **up = smaller** $y$).
- At **60 FPS**, `dt ≈ 1/60 ≈ 0.0167` s, $\Delta y = -245 \times 0.0167 \approx -4.1$ px per frame
- → you move **up** on screen while $y$ counts down (speed along the path is still **245** px/s).

**Example (`MAX_FRAME_DT`):** If the tab was frozen for 2 s, raw `dt` would be 2.0; the game caps it
at **0.05** s ([`MAX_FRAME_DT`](../src/config/constants.ts)), so one step moves at most
$245 \times 0.05 = 12.25$ px instead of 490 px.

**Example (smooth turn):** Bot faces **0 rad** (east), wants **π/2** (south). `angleDelta(0, π/2) ≈ 1.57`.
With `dt = 0.0167` and `k = 8`: `min(1, 0.0167 × 8) ≈ 0.133`, so
`angle += 1.57 × 0.133 ≈ 0.21` rad this frame (~12°), not an instant snap.

---

## 2. 2D vectors (often without a `Vector2` class)

Plain `(x, y)` plus a small set of operations:

| Operation | Formula | Typical use |
| --------- | ------- | ----------- |
| Length | $\|v\| = \sqrt{v_x^2 + v_y^2}$ or `Math.hypot(vx, vy)` | Speed, normalize |
| Normalize | $\hat{v} = v / \|v\|$ | Direction from input |
| Scale to speed | `vx = dirX * SPEED`, same for `vy` | Movement |
| Dot (optional) | $a_x b_x + a_y b_y$ | Facing target, projections |

**Diagonal movement:** Without normalization, W+D is ~41% faster than W alone. Zone Royale
normalises keyboard input in [`playerVelocity()`](../src/systems/player.ts):

```ts
const m = Math.hypot(mx, my) || 1;
return { vx: (mx / m) * PLAYER_SPEED, vy: (my / m) * PLAYER_SPEED };
```

**Example (length):** Velocity `(173, 173)` → `hypot(173, 173) ≈ 245` (= full run speed after normalize).

**Example (normalize + scale):** Input **W+D** → `(mx, my) = (1, 1)`:

- $m = \sqrt{1^2 + 1^2} \approx 1.414$
- $v_x = v_y = (1 / 1.414) \times 245 \approx 173.2$ px/s
- Speed stays **245** px/s, not $245\sqrt{2} \approx 346$ if you skipped normalization.

**Example (dot):** Forward `(1, 0)` and to-target vector `(0.6, 0.8)`:
$1 \times 0.6 + 0 \times 0.8 = 0.6$ → target is mostly to the right (cosine of angle between them).

---

## 3. Angles: aim, shoot, strafe

**Aim at a world point:**

$$
\theta = \mathrm{atan2}(targetY - y,\; targetX - x)
$$

Player aim: [`updatePlayer()`](../src/systems/player.ts).

**Velocity from angle + speed** (bullets, wandering waypoints):

$$
v_x = \cos(\theta)\, s,\quad v_y = \sin(\theta)\, s
$$

**Shortest turn:** Angles wrap; use the signed delta in $[-\pi, \pi)$. See
[`angleDelta()`](../src/utils/math.ts).

**Random spread:** `angle + (random - 0.5) * spreadRadians`.

**Example (aim):** Player at **(100, 200)**, crosshair at **(400, 200)**:

- $\theta = \mathrm{atan2}(0,\; 300) = 0$ rad (east).

**Example (bullet velocity):** Pistol [`speed`](../src/config/weapons.ts) **1150** px/s, $\theta = 0$:

- $v_x = 1150$, $v_y = 0$.

**Example (aim east-north-east):** Same player, crosshair **(400, 300)**:

- $\theta = \mathrm{atan2}(100,\; 300) \approx 0.322$ rad (~18.4°)
- $v_x \approx 1150 \cos(0.322) \approx 1091$, $v_y \approx 1150 \sin(0.322) \approx 361$.

**Example (`angleDelta`):** From **170°** to **-170°** (both near west): shortest turn is **+20°**,
not −340° — that is what `angleDelta` returns in radians.

---

## 4. Distance: compare cheap, measure when needed

**Squared distance** — no `sqrt` when you only need “inside radius R?”:

$$
d^2 = (x_2 - x_1)^2 + (y_2 - y_1)^2,\quad \text{test } d^2 < R^2
$$

Used for ammo pickup range, overlap tests, and broad comparisons via [`dist2()`](../src/utils/math.ts).

**Euclidean distance** when you need real length (zone radius, AI bands, push-out):

$$
d = \sqrt{d^2}
$$

[`dist()`](../src/utils/math.ts) wraps `sqrt(dist2(...))`.

**Example (auto ammo pickup):** [`AMMO_AUTO_PICK_RANGE`](../src/config/constants.ts) **34** → compare
$d^2 < 34^2 = 1156$.

- Player **(1000, 1000)**, ammo **(1020, 1000)** → $d^2 = 20^2 = 400 < 1156$ → **pickup**.
- Ammo **(1040, 1000)** → $d^2 = 40^2 = 1600$ → **too far** (no `sqrt` needed).

**Example (Euclidean):** Same first pair: $d = 20$ px (useful for UI or “how far to loot?”).

---

## 5. Collision (core shapes in this genre)

### Circle vs circle

Players, trees, and separation between bodies: overlap when $d < r_1 + r_2$.

**Resolve:** Push apart along normal $\hat{n} = (p_a - p_b) / d$; each body moves half the
overlap. See [`separateBodies()`](../src/systems/collision.ts).

**Example:** Two combatants, [`ENTITY_RADIUS`](../src/config/constants.ts) **18** each.

- Centres **(100, 100)** and **(130, 100)** → $d = 30$, sum of radii $36$.
- Overlap $36 - 30 = 6$ px → each moves **3** px along the x-axis away from the other.

### Circle vs axis-aligned box (AABB)

Walls and houses: **closest point** on the rectangle to the circle centre:

$$
c_x = \mathrm{clamp}(x,\; x_{min},\; x_{max}),\quad
c_y = \mathrm{clamp}(y,\; y_{min},\; y_{max})
$$

If $\|p - c\| < r$, push out along $(p - c)$. See [`resolveCollision()`](../src/systems/collision.ts)
and [`circleFree()`](../src/systems/collision.ts).

**Example:** Wall box left **100**, top **50**, size **80×40** (right edge **180**). Circle centre
**(195, 70)**, radius **18**:

- Closest point on box: $c = (180,\; 70)$ (clamp x to the right edge).
- $\|p - c\| = 15 < 18$ → overlapping; push **3** px to the right so the circle sits at **(198, 70)**.

### Segment vs circle / AABB (bullets, line of sight)

Segment from $(x_1, y_1)$ to $(x_2, y_2)$:

$$
P(t) = P_1 + t(P_2 - P_1),\quad t \in [0, 1]
$$

- **Segment vs circle:** quadratic in $t$ — [`segmentCircle()`](../src/utils/geometry.ts).
- **Segment vs AABB:** slab method — clip $t$ on each axis — [`segmentRect()`](../src/utils/geometry.ts).

**Broad phase:** Reject with segment AABB vs obstacle bounds before exact tests
([`segmentObstacle()`](../src/systems/collision.ts)).

**Example (segment param):** Shot from **(0, 0)** to **(200, 0)**. At $t = 0.5$, $P = (100, 0)$ (midpoint).

**Example (segment vs circle):** Same segment, tree at **(100, 0)** with radius **20**:

- Closest approach is the centre → hit at $t = 0.5$ (bullet stops ~100 px from the muzzle).

**Example (broad phase):** Segment x-range **[0, 200]**, obstacle only near **(500, 0)** → AABB reject,
no expensive `segmentRect` work.

---

## 6. Interpolation (`lerp`)

$$
\mathrm{lerp}(a, b, t) = a + (b - a)\,t
$$

Used for **shrinking zone** ([`systems/zone.ts`](../src/systems/zone.ts)) and **camera follow**
([`core/camera.ts`](../src/core/camera.ts)). Often $t = \min(1, dt \cdot k)$ for smooth
exponential easing toward a target.

**Zone test:** Point inside circle when $\mathrm{dist}(p, center) \le radius$ (edge rule may use `<`).

**Example (plain lerp):** `lerp(100, 500, 0.25) = 100 + 400 × 0.25 = 200`.

**Example (camera follow):** Viewport **800×600**, player at **(1500, 1200)**. Desired top-left:
$(1500 - 400,\; 1200 - 300) = (1100,\; 900)$. Camera at **(1000, 900)**, `dt = 0.02`, `k = min(1, 0.2) = 0.2`:

- New `cam.x = lerp(1000, 1100, 0.2) = 1020` (eases toward the player).

**Example (zone inside test):** Safe circle centre **(3000, 3000)**, radius **400**. Player **(3200, 3100)**:

- $d = \sqrt{200^2 + 100^2} \approx 224 < 400$ → **inside** (no storm damage).

---

## 7. Combat and AI

| Idea | Pattern |
| ---- | ------- |
| Lead aiming | Aim at $p + v \cdot t_{flight}$ ([`systems/ai.ts`](../src/systems/ai.ts)) |
| Preferred range | Move in/out by distance bands ([`combatRadial()`](../src/systems/ai.ts)) |
| Strafe | Move perpendicular to direction to target: $(-n_y, n_x)$ or rotate intent ±90° |
| Accuracy vs distance | Error grows with distance and $(1 - skill)$ ([`aimErrorScale()`](../src/systems/ai.ts)) |
| Moving spread | Scale weapon spread by movement speed ([`movementSpreadFactor()`](../src/systems/weapons.ts)) |

Optional extension: damage falloff `damage * clamp(1 - d / range, 0, 1)`.

**Example (lead):** Bot shoots pistol (**bullet speed 1150**). Target **400** px away, moving up
$v_y = 200$ px/s, bot `skill = 0.8`:

- $t_{\mathrm{flight}} \approx (400 / 1150) \times 0.8 \approx 0.28$ s
- Lead offset on Y: $200 \times 0.28 \approx 56$ px → aim at target position **+56** on Y.

**Example (`combatRadial`):** Pistol `range = 750` → [`preferredRange`](../src/systems/ai.ts)
$\min(375,\; 420) = 375$ px, band **±60**:

| Distance to target | `combatRadial` | Bot intent |
| ------------------ | -------------- | ---------- |
| 500 px | `1` | Close in |
| 360 px | `0` | Hold band |
| 300 px | `-0.7` | Back off |

**Example (`aimErrorScale`):** `skill = 0.5`, distance **800** px:

- $(1 - 0.5) \times 0.3 + 0.05 + 800/4000 = 0.15 + 0.05 + 0.2 = 0.4$ rad (~23°) extra jitter scale.

**Example (moving spread):** Standing still → factor **1**. Running at **(173, 173)** → `hypot > 30` →
spread × **1.35** (pistol base spread 0.035 rad → effective ~0.047 rad).

**Example (armor, not in table but common):** Hit for **50** damage, **30** armor left,
[`ARMOR_ABSORB`](../src/config/constants.ts) **0.6**:

- Absorbed $\min(30,\; 50 \times 0.6) = 30$ → **0** HP damage, **0** armor left.

---

## 8. Rendering and camera (read-only math)

- **World ↔ screen:** `screenX = worldX - cam.x` (plus scale if zoomed).
- **Culling:** Draw only if entity bounds intersect the camera rectangle
  ([`render/worldRenderer.ts`](../src/render/worldRenderer.ts)).
- **Procedural motion:** `sin(phase) * amplitude` for walk sway
  ([`render/spriteAssets.ts`](../src/render/spriteAssets.ts)).

Camera position typically lerps toward `target - viewSize / 2`.

**Example (world → screen):** `cam.x = 1200`, entity world **x = 1500** → screen **x = 300**.

**Example (culling):** Camera rect **[1000, 900]** size **800×600** → visible world x **[1000, 1800]**.
Tree at **x = 1900** → off-screen, skip draw.

**Example (walk sway):** `phase = π/2`, amplitude **7** px → `sin(π/2) × 7 = 7` px sideways bob at that frame.

---

## 9. Small helpers used everywhere

- **`clamp(v, min, max)`** — map bounds, health caps, timers ([`utils/math.ts`](../src/utils/math.ts)).
- **`min` / `max`** — AABBs, damage absorption, frame caps.
- **Gameplay RNG** — [`utils/random.ts`](../src/utils/random.ts) (seeded); avoid `Math.random()` in
  `systems/` for reproducible tests.

**Example (`clamp`):** [`MAP_SIZE`](../src/config/constants.ts) **6000**, entity tries **x = 6050** with
radius **18** → clamp to $[18,\; 5982]$ → **5982**.

**Example (`min` for damage):** Armor absorb uses `min(remainingArmor, damage × 0.6)` so you never
absorb more than you have.

---

## 10. Learning order (high ROI for this project)

1. 2D vectors: normalize, optional dot and perpendicular.
2. `atan2` plus `cos` / `sin` for aim and projectiles.
3. Circle and AABB collision; segment tests for bullets.
4. `dt`-based integration and `lerp` for zone and camera.
5. Compare with **`dist²`** until a true distance is required.

Full 3D linear algebra or a physics engine is not required for this style of game — it is
mostly trig, clamp, distance, and a handful of intersection tests kept in `utils/`.

**Example (putting it together):** One frame at 60 FPS: read **W+D** → velocity **(173, 173)**;
integrate position with `dt`; `resolveCollision` if inside a wall; check loot with $d^2 < 34^2$;
aim with `atan2`; fire bullet with $v = 1150 \times (\cos\theta,\; \sin\theta)$; camera `lerp`
toward player with $t \approx 0.17$.
