# Overview

The engine is built around three ideas:

- **Game** – owns the container element, the camera, the event bus and the game loop.
- **Systems** – plug-ins added to the game. Each system reacts to events, updates state on every tick and,
  if it renders something, draws to **its own canvas** that it appends to the game container.
- **TileMap** – the world: a grid with layers that reference **components** (the renderable objects).

Systems never call each other directly. They communicate through the game's event bus
(see the [event catalog](game-systems/index.md#event-catalog)).

## Quick Start

```typescript
import {
  Game,
  TileMap,
  InputSystem,
  CameraSystem,
  GridSystem,
  TileMapSystem,
  IsoCubeComponent,
} from 'world'

const app = document.querySelector<HTMLDivElement>('#app')!

// 1. Create the game
const game = new Game(app, { id: 'my-game', name: 'My Game' })

// 2. Load assets (optional)
await game.resources.loadSpritesheet(
  'fm_iso_buildings',
  '/assets/sprites/fm_iso_buildings/fm_iso_buildings.png',
  '/assets/sprites/fm_iso_buildings/fm_iso_buildings.json',
  1, // first sprite gets the global id 1
)
await game.resources.loadFont('Tektur', '/assets/fonts/Tektur/Tektur-VariableFont_wdth,wght.ttf')

// 3. Build the world
const tileMap = new TileMap({ columns: 30, rows: 30, tileSize: 64, projection: 'isometric' })
tileMap.addLayer(0, { name: 'Ground', type: 'TILE', data: [] })
tileMap.addLayer(1, { name: 'Objects', type: 'OBJECT', data: [] })

tileMap.addObjectAtGridPos(1, 5, 5, new IsoCubeComponent({ tileSize: 64, width: 64, depth: 32 }))

// 4. Add systems
game.addSystem(new InputSystem(game))
game.addSystem(new CameraSystem(game))
game.addSystem(new TileMapSystem(game, tileMap))
game.addSystem(new GridSystem(game, tileMap))

// 5. Run
await game.run()
```

`src/worlds/dev/` is a complete working example (`?world=dev` in the demo app).

!!! note
The order in which systems are added matters: each drawing system appends its canvas to the
container, so systems added later are drawn on top.

## Game

```typescript
new Game($container: HTMLDivElement, config: GameConfig, resources?: IGameResources)
```

If no `resources` are given, a `GameResourcesManager` is created (see [Game Assets](game-assets.md)).

### GameConfig

| Property     | Type      | Description                                                |
| ------------ | --------- | ---------------------------------------------------------- |
| `id`         | `string`  | Required. Identifier of the game.                          |
| `name`       | `string`  | Display name.                                              |
| `fullscreen` | `boolean` | Makes the container fill the viewport (`100vw` × `100vh`). |
| `width`      | `number`  | Currently unused, the size is taken from the container.    |
| `height`     | `number`  | Currently unused, the size is taken from the container.    |

### IGame

```typescript
interface IGame {
  $container: HTMLDivElement
  config: GameConfig
  resources: IGameResources
  eventbus: IEventBus

  // camera & dimensions
  camera: Camera2D // { offset: { x, y }, zoom }
  width: number // updated on the 'resize' event
  height: number

  // state
  gameRunning: boolean
  gamePaused: boolean
  pause(): void
  resume(): void
  data: { [key: string]: any } // free-form shared state for systems

  // loop
  run(): void | Promise<void>
  tick(currentTime: number): void | Promise<void>

  // timing
  fps: number // frames counted during the last second
  frameCount: number // frames since the last fps update (resets every second)
  lastFrameTime: number // requestAnimationFrame timestamp of the previous frame
  deltaTime: number // milliseconds since the previous frame
}
```

## Game Loop

1. `game.addSystem(system)` calls `system.onLoad()` immediately and registers the system.
2. `game.run()` calls `start()` on all systems (in parallel), then starts the `requestAnimationFrame` loop.
3. On every frame `tick(deltaTime)` is called on all systems in parallel (`Promise.all`).
   The next frame is requested after all ticks have resolved.
4. While the game is paused (`game.pause()`) systems are not ticked; the loop polls every 100 ms
   until `game.resume()` is called.

`deltaTime` is the time since the previous frame in milliseconds (`0` on the first frame).

With Vite hot module reloading, the game calls `stop()` on all systems before a module is replaced
and `start()` afterwards. Systems should therefore unregister in `stop()` everything they register in `start()`.

## Game Systems

A system is any object implementing `IGameSystem`. All hooks are optional:

```typescript
interface IGameSystem {
  name: string
  onLoad?: () => void // called by game.addSystem()
  onUnload?: () => void // currently never called by the game
  start?: () => void // called by game.run() and after hot reload
  stop?: () => void // called before hot reload
  tick?: (deltaTime: number) => Promise<void>
  draw?: (ctx: CanvasRenderingContext2D) => void // not called by the game, see below
}
```

The game never calls `draw()`. Systems that render something create their own canvas in `onLoad()`
and draw to it from `tick()`.

Most built-in systems extend `AbstractGameSystem`, which stores the game as `this._game`:

```typescript
class MySystem extends AbstractGameSystem implements IGameSystem {
  public name = 'MySystem'

  constructor(game: IGame) {
    super(game)
    // bind handlers once, so the same reference can be passed to off() in stop()
    this.handleCellClick = this.handleCellClick.bind(this)
  }

  public start() {
    this._game.eventbus.on('grid.cellClick', this.handleCellClick)
  }

  public stop() {
    this._game.eventbus.off('grid.cellClick', this.handleCellClick)
  }

  private handleCellClick(e: { index: number; col: number; row: number }) {
    console.log('clicked', e.col, e.row)
  }
}
```

See [Game Systems](game-systems/index.md) for the built-in systems.

## Event Bus

```typescript
game.eventbus.on('grid.cellClick', listener)
game.eventbus.off('grid.cellClick', listener)
game.eventbus.emit('camera.reset', {})
```

Events are plain strings; listeners are called synchronously in registration order.

## Game Container

The container is the element passed to `new Game()`. Systems append their canvases and HTML overlays to it.
The canvases must be stacked on top of each other; the demo app does this with `public/assets/css/game.css`:

```html
<div id="app" class="game-container"></div>
```

```css
.game-container canvas {
  position: absolute;
  margin: 0 !important;
  padding: 0 !important;
}
```
