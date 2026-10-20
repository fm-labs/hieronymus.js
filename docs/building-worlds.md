# Building Worlds

A practical guide to building new demo worlds on top of the engine in `lib/`,
with a focus on isometric, sim-city style worlds (a map of buildings, roads and things moving around).

It is written for humans and for LLM coding agents. It assumes you know the engine basics from the
[Game Engine Overview](game-engine/index.md) and [Game World](game-engine/game-world.md); this guide is about
**how to put them together**, and about the traps that are not obvious from the API.

!!! tip "Rule number one"
    Build worlds **without modifying the engine** (`lib/`). Everything below works with custom components,
    custom systems and the existing `TileMap` / `TileMapSystem`. If a world seems to need an engine change,
    there is usually a way around it (see [Depth sorting](#depth-sorting)).

## The example worlds

Read them in this order; each one adds a few ideas to the previous one.

| World                       | URL                 | What it shows                                                                                                                                                   |
| --------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/worlds/snake`          | `?world=snake`      | The smallest game: pure game logic, one system, an orthogonal grid.                                                                                             |
| `src/worlds/isosnake`       | `?world=isosnake`   | The same game on an isometric grid.                                                                                                                             |
| `src/worlds/isoislands`     | `?world=isoislands` | A **map generator** (seeded random, URL parameters), built-in `TileComponent` and `IsoCubeComponent` only.                                                      |
| `src/worlds/isocity`        | `?world=isocity`    | The sim-city pattern: an ASCII map, custom building/road/vehicle components, **traffic rules**, depth-sorted layers, a HUD.                                    |
| `src/worlds/isocasino`      | `?world=isocasino`  | A floor manager: rooms, objects with stats, **pedestrians** reusing the traffic rules, **click to select** with an info panel.                                  |
| `src/worlds/isovegas`       | `?world=isovegas`   | **Multi-cell landmarks**, a drawing kit with **day and night**, a shared scene clock, a sky, camera fit and fly-to.                                              |
| `src/worlds/isoairport`     | `?world=isoairport` | **Geometry off the grid**: diagonal runways and taxiways drawn in grid space, planes on paths with a state machine, sliced buildings, a sky layer, a flight board. |
| `src/worlds/isosoccer`      | `?world=isosoccer`  | **A game on the map**: ball physics with height, a team AI, keyboard control of one agent (arrow keys), goals sliced per cell, a TV camera that follows the ball. |

## Anatomy of a world

Every world lives in its own folder `src/worlds/<name>/` and is split the same way:

```
src/worlds/isocity/
  isocity.traffic.ts          pure logic: rules, maps, simulation (no engine imports → unit tested)
  isocity.draw.ts             drawing helpers (isometric boxes, shadows, colors)
  IsoCityBuildingComponent.ts components: one class per kind of thing on the map, they only draw
  IsoCityRoadComponent.ts
  IsoCityVehicleComponent.ts
  isocity.world.ts            the world builder: creates the TileMap, its layers and components
  IsoCitySystem.ts            the system: runs the simulation each frame, input, HUD
  isocityGameLauncher.ts      wires systems + world into a Game
test/isocity.traffic.test.ts  tests for the pure logic
```

| Part                 | Responsibility                                                                                     | Engine imports |
| -------------------- | -------------------------------------------------------------------------------------------------- | -------------- |
| `<name>.<logic>.ts`  | Map data, rules, simulation steps, parsing. Deterministic, takes `random` as a parameter.          | none           |
| `<name>.draw.ts`     | Canvas helpers, shared by the components.                                                          | none           |
| `*Component.ts`      | Draws one thing at its position. Reads its `properties` (and a shared scene object), keeps no game state. | `AbstractGameComponent` |
| `<name>.world.ts`    | Builds the `TileMap`: layers, ground tiles, structures. Returns the map plus handles the system needs. | `TileMap`      |
| `*System.ts`         | Owns the game state: moves things, handles input, updates the HUD, syncs component positions.      | `AbstractGameSystem` |
| `*GameLauncher.ts`   | Creates the `Game`, adds the systems in the right order.                                            | `Game`, systems |

Finally register the launcher in `src/main.ts`; launchers are imported lazily:

```typescript
const gameLaunchers: Record<string, () => Promise<GameLauncher>> = {
  // ...
  isovegas: async () =>
    (await import('./worlds/isovegas/isovegasGameLauncher.ts')).isovegasGameLauncher,
}
```

The world is then available at `http://localhost:5173/?world=isovegas` (`npm run dev`).

## A minimal sim-city world

### The launcher

```typescript
export const mycityGameLauncher = async (app: HTMLDivElement) => {
  const game = new Game(app, { id: 'mycity', name: 'My City', fullscreen: true })

  game.addSystem(new InputSystem(game)) // emits keyboard.*, mouse.*, wheel, zoom, resize
  game.addSystem(new CameraSystem(game)) // WASD and the wheel pan, ctrl/cmd + wheel zooms

  const world = await myCityWorldBuilder()
  // before the TileMapSystem, so each frame draws the positions of the same frame
  game.addSystem(new MyCitySystem(game, world, { vehicleLayer: LAYER_VEHICLES }))
  game.addSystem(new TileMapSystem(game, world.tileMap)) // updates and draws the map

  return game
}
```

**System order matters.** `Game.tick` calls all systems in the order they were added (their synchronous part
runs in that order). Your simulation system must come **before** the `TileMapSystem`, otherwise everything is
drawn one frame late.

### The map as text

Describe the map as an array of strings, one character per cell. It is readable, easy to edit, easy to test
and gives you a design you can see in the source:

```typescript
// '#' road, '.' grass, 'H' house, 'S' shop, 'T' tree
export const CITY_MAP = [
  '.T...T...T#..T...',
  '.###############.',
  'T#H.H.H#SS,SS#H.H',
  // ...
]
export const cityRoadMap = (map: string[]): RoadMap => (col, row) => map[row]?.[col] === '#'
```

For random maps write a generator in the pure module instead (see `isoislands.generator.ts`):
take a `seed`, use a seeded PRNG (`createRandom(seed)`, mulberry32), and expose size and seed as URL parameters.

### The world builder

The standard layer setup for a sim-city world:

```typescript
export const LAYER_GROUND = 0 // TILE: ground, roads, water. Flat, never depth-sorted.
export const LAYER_STRUCTURES = 1 // TILE + depthSort: buildings, trees, props.
export const LAYER_VEHICLES = 2 // OBJECT + depthSort: everything that moves.
export const LAYER_OVERLAY = 3 // OBJECT: selection outlines, labels. Drawn on top of everything.

tileMap.addLayer(LAYER_GROUND, { name: 'Ground', type: 'TILE', data: [] })
tileMap.addLayer(LAYER_STRUCTURES, { name: 'Structures', type: 'TILE', data: [], depthSort: true })
tileMap.addLayer(LAYER_VEHICLES, { name: 'Vehicles', type: 'OBJECT', data: [], depthSort: true })
tileMap.addLayer(LAYER_OVERLAY, { name: 'Overlay', type: 'OBJECT', data: [] })
```

- Structures and moving things must be in `depthSort` layers so a car can drive behind a building.
- The ground must **not** be depth-sorted, or ground tiles lower on the screen would cover things standing above them.
- `addTile(layer, col, row, component)` places a component on a TILE layer (one per cell) and sets its position.
  `addObjectAtGridPos(layer, col, row, component)` adds to an OBJECT layer (any number) and returns its id,
  which you need for `removeObject(layer, id)`.

### The system

```typescript
export class MyCitySystem extends AbstractGameSystem implements IGameSystem {
  public name = 'MyCitySystem'

  public onLoad() {} // called by game.addSystem(): create the initial vehicles here
  public start() {} // called by game.run(), in system order: subscribe to events, create the HUD, set the camera
  public stop() {} // unsubscribe, remove the HUD, restore what you changed on the container

  public async tick(deltaTime: number) {
    // deltaTime is in milliseconds, and 0 on the first frame.
    // Cap it, so a background tab doesn't teleport everything on return.
    const seconds = Math.min(deltaTime, 100) / 1000
    stepTraffic(this.vehicles, this.isRoad, seconds, Math.random)
    this.vehicles.forEach((v) => this.syncComponent(v))
  }
}
```

Keep the game state (vehicles, guests, stats) in the system as plain data, and **copy positions to the
components every tick**. Components stay dumb: they only draw.

## Isometric coordinates

These conventions are used by all iso worlds; stick to them and the helpers just work.

| Thing                                  | Value                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| Cell `(col, row)` on screen            | `x = (col - row) * ts/2`, `y = (col + row) * ts/4`: the **top corner** of the diamond. |
| Tile size                              | `ts = tileMap.tileWidth` (64 in the demos), a diamond is `ts` wide and `ts/2` high.    |
| A component's position                 | The top corner of its cell (set by `addTile` / `addObjectAtGridPos`).                  |
| Center of the cell (where things stand)| `(this.x, this.y + ts/4)`                                                              |
| An offset of `dCol, dRow` cells        | `isoOffset(ts, dCol, dRow)` = `[(dCol - dRow) * ts/2, (dCol + dRow) * ts/4]`            |
| Heights                                | In pixels, straight up (`y - height`).                                                 |
| Visible sides of a box                 | The **left** face (along the columns, facing +rows) and the **right** face (along the rows, facing +cols). Shade the left a bit (−15%) and the right more (−35%). |
| Continuous positions                   | Moving things use fractional grid coordinates; the center of cell `(c, r)` is `(c + 0.5, r + 0.5)`. |
| Placing a moving thing                 | `projection.mapGridToScreen(p.col - 0.5, p.row - 0.5)`: the top corner of a cell centered on it, so it sorts like a building on that cell. |
| Screen → world (mouse)                 | `worldX = (clientX - rect.left + camera.offset.x) / camera.zoom` (same for y), then `projection.mapScreenToGrid(worldX, worldY)`. |

## Depth sorting

The `TileMapSystem` merges all `depthSort` layers and sorts their components **by `y` only**
(stable: ties keep layer and insertion order). That is all you get, and it is enough if you respect it:

1. **One cell, one thing.** Buildings that fit in one cell sort correctly against everything.
2. **Multi-cell buildings: anchor on the front cell.** Place the component on the cell with the largest
   `col + row` of its footprint (bottom corner of the footprint on screen), and let it draw the **whole
   footprint** from there. It is then drawn after everything behind it.
   In `IsoVegasLandmarkComponent`, the back corner is `this.x/y + isoOffset(ts, -(cols-1), -(rows-1))`.
3. **Inside a multi-cell building, sort the parts yourself.** A landmark is a little scene (towers, a pool,
   palms, a sign). `IsoPainter.later(col, row, draw)` queues each part with its depth (`col + row` of its
   center) and `flush()` draws them back to front.
4. **Neighbors in front must sort later.** A thing directly in front of a multi-cell footprint (the next
   column to the right, or the next row below) but with a smaller `col + row` than the footprint's front cell
   is drawn first, and the big building paints over it. Keep such cells empty or flat, or make the thing part
   of the landmark. `test/isovegas.map.test.ts` checks this rule for every pair of neighbors, and it found a
   real bug (a cactus in front of Mandalay Bay). Write the same test for your map.
5. **Split a lot into full-width or full-height pieces.** Two landmarks sharing a whole side always sort
   correctly; L-shaped arrangements may not.
6. **Overlays go last.** Selection outlines and labels go in a final, non-sorted OBJECT layer.

## Drawing kit

Don't draw with raw canvas calls in every component; reuse the helpers. They take screen points on the ground
and sizes in cells (footprints) and pixels (heights).

| Module                                  | Helpers                                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `isocity/isocity.draw.ts`               | `isoOffset`, `isoBoxTop` (corners back, right, front, left), `drawIsoBox`, `drawIsoShadow`, `shadeColor`. |
| `isocasino/isocasino.draw.ts`           | `shadeHex`, `along`, `drawFaceRect` (a rectangle on a box side), `isoRadii`, `drawIsoDisc`, `drawIsoCylinder`, `drawWheel`. |
| `isovegas/isovegas.draw.ts`             | `IsoPainter`: everything above plus `cone` (with stripes), `pyramid`, `windows` (lit at night), `ground`, `groundEllipse`, `text` (neon glow), `light`, the `later`/`flush` queue, and night tinting of every color via `c()`. `mix`, `shade`, `tint`, `noise`. |

With these, almost anything is a combination of boxes, cylinders, cones and pyramids:
a house is a box + a pyramid roof, a circus tent a striped cone on a cylinder, the Luxor a pyramid, a palm a
curved line with eight curved fronds. Detail comes from small touches: window lines, a roof cap, a shadow,
an awning, a sign.

Gotchas:

- `shadeColor()` returns `rgb(...)`. Helpers that shade again (like `drawIsoBox`) need `#rrggbb`;
  use `shadeHex()` / `shade()` for colors you pass on.
- Never use `Math.random()` while drawing: the picture would flicker every frame. Use a hash of the cell
  (`noise(col, row, salt)`) for per-cell variety, and a time value for animations.
- `shadowBlur` (glow) is expensive: use it for a few neon elements, not for every window.
- Text is drawn upright in screen space. Keep labels short and draw them on a screen-aligned billboard.

## Things that move

`isocity/isocity.traffic.ts` is a small, reusable traffic model:

- The road network is just a predicate `isRoad(col, row)`; outside the map it must return `false`.
- Vehicles go from cell center to cell center (`progress` 0..1), choose a random connected direction at each
  cell, never turn back except at dead ends, and drive in the right-hand lane (`vehiclePosition`).
- `stepTraffic` moves every vehicle that has nobody close ahead in its lane. It decides first and moves
  afterwards, so the result doesn't depend on the order of the vehicles.

Lessons from building it, valid for any agent simulation:

- **Simulate headless before you look at it.** Run thousands of steps in a test with a seeded PRNG and track
  the longest time anyone stood still. Both deadlocks found in these worlds were invisible in a short look
  and obvious in the numbers.
- **Break symmetric waits.** Two agents blocking each other wait forever; let the lower id go first.
  Oncoming traffic never blocks.
- **Take parked agents out of the flow.** Casino guests that sit down to play are removed from the traffic
  and drawn stepped aside, so they don't block the aisle.
- **Add an escape hatch for crowds.** A guest that waited more than 2 s walks on regardless for a second
  (`isocasino`). Rings of agents waiting on each other are otherwise unavoidable in open areas.

The same model drives pedestrians (`IsoCasinoSystem` uses walkable floor cells as "roads").

## Shared scene state: time, day and night

Components only get `deltaTime` in `update()`, which is not enough to keep animations in sync.
For world-wide state, create one plain object in the world builder and pass the **same reference** to every
component; the system updates it each tick:

```typescript
export type VegasScene = { time: number; hours: number; night: number }

const scene: VegasScene = { time: 0, hours: 18.5, night: 0 }
new IsoVegasLandmarkComponent({ tileSize, kind, cols, rows, scene })

// in the system's tick
scene.time += seconds
scene.hours = (scene.hours + (seconds / DAY_SECONDS) * 24) % 24
scene.night = nightAmount(scene.hours)
```

Night is then a drawing concern: `IsoPainter.c(color)` blends every surface color towards a dark blue by
`night`, while lights (windows, neon, headlights, beams) are drawn with their raw colors and a glow, so they
"switch on" by contrast. The sky is just the CSS background of the game container (the map canvas is
transparent); restore it in `stop()`.

## Input, camera and HUD

- **Events** (from `InputSystem`): `keyboard.keydown`, `mouse.mousedown`, `wheel`, `zoom`, `resize`; see the
  [event catalog](game-engine/game-systems/index.md#event-catalog). Subscribe in `start()`, unsubscribe in `stop()`,
  and bind your handlers in the constructor.
- **Camera controls** (`CameraSystem`): WASD and the mouse wheel pan, ctrl/cmd + wheel zooms (0.5 to 10).
  The arrow keys do nothing. Don't promise other controls in your HUD.
- **Camera from code:** set `game.camera.zoom` and `game.camera.offset = { x, y }` in your system's `start()`.
  It runs after `CameraSystem.start()` (which resets the camera) as long as your system is added after it.
  On screen, a world point is at `world * zoom - offset`, so to center on a world point use
  `offset = point * zoom - viewport / 2`. `IsoVegasSystem.fitView()` and `centerOn()` show both.
- **HUD:** plain DOM panels appended to `game.$container`, absolutely positioned. Give them a class and ignore
  `mouse.mousedown` events whose target is inside one, or a click on a panel also selects the cell below it.
  Re-render a panel when its content changes (or a few times a second), not every frame.
- **Picking:** screen → world → grid (see the table above), then look up what is on that cell. For multi-cell
  footprints, search the footprint rectangles. Picking works on the ground cell, so a click on the top of a
  tall building selects the cell behind it; a list of places to click is a friendly addition.
- **URL parameters** are cheap and make demos and testing easier: `?seed=`, `?cols=` (isoislands), `?hour=22` (isovegas).

## Testing and checking

Before you call a world done:

```bash
npx tsc --noEmit -p .                 # types
npx eslint --fix src/worlds/<name> test/<name>.*.test.ts
npx vitest run                        # unit tests
```

What to test in the pure module: the map is a rectangle of known characters; the road / floor network is
connected; everything important is reachable; multi-cell footprints are filled rectangles; the depth rule
for neighbors; the simulation never deadlocks; any numbers (house edge, clock) behave as expected.

**Look at it.** Type checks don't catch a building drawn under its neighbor. With the dev server running,
a headless Chromium screenshot is one command (Playwright's cached headless shell works):

```bash
chrome-headless-shell --hide-scrollbars --window-size=1440,900 --force-device-scale-factor=2 \
  --virtual-time-budget=5000 --screenshot=shot.png "http://localhost:5173/?world=isovegas&hour=22"
```

`--virtual-time-budget` lets the animation run for 5 s; console errors show up with `--enable-logging=stderr`.
Crop details with `sips -c <h> <w> --cropOffset <y> <x> shot.png --out crop.png` on macOS.

## Checklist for a new sim-city world

1. Create `src/worlds/<name>/` and register the launcher in `src/main.ts`.
2. Write the map (ASCII or generator) and the rules in a pure module, with tests.
3. Set up the four layers: ground, structures (depth-sorted), movers (depth-sorted), overlay.
4. Write the components, using the drawing kit; derive per-cell variety from a hash.
5. Anchor multi-cell buildings on their front cell, and test the neighbor depth rule.
6. Write the system: state as data, sync positions every tick, cap `deltaTime`, HUD, input, cleanup in `stop()`.
7. Add the system **before** the `TileMapSystem` in the launcher.
8. Simulate the movement headless and check the longest wait.
9. Type-check, lint, test, and take a screenshot (day and night, if you have both).

## Notes for LLM agents

- Don't change files in `lib/`. Read the engine through its docs and `lib/game.types.ts`.
- Start by reading one complete example world (isocity for a city, isovegas for landmarks and day/night),
  then copy its structure; import shared helpers (`isocity.traffic`, `isocity.draw`) instead of copying them.
- Match the code style: no semicolons, single quotes, short comments that explain *why*; `eslint --fix` formats.
- Don't claim controls the engine doesn't have (arrow keys, plain-wheel zoom).
- Check your work visually (screenshot), not only with `tsc`; say so when you couldn't.
