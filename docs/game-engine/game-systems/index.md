# Game Systems

Systems are added with `game.addSystem(system)`. See the [overview](../index.md#game-systems) for the
system lifecycle and how to write your own.

## Built-in systems

| System                                            | Constructor                | Own canvas | Description                                                                         |
| ------------------------------------------------- | -------------------------- | ---------- | ----------------------------------------------------------------------------------- |
| [InputSystem](input-system.md)                    | `(game)`                   | –          | Translates keyboard, mouse, wheel and resize events into bus events.                |
| [GamepadSystem](gamepad-system.md)                | `(game)`                   | –          | Polls connected gamepads and emits stick and button events.                         |
| [CameraSystem](camera-system.md)                  | `(game)`                   | –          | Pans and zooms the camera (keyboard, wheel, pinch/ctrl+wheel).                      |
| [TileMapSystem](tilemap-system.md)                | `(game, tileMap, canvas?)` | yes        | Updates and draws all components of a tile map.                                     |
| [GridSystem](grid-system.md)                      | `(game, tileMap)`          | –          | Maps the mouse to grid cells and emits `grid.cellHover` / `grid.cellClick`.         |
| [GridLinesSystem](grid-system.md#gridlinessystem) | `(game, tileMap)`          | yes        | Draws the grid lines.                                                               |
| TileMapEditorSystem                               | `(game, tileMap)`          | –          | HTML editor panels: sprite palette, layers, select/draw mode, save.                 |
| InfoSystem                                        | `(game)`                   | –          | HTML overlay with FPS, dimensions, camera, mouse and draw counters.                 |
| HeroSystem                                        | `(game)`                   | yes        | Demo: a controllable character (keyboard / gamepad). Needs the `mech-*` tilesheets. |
| EntitySystem                                      | `(game)`                   | –          | Experimental: emits `object.update` when a cell is clicked with a selected sprite.  |
| DebugSystem, DevPanelSystem                       | `(game)`                   | –          | Stubs that log their lifecycle calls.                                               |

Every system that has its own canvas resizes it on the `resize` event and draws in its `tick()`.

A typical setup (from `src/worlds/dev/devGameLauncher.ts`):

```typescript
game.addSystem(new InfoSystem(game))
game.addSystem(new InputSystem(game))
game.addSystem(new CameraSystem(game))
game.addSystem(new GamepadSystem(game))
game.addSystem(new GridSystem(game, tileMap))
game.addSystem(new GridLinesSystem(game, tileMap))
game.addSystem(new TileMapSystem(game, tileMap))
game.addSystem(new TileMapEditorSystem(game, tileMap))
```

## Event catalog

| Event                                           | Emitted by                | Payload                                         |
| ----------------------------------------------- | ------------------------- | ----------------------------------------------- |
| `keyboard.keydown`                              | InputSystem               | `KeyboardEvent`                                 |
| `keyboard.keyup`                                | InputSystem               | `KeyboardEvent`                                 |
| `mouse.mousedown`                               | InputSystem               | `MouseEvent`                                    |
| `mouse.mouseup`                                 | InputSystem               | `MouseEvent`                                    |
| `mouse.dblclick`                                | InputSystem               | `MouseEvent`                                    |
| `wheel`                                         | InputSystem               | `WheelEvent` (scroll / two-finger pan)          |
| `zoom`                                          | InputSystem               | `WheelEvent` (pinch or ctrl/cmd + wheel)        |
| `resize`                                        | InputSystem               | `{ width, height }`                             |
| `gamepad.connected`                             | GamepadSystem             | `Gamepad`                                       |
| `gamepad.disconnected`                          | GamepadSystem             | `Gamepad`                                       |
| `gamepad.stickChange`                           | GamepadSystem             | `{ stickLeft, stickRight, stickUp, stickDown }` |
| `gamepad.buttonPress`                           | GamepadSystem             | `{ button, state: 'pressed' }`                  |
| `grid.cellHover`                                | GridSystem                | `{ index, col, row }`                           |
| `grid.cellClick`                                | GridSystem                | `{ index, col, row }`                           |
| `system.draw`                                   | TileMapSystem, GridSystem | `{ system, context, drawCounter }`              |
| `camera.reset`                                  | TileMapEditorSystem       | `{}` – handled by CameraSystem                  |
| `camera.center`                                 | TileMapEditorSystem       | `{}` – handled by CameraSystem                  |
| `editor.spriteSelect` / `editor.spriteDeselect` | TileMapEditorSystem       | `{ index }`                                     |
| `editor.set_mode`                               | TileMapEditorSystem       | `{ mode: 'select' \| 'draw' }`                  |
| `editor.select_layer`                           | TileMapEditorSystem       | `{ layer }` (layer name)                        |
| `editor.clear_cell`                             | TileMapEditorSystem       | `{ index }`                                     |
| `editor.save`                                   | TileMapEditorSystem       | `{ tilemapJson }` (string)                      |
| `editor.restore`                                | TileMapEditorSystem       | `{ tilemapJson }` (parsed) – not handled yet    |
| `hero.update`                                   | HeroSystem                | hero state, every tick                          |
| `hero.move`                                     | HeroSystem                | hero state                                      |
| `object.update`                                 | EntitySystem              | `{ col, row, spriteRef }`                       |

## TileMap editor

The `TileMapEditorSystem` adds two HTML panels to the container:

- **Left:** the sprite palette (all sprites in `GameAssets.sprites`). Click a sprite to select it.
- **Right:** buttons (_Dump_, _Save_, _Restore_, _Reset camera_, _Center camera_, _Select Mode_, _Draw Mode_),
  the selected cell with a _Clear_ button, and the layer list with a _Select_ button per layer.

In **Draw Mode**, clicking a grid cell places a `SpriteComponent` with the selected sprite on the selected layer:
with `addTile()` on a TILE layer, with `addObjectAtGridPos()` on an OBJECT layer.
The editor relies on the `GridSystem` for `grid.cellClick`.
