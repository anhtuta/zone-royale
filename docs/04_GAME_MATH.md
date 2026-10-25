# Game math patterns (2D shooters / battle royale)

Common formulas and patterns used in top-down games like Zone Royale. Most logic lives in
[`../src/utils/math.ts`](../src/utils/math.ts) and [`../src/utils/geometry.ts`](../src/utils/geometry.ts);
systems apply them each frame with a delta time `dt`.

**Related:** [01_INIT_PROJECT.md](01_INIT_PROJECT.md) (layer boundaries, `stepWorld()`),
[03_MULTIPLAYER.md](03_MULTIPLAYER.md) (determinism, `PlayerControls`),
[05_MATCH_SETTINGS.md](05_MATCH_SETTINGS.md) (configurable map size and player count).

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
bottom (`World.mapSize` from match settings — see [05_MATCH_SETTINGS.md](05_MATCH_SETTINGS.md)).

Vocab (thuật ngữ trong game math - verify this!!!):

- Normalize: chuẩn hóa vector về độ dài 1. Việc chuẩn hoá giúp tránh trường hợp đi chéo bị nhanh hơn đi thẳng.
  - Vector normalization is the process of scaling a vector so that its length (magnitude) becomes exactly 1, turning it into what is called a unit vector.
  - Normalization strips away the size of a vector and preserves only its direction.
- Magnitude: độ dài của vector.
- Integration: tích phân vị trí theo thời gian???.
- LERP: linear interpolation: nội suy tuyến tính giữa 2 giá trị???.

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

**Example 1 (movement):** [`PLAYER_SPEED`](../src/config/constants.ts) is **245** px/s. Holding **W** sets
`moveY = -1` → after [`playerVelocity()`](../src/systems/player.ts), velocity is **(0, −245)** px/s
(negative $v_y$ because **up = smaller** $y$).

One frame at **60 FPS** — values **before** [`stepWorld()`](../src/core/simulation.ts) integrates position:

| Variable | Value | Meaning |
| -------- | ----- | ------- |
| $x$ | **1500** | World X (px) |
| $y$ | **2000** | World Y (px); smaller $y$ is higher on screen |
| $v_x$ | **0** | Not pressing A/D |
| $v_y$ | **−245** | Full speed upward on screen |
| $dt$ | **≈ 0.0167** | $1/60$ s |

Integration ($x \leftarrow x + v_x \cdot dt$, same for $y$):

- $\Delta x = 0 \times 0.0167 = 0$
- $\Delta y = -245 \times 0.0167 \approx -4.08$ px

**After** this frame:

| Variable | Value |
| -------- | ----- |
| $x$ | **1500** (unchanged) |
| $y$ | **2000 − 4.08 ≈ 1995.9** (moved up on screen) |

Speed along the path is still $\|v\| = 245$ px/s; only the sign of $v_y$ reflects screen-up vs math-up.

**Example 2 (`MAX_FRAME_DT`):** If the tab was frozen for 2 s, raw `dt` would be 2.0; the game caps it
at **0.05** s ([`MAX_FRAME_DT`](../src/config/constants.ts)), so one step moves at most
$245 \times 0.05 = 12.25$ px instead of 490 px.

**Example 3 (smooth turn):** Bot faces **0 rad** (east), wants **π/2** (south). `angleDelta(0, π/2) ≈ 1.57`.
With `dt = 0.0167` and `k = 8`: `min(1, 0.0167 × 8) ≈ 0.133`, so
`angle += 1.57 × 0.133 ≈ 0.21` rad this frame (~12°), not an instant snap.

---

## 2. 2D vectors (often without a `Vector2` class)

Plain `(x, y)` plus a small set of operations:

| Operation | Formula | Typical use |
| --------- | ------- | ----------- |
| Length | $\|v\| = \sqrt{v_x^2 + v_y^2}$ or `Math.hypot(vx, vy)` | Speed, normalize |
| Normalize | $\hat{v} = v / \|v\|$ | Direction from input |
| Scale to speed | `vx = directionX * SPEED`, same for `vy` | Turn “which way” into px/s |
| Dot (optional) | $a_x b_x + a_y b_y$ | In front vs behind, “how much along…” |

**Diagonal movement:** Without normalization, W+D is ~41% faster than W alone. Zone Royale
normalises in [`playerVelocity()`](../src/systems/player.ts) so diagonals stay at **245** px/s.

**Example 1 (length):** **W+D** velocity `(173, -173)` → `hypot(173, -173) ≈ 245` (= full run speed after normalize + scale).

### Scale to speed (what `playerVelocity` really does)

Keyboard input is only **direction signs**: **W** → `moveY = -1`, **D** → `moveX = +1`, etc.
([`readControls()`](../src/core/input.ts)). Those numbers are **not** pixels per second yet.

**Two steps** in [`playerVelocity()`](../src/systems/player.ts):

1. **Normalize** — turn input into a **unit direction** (length 1):  
   $\hat{d}_x = m_x / m$, $\hat{d}_y = m_y / m$ where $m = \mathrm{hypot}(m_x, m_y)$.
2. **Scale** — multiply by [`PLAYER_SPEED`](../src/config/constants.ts) (**245**) so the velocity
   vector’s length equals run speed:  
   $v_x = \hat{d}_x \times 245$, $v_y = \hat{d}_y \times 245$.

```ts
const m = Math.hypot(mx, my) || 1;
return { vx: (mx / m) * PLAYER_SPEED, vy: (my / m) * PLAYER_SPEED };
```

**Example 2a — only W (scale after normalize):**

| Step | $m_x$ | $m_y$ | $m$ | $\hat{d}$ | $v_x$ | $v_y$ |
| ---- | ----- | ----- | --- | --------- | ----- | ----- |
| Input | 0 | −1 | 1 | (0, −1) | 0 | **−245** |

One axis, direction already length 1 → scale just flips sign on Y and applies **245**.

**Example 2b — W+D (why both steps matter):**

| | Wrong: skip normalize, use `vx = mx * SPEED` | Right: normalize then scale |
| --- | --- | --- |
| Input | $m_x = 1$, $m_y = -1$ | same |
| Velocity | $(245,\; -245)$ | $(173.2,\; -173.2)$ |
| Length `hypot` | $245\sqrt{2} \approx 346$ px/s | **245** px/s |

Diagonal would be **41% faster** than holding a single key if you only multiplied raw input by `SPEED`.
Normalize picks a direction on the circle; scale sets how fast you travel along that direction.

**Example 2c — no keys:**

| $m_x$ | $m_y$ | $m$ | Result |
| ----- | ----- | --- | ------ |
| 0 | 0 | `OR 1` guard | $(v_x, v_y) = (0, 0)$ |

---

### Dot product (optional but useful)

**Formula:** $a \cdot b = a_x b_x + a_y b_y$ (one number, not a vector).

**Meaning in one line:** “How much does $b$ point along $a$?”

- If **$a$ is a unit vector** (length 1), $a \cdot b$ is the length of $b$ **projected onto** $a$’s line
  (like the shadow of $b$ on the east–west axis when $a$ is east).
- If **both are unit vectors**, $a \cdot b = \cos(\text{angle between them})$:
  **1** = same direction, **0** = perpendicular, **−1** = opposite.

Zone Royale mostly uses `atan2` for aim, but dot is the usual pattern for “in my forward cone?” or
strafe along a wall.

**Example 3a — in front vs behind (world axes, player facing east):**

Player at **(1000, 1000)**, facing **right** → unit forward $f = (1, 0)$.

| Enemy at | Vector to enemy $t = \text{enemy} - \text{player}$ | $f \cdot t = 1 \cdot t_x + 0 \cdot t_y$ | Read |
| -------- | ---------------------------------------------------- | ---------------------------------------- | ---- |
| (1100, 1000) | (100, 0) | **+100** | Ahead (to the right) |
| (900, 1000) | (−100, 0) | **−100** | Behind (to the left) |
| (1000, 1100) | (0, 100) | **0** | Straight to the **side** (down on screen) |

**Example 3b — “mostly in front” with two unit vectors:**

Facing direction $\hat{f} = (1, 0)$. Direction to target (normalized) $\hat{t} = (0.6, 0.8)$
(roughly east-north-east on the compass, but here “north” on screen is **negative** $y$ — this
$\hat{t}$ points down-right).

$$
\hat{f} \cdot \hat{t} = 1 \times 0.6 + 0 \times 0.8 = 0.6
$$

$\cos^{-1}(0.6) \approx 53°$ off your forward line → target is in front-right, not dead ahead (which
would be **1.0**).

**Example 3c — tie to movement (not in code, but same math):**

Your velocity $v = (173, -173)$ (W+D). Unit direction $\hat{d} = (0.707, -0.707)$.
Want “how much am I moving east?” → $\hat{e}_x \cdot v$ with east $\hat{e}_x = (1,0)$:

$1 \cdot 173 + 0 \cdot (-173) = 173$ px/s of your **245** px/s is eastward; the rest is upward on screen
($v_y = -173$, decreasing $y$).

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

**Example 1 (aim):** Player at **(100, 200)**, crosshair at **(400, 200)**:

- $\theta = \mathrm{atan2}(0,\; 300) = 0$ rad (east).

**Example 2 (bullet velocity):** Pistol [`speed`](../src/config/weapons.ts) **1150** px/s, $\theta = 0$:

- $v_x = 1150$, $v_y = 0$.

**Example 3 (aim east-north-east):** Same player, crosshair **(400, 300)**:

- $\theta = \mathrm{atan2}(100,\; 300) \approx 0.322$ rad (~18.4°)
- $v_x \approx 1150 \cos(0.322) \approx 1091$, $v_y \approx 1150 \sin(0.322) \approx 361$.

**Example 4 (`angleDelta`):** From **170°** to **-170°** (both near west): shortest turn is **+20°**,
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

**Example (lead):** Bot shoots pistol (**bullet speed 1150**). Target **400** px away, moving **up on screen**
($v_y = -200$ px/s), bot `skill = 0.8`:

- $t_{\mathrm{flight}} \approx (400 / 1150) \times 0.8 \approx 0.28$ s
- Lead offset on Y: $v_y \times t_{\mathrm{flight}} = -200 \times 0.28 \approx -56$ px → aim at
  **$y_{\mathrm{target}} - 56$** (56 px higher on screen than their current position; same as
  `t.y + t.vy * lead` in [`systems/ai.ts`](../src/systems/ai.ts)).

**Example (`combatRadial`):** Pistol `range = 750` → [`preferredRange`](../src/systems/ai.ts)
$\min(375,\; 420) = 375$ px, band **±60**:

| Distance to target | `combatRadial` | Bot intent |
| ------------------ | -------------- | ---------- |
| 500 px | `1` | Close in |
| 360 px | `0` | Hold band |
| 300 px | `-0.7` | Back off |

**Example (`aimErrorScale`):** `skill = 0.5`, distance **800** px:

- $(1 - 0.5) \times 0.3 + 0.05 + 800/4000 = 0.15 + 0.05 + 0.2 = 0.4$ rad (~23°) extra jitter scale.

**Example (moving spread):** Standing still → factor **1**. Running **W+D** at **(173, -173)** → `hypot > 30` →
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

**Example (`clamp`):** `mapSize` **5000**, entity tries **x = 5050** with
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

**Example (putting it together):** One frame at 60 FPS: read **W+D** → velocity **(173, -173)**;
integrate position with `dt`; `resolveCollision` if inside a wall; check loot with $d^2 < 34^2$;
aim with `atan2`; fire bullet with $v = 1150 \times (\cos\theta,\; \sin\theta)$; camera `lerp`
toward player with $t \approx 0.17$.
