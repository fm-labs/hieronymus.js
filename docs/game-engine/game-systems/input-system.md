# InputSystem

```typescript
game.addSystem(new InputSystem(game))
```

## Synopsis

The InputSystem captures browser keyboard, mouse, wheel and resize events on `window`
and forwards them on the game's event bus. It does not keep any input state itself.

Gamepads are handled by the [GamepadSystem](gamepad-system.md).
Mouse movement over the grid is handled by the [GridSystem](grid-system.md).

## Events

| Captured on `window` | Condition                                              | Internal event     | Payload                                 |
| -------------------- | ------------------------------------------------------ | ------------------ | --------------------------------------- |
| `keydown`            |                                                        | `keyboard.keydown` | `KeyboardEvent`                         |
| `keyup`              |                                                        | `keyboard.keyup`   | `KeyboardEvent`                         |
| `mousedown`          |                                                        | `mouse.mousedown`  | `MouseEvent`                            |
| `mouseup`            |                                                        | `mouse.mouseup`    | `MouseEvent`                            |
| `dblclick`           |                                                        | `mouse.dblclick`   | `MouseEvent`                            |
| `wheel`              | `deltaX == 0` and fractional `deltaY` (trackpad pinch) | `zoom`             | `WheelEvent`                            |
| `wheel`              | ctrl / cmd pressed and `deltaY != 0`                   | `zoom`             | `WheelEvent`                            |
| `wheel`              | otherwise                                              | `wheel`            | `WheelEvent`                            |
| `resize`             |                                                        | `resize`           | `{ width, height }` (window inner size) |

Listen to key events with the lowercase DOM event name and compare `e.code`
(layout-independent, e.g. `KeyW`, `ArrowUp`):

```typescript
game.eventbus.on('keyboard.keydown', (e: KeyboardEvent) => {
  if (e.code === 'Space') jump()
})
```

## System Lifecycle

- `start`: registers the window listeners and dispatches one `resize` event, so all systems
  receive the initial window size.
- `stop`: removes the window listeners.

The `Game` itself listens to `resize` and updates `game.width` / `game.height`.
