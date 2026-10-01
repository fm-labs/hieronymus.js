# World

A small HTML5 canvas game engine for 2D (orthogonal) and isometric tile-based games, written in TypeScript.

- `lib/` – the engine, built as a library (`dist/world-lib.js` / `dist/world-lib.umd.cjs`)
- `src/` – a demo app with several example worlds (`src/worlds/*`)
- `docs/` – engine documentation (MkDocs)

## Getting Started

```bash
yarn install
yarn dev
```

Open the dev server and pick a world, e.g. `http://localhost:5173/?world=dev`.
Without a `?world=` parameter a launcher with all available worlds is shown.

Some worlds need data that is not in the repository:

| World       | Requires                                                   |
|-------------|------------------------------------------------------------|
| `aws`, `awsgraph` | the sibling repository `../cloudia-common`           |
| `casino`    | `src/worlds/casino/gameidx-web.json` (gitignored)          |
| `container` | `src/worlds/container/container.json` (gitignored)         |

Launchers are loaded lazily, so a missing file only breaks the world that needs it.

## Scripts

| Command        | Description                               |
|----------------|-------------------------------------------|
| `yarn dev`     | Start the Vite dev server                 |
| `yarn build`   | Type-check `lib/` and build the library   |
| `yarn test`    | Run the unit tests (vitest)               |
| `yarn lint`    | Lint the project                          |

## Documentation

```bash
./mkdocs.sh make    # build the docs docker image
./mkdocs.sh serve   # serve the docs on http://localhost:8002
```

Start with [docs/game-engine/index.md](docs/game-engine/index.md).
