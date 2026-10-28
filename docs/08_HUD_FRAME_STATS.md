# HUD frame stats (FPS and match time)

The canvas HUD shows a **smoothed FPS** counter and, once a match has started, **match elapsed
time** (`world.gameTime`). Both are drawn in screen space from [`drawFrameStats()`](../src/ui/hud.ts)
(or the alive panel when integrated there). Values are computed in [`Game.frame()`](../src/core/game.ts)
each animation frame.

## What FPS measures

FPS reflects the **full client frame**: input bookkeeping, simulation (when `phase === 'playing'`),
and rendering. It is **not** a GPU-only or draw-only timer.

## Step 1 — Two time deltas from rAF

The loop in [`startLoop()`](../src/core/loop.ts) uses `requestAnimationFrame`. Each tick it
computes **two** values from consecutive timestamps:

```text
frameInterval = max(0, (now - last) / 1000)     // uncapped wall time
dt            = min(MAX_FRAME_DT, frameInterval) // capped for simulation
```

- **`frameInterval`**: real seconds since the previous frame — used **only for FPS**.
- **`dt`**: same interval capped at **`MAX_FRAME_DT` (0.05 s)** ([`constants.ts`](../src/config/constants.ts)) —
  passed to **`stepWorld()`** while playing so a tab freeze does not advance the match by seconds
  in one step. See [04_GAME_MATH.md](04_GAME_MATH.md).

Using capped `dt` for FPS was wrong on slow machines: e.g. a steady **10 FPS** frame time is
**0.1 s**, but capped `dt` is **0.05 s**, so `1/dt` looked like **20 FPS**. FPS must use
**`frameInterval`**, not simulation `dt`.

## Step 2 — Instant FPS for one frame

[`nextSmoothedFps()`](../src/utils/frameStats.ts) derives a raw rate from **`frameInterval`**:

```text
instant = min(999, 1 / frameInterval)
```

Examples:

| `frameInterval` | `instant` |
| --------------- | --------- |
| 1/60 s (~16.7 ms) | ~60 |
| 1/30 s (~33 ms) | ~30 |
| 0.1 s (10 FPS) | 10 |
| 0.05 s (20 FPS) | 20 |

The **999** cap avoids absurd values if `frameInterval` is extremely small.

## Step 3 — Smoothed FPS (what the HUD stores)

The displayed value is an **exponential moving average**, not the raw `instant` every frame:

```text
smoothed = prev × FPS_SMOOTHING + instant × (1 - FPS_SMOOTHING)
```

- **`FPS_SMOOTHING`**: **0.9** (90% previous, 10% new sample).
- **`prev`**: stored on `Game` as `smoothedFps`, initialised to **60** before the first frame.

So the number **lags slightly** behind sudden drops or spikes (e.g. one slow frame) instead of
flickering.

Update order each frame:

1. `smoothedFps = nextSmoothedFps(smoothedFps, frameInterval)`.
2. Simulation uses **`dt`**; render runs.
3. HUD receives `frameStats.fps = smoothedFps`.

## Step 4 — Label on screen

The HUD **rounds** the smoothed float to an integer (`Math.round`) and draws text like `60 FPS`.

## Match time (separate from FPS)

- **`matchSec`** comes from **`world.gameTime`**, which advances only inside
  [`stepWorld()`](../src/core/simulation.ts) while **`phase === 'playing'`**.
- On the **start screen** (`phase === 'start'`), match time is omitted so the timer does not run
  before Play.
- After a match ends (`dead` / `won`), `gameTime` stops increasing but the last value is still
  shown until a new match.

Formatting uses [`formatTime()`](../src/utils/math.ts) (`m:ss`, ceiling to whole seconds).

## Code map

| Piece | Role |
| ----- | ---- |
| [`core/loop.ts`](../src/core/loop.ts) | `rawFrameDelta()`, `frameDelta()`, rAF loop |
| [`config/constants.ts`](../src/config/constants.ts) | `MAX_FRAME_DT` |
| [`utils/frameStats.ts`](../src/utils/frameStats.ts) | `FPS_SMOOTHING`, `nextSmoothedFps()` |
| [`core/game.ts`](../src/core/game.ts) | Owns `smoothedFps`, builds `FrameOverlayStats` |
| [`ui/hud.ts`](../src/ui/hud.ts) | `FrameOverlayStats`, `drawFrameStats()` |
| [`render/renderer.ts`](../src/render/renderer.ts) | Passes stats into HUD / attract draw |
| [`tests/core.test.ts`](../tests/core.test.ts) | Smoke tests for smoothing and delta split |

## Tests

`nextSmoothedFps(60, 1/60)` stays near 60; a shorter interval (higher instant FPS) nudges the
average upward gradually because of the 0.9/0.1 blend. `rawFrameDelta` vs `frameDelta` asserts
the cap applies only to simulation `dt`.
