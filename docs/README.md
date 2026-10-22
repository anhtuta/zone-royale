# Documentation

Index of the Zone Royale project docs. Add new documents to this folder and list them here.

| Document                           | Description                                                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [INIT_PROJECT.md](INIT_PROJECT.md) | How the project was set up from the single-file prototype: tech stack, folder structure, architecture, game loop, scripts, conventions |

`pnpm e2e` writes `docs/screenshot.png` locally for manual inspection; that file is gitignored and not stored in the repo.

## Conventions for new docs

- One topic per file, `UPPER_SNAKE_CASE.md` names (e.g. `MULTIPLAYER.md`, `ADDING_A_WEAPON.md`).
- Start with a one-paragraph summary of what the document covers.
- Prefer diagrams in [Mermaid](https://mermaid.js.org/) so they render on GitHub and stay diffable.
- Link to source files with relative paths (e.g. `../src/systems/zone.ts`).
