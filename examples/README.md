# World Examples

A demo app with example worlds built on the world engine. It uses the engine the way any other app would:
as the `@fmlabs/world` package, i.e. the **compiled library in `../dist/`**, not the `../lib/` source.

```typescript
import { Game, TileMap, TileMapSystem } from '@fmlabs/world'
import type { IGame, ITileMap, TileMapConfig } from '@fmlabs/world'
```

`examples/` is a pnpm workspace package (see `../pnpm-workspace.yaml`). Its dependency
`"@fmlabs/world": "workspace:*"` links `node_modules/@fmlabs/world` to the repository root, and the root
`package.json` `exports` point at `dist/world-lib.js` and `dist/index.d.ts`.

## Getting Started

From the repository root:

```bash
pnpm install
pnpm build      # build the library into dist/ first, the examples import it from there
pnpm examples   # start the examples dev server
```

Open the dev server and pick a world, e.g. `http://localhost:5173/?world=dev`.
Without a `?world=` parameter a launcher with all available worlds is shown.

### Working on the library and the examples together

Run the library build in watch mode next to the dev server, each in its own terminal:

```bash
pnpm build:watch
```

```bash
pnpm examples
```

Every change in `lib/` rebuilds `dist/`. Reload the page to pick it up.

## Worlds

Each world lives in `src/worlds/<name>/` and is registered in `src/main.ts` with a lazily loaded launcher
(`<name>GameLauncher.ts`). A world that is missing local data only fails when it is selected.

Available worlds: `dev`, `aws`, `awsgraph`, `roulette`, `vienna`, `container`, `casino`, `chess`, `snake`,
`isosnake`, `isoislands`, `isocity`, `isocasino`, `isovegas`, `isovienna`, `isoairport`, `isosoccer`,
`isoaws`, `flow`, `isoflow`, `isocontainers`.

Some worlds and assets need files that are not in the repository:

| World / asset                         | Requires                                                            |
| ------------------------------------- | ------------------------------------------------------------------- |
| `aws`, `awsgraph`                     | the sibling repository `../../cloudia-common` (linked as a package) |
| `casino`                              | `src/worlds/casino/gameidx-web.json` (gitignored)                   |
| `container`                           | `src/worlds/container/container.json` (gitignored)                  |
| `public/assets/sprites/kenney-assets` | a symlink to `../../kenney-assets/assets` (gitignored)              |
| `public/assets/fonts`, `public/aws`   | local font and AWS icon files (gitignored)                          |

Some launchers read extra query parameters, e.g. `?inventory=<url>` for the inventory based worlds.

### Adding a world

1. Create `src/worlds/<name>/` with a `<name>GameLauncher.ts` that exports
   `<name>GameLauncher(app: HTMLDivElement): Promise<Game>`.
2. Import everything engine related from `@fmlabs/world`. Never import from `../lib/`.
3. Register the launcher in `gameLaunchers` in `src/main.ts`.

If a world needs something from the engine that is not exported, export it from `../lib/index.ts`
and rebuild the library.

## Mission-control API (isocontainers)

The `isocontainers` world can show live data (`?world=isocontainers&api`). The dev server proxies
`/mc-api/...` to the mission-control API and adds the API key, so the key never reaches the browser.

```bash
cp .env.example .env.local   # then set MC_API_URL and MC_API_KEY
```

## Scripts

Run in `examples/` (or from the root with `pnpm --filter @fmlabs/world-examples <script>`):

| Command        | Description                                    |
| -------------- | ---------------------------------------------- |
| `pnpm dev`     | Start the Vite dev server                      |
| `pnpm build`   | Type-check and build the demo app into `dist/` |
| `pnpm preview` | Serve the built demo app                       |

## Tests

The world tests live in the repository root (`../test/`) and run with `pnpm test` there. They resolve
`@fmlabs/world` to `../lib/index.ts`, so they test against the library source and need no build.
