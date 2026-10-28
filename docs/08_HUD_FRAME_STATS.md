# HUD frame stats (FPS and match time)

The canvas HUD shows a **smoothed FPS** counter and, once a match has started, **match elapsed
time** (`world.gameTime`). Both are drawn in screen space from [`drawFrameStats()`](../src/ui/hud.ts)
(or the alive panel when integrated there). Values are computed in [`Game.frame()`](../src/core/game.ts)
each animation frame.

## What FPS measures

FPS reflects the **full client frame**: input bookkeeping, simulation (when `phase === 'playing'`),
and rendering. It is **not** a GPU-only or draw-only timer.

## Step 1 — Frame delta `dt`

The loop in [`startLoop()`](../src/core/loop.ts) uses `requestAnimationFrame`. Between consecutive
frame timestamps it computes:

```text
dt = min(MAX_FRAME_DT, (now - last) / 1000)
```

- **`now - last`**: wall-clock milliseconds since the previous frame, converted to **seconds**.
- **`MAX_FRAME_DT`**: **0.05 s** ([`constants.ts`](../src/config/constants.ts)). Caps `dt` so a tab
  freeze or debugger pause does not produce a huge simulation step or a meaningless one-frame FPS
  spike. See also [04_GAME_MATH.md](04_GAME_MATH.md) (frame delta examples).

This is the same `dt` passed into `stepWorld()` while playing.

## Step 2 — Instant FPS for one frame

[`nextSmoothedFps()`](../src/utils/frameStats.ts) derives a raw rate from that step:

```text
instant = min(999, 1 / dt)
```

Examples:

| `dt` | `instant` |
| ---- | --------- |
| 1/60 s (~16.7 ms) | ~60 |
| 1/30 s (~33 ms) | ~30 |
| 0.05 s (cap) | 20 |

The **999** cap avoids absurd values if `dt` is extremely small.

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

1. `smoothedFps = nextSmoothedFps(smoothedFps, dt)` (uses the **same** `dt` as the loop).
2. Simulation and render run.
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
| [`core/loop.ts`](../src/core/loop.ts) | `frameDelta()`, rAF loop |
| [`config/constants.ts`](../src/config/constants.ts) | `MAX_FRAME_DT` |
| [`utils/frameStats.ts`](../src/utils/frameStats.ts) | `FPS_SMOOTHING`, `nextSmoothedFps()` |
| [`core/game.ts`](../src/core/game.ts) | Owns `smoothedFps`, builds `FrameOverlayStats` |
| [`ui/hud.ts`](../src/ui/hud.ts) | `FrameOverlayStats`, `drawFrameStats()` |
| [`render/renderer.ts`](../src/render/renderer.ts) | Passes stats into HUD / attract draw |
| [`tests/core.test.ts`](../tests/core.test.ts) | Smoke tests for smoothing |

## Tests

`nextSmoothedFps(60, 1/60)` stays near 60; a shorter `dt` (higher instant FPS) nudges the
average upward gradually because of the 0.9/0.1 blend.
