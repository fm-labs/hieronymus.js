# hieronimo.js

A small HTML5 canvas game engine for 2D (orthogonal) and isometric tile-based games, written in TypeScript.

- `lib/` – the engine, built as the `@fmlabs/hieronimo` library into `dist/`
- `examples/` – a demo app with example worlds that uses the built library (see [examples/README.md](examples/README.md))
- `src/` – a small dev page (the `dev` world) that imports `lib/` directly
- `test/` – unit tests (vitest)
- `docs/` – engine documentation (MkDocs)

The repository is a pnpm workspace: the root package `@fmlabs/hieronimo` is the library, `examples/` is the
`@fmlabs/hieronimo-examples` package that depends on it.

## Getting Started

```bash
pnpm install
pnpm build      # build the library into dist/
pnpm examples   # start the examples dev server
```

Open the dev server and pick a world, e.g. `http://localhost:5173/?world=dev`.
Without a `?world=` parameter a launcher with all available worlds is shown.

To work on the library and the examples together, run the watch build next to the dev server,
each in its own terminal, and reload the page after a change:

```bash
pnpm build:watch
```

```bash
pnpm examples
```

Some example worlds need local data that is not in the repository, see [examples/README.md](examples/README.md#worlds).

## Using the library

`pnpm build` type-checks `lib/` and writes the package to `dist/`: an ES module (`world-lib.js`), a UMD build
(`world-lib.umd.cjs`) and a single bundled type declaration file (`index.d.ts`). Demo assets are not included.

```typescript
import { Game, TileMap, TileMapSystem } from '@fmlabs/hieronimo'
import type { IGame, ITileMap, TileMapConfig } from '@fmlabs/hieronimo'
```

Everything an app can use is exported from `lib/index.ts`; deep imports into `lib/` are not part of the
package. All engine types (`IGame`, `IGameSystem`, `ITileMap`, `IGameComponent`, …) are regular exports.
Inside `lib/` they are imported from `lib/game.types` (`import type { IGame } from '../game.types'`).

In another pnpm workspace package, depend on it with `"@fmlabs/hieronimo": "workspace:*"` (as `examples/` does).

## Scripts

Run in the repository root:

| Command            | Description                                      |
| ------------------ | ------------------------------------------------ |
| `pnpm build`       | Type-check `lib/` and build the library          |
| `pnpm build:watch` | Rebuild the library on every change              |
| `pnpm examples`    | Start the examples dev server                    |
| `pnpm dev`         | Start the root dev page (`src/`, imports `lib/`) |
| `pnpm test`        | Run the unit tests (vitest)                      |
| `pnpm lint`        | Lint the project                                 |

The tests that cover example worlds import them from `examples/src/worlds/`. In tests `@fmlabs/hieronimo`
resolves to `lib/index.ts`, so they run against the library source and need no build.

## Documentation

```bash
./mkdocs.sh make    # build the docs docker image
./mkdocs.sh serve   # serve the docs on http://localhost:8002
```

Start with [docs/game-engine/index.md](docs/game-engine/index.md).
