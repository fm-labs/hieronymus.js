# Overview


## Game Interface

```typescript
interface IGame {
  $container: HTMLDivElement
  $canvas: HTMLCanvasElement

  // config
  config: GameConfig

  // world
  worldMap: ITileMap
  resources: IGameResources

  // events
  eventbus: IEventBus

  // camera & projection
  camera: Camera2D
  width: number
  height: number

  // systems
  run: () => void | Promise<void>
  tick: (deltaTime: number) => void | Promise<void>
  draw: () => void | Promise<void>

  // fps
  fps: number
  frameCount: number
  lastFrameTime: number
  deltaTime: number
}
```

## Game Container

The game container is a `div` element that contains the game canvas. It is used to position the game canvas on the page.

```html
<div id="game-container"></div>
```

## Game Canvas

The game canvas is a `canvas` element that is used to draw the game world.

```html
<canvas id="game-canvas"></canvas>
```

## Game Configuration

The game configuration is an object that contains the game settings.


