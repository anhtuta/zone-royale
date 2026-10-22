# Zone Royale

A top-down 2D **battle royale** that runs in the browser. You drop in with 19 AI bots
onto a 3000×3000 map full of houses, trees and rocks, scavenge weapons, ammo, med kits and
armor, and fight to be the last one standing while a storm zone closes in over 6 phases.
A match lasts about 3–4 minutes.

Built with **TypeScript** (strict), **Vite** and the **Canvas 2D** API. There are no runtime
dependencies; sound effects are synthesised with the Web Audio API.

## Controls

| Input                    | Action                                          |
| ------------------------ | ----------------------------------------------- |
| `W` `A` `S` `D` / arrows | Move                                            |
| Mouse                    | Aim                                             |
| Left click               | Shoot (hold for automatic weapons)              |
| `R`                      | Reload                                          |
| `E`                      | Pick up loot (ammo is picked up automatically)  |
| `1` / `2`, `Q`, wheel    | Switch weapon                                   |
| `Enter` / `Space`        | Start / play again from the start or end screen |

## Weapons

| Weapon        | Ammo   | Damage | Fire mode | Notes                    |
| ------------- | ------ | ------ | --------- | ------------------------ |
| Pistol        | Light  | 20     | semi      | everyone starts with one |
| SMG           | Light  | 11     | auto      | fast, inaccurate         |
| Shotgun       | Shells | 8 × 12 | semi      | devastating up close     |
| Assault Rifle | Medium | 16     | auto      | all-rounder              |
| Sniper        | Heavy  | 85     | semi      | rare, long range         |

Armor absorbs 60% of weapon damage until it runs out (zone damage ignores armor).

## Getting started

Requires **Node.js ≥ 20.19** and [pnpm](https://pnpm.io/) (see `packageManager` in `package.json`).
`npm install` / `yarn` / `bun install` are blocked by the `preinstall` script — use pnpm only.

```bash
pnpm install
pnpm dev           # start the dev server with hot reload (http://localhost:5173)
```

## Scripts

| Script              | What it does                                                         |
| ------------------- | -------------------------------------------------------------------- |
| `pnpm dev`          | Vite dev server with hot module reload                               |
| `pnpm build`        | Type-check, then build a static site into `dist/`                    |
| `pnpm preview`      | Serve the production build locally                                   |
| `pnpm typecheck`    | `tsc --noEmit` in strict mode                                        |
| `pnpm lint`         | ESLint (TypeScript + TSDoc rules), zero warnings allowed             |
| `pnpm format`       | Format everything with Prettier (`format:check` to only check)       |
| `pnpm test`         | Run the Vitest unit tests once (`test:watch` for watch mode)         |
| `pnpm e2e`          | Serve `dist/` and play it in headless Chromium (needs a build first) |

## Deploying

`pnpm build` produces a fully static `dist/` folder with **relative** asset paths
(`base: './'`), so it can be hosted from any URL or sub-path: GitHub Pages, Netlify, itch.io,
an S3 bucket or any static file server. Just upload the contents of `dist/`.

## Project layout

```
src/
  config/    constants, weapon stats, zone phases, bot names
  core/      game controller, loop, simulation step, input, camera, audio, canvas
  entities/  data types for combatants, loot, bullets, effects
  systems/   gameplay logic: AI, combat, weapons, inventory, loot, zone, collision, match
  world/     procedural map generation and houses
  render/    Canvas drawing of the world
  ui/        HUD, minimap, kill feed, HTML start/end screens
  utils/     math, random, geometry, color helpers
tests/       Vitest unit tests
docs/        project documentation
```

See [docs/INIT_PROJECT.md](docs/INIT_PROJECT.md) for the architecture and conventions, and
[docs/README.md](docs/README.md) for the documentation index.
