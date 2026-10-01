# GamepadSystem

```typescript
game.addSystem(new GamepadSystem(game))
```

## Synopsis

The GamepadSystem polls the [Gamepad API](https://developer.mozilla.org/docs/Web/API/Gamepad_API)
and forwards connection changes, stick directions and button presses on the game's event bus.

Keyboard and mouse input is handled by the [InputSystem](input-system.md).

## Events

| Source                    | Internal event         | Payload                                          |
|---------------------------|------------------------|--------------------------------------------------|
| `window` `gamepadconnected`    | `gamepad.connected`    | `Gamepad`                                   |
| `window` `gamepaddisconnected` | `gamepad.disconnected` | `Gamepad`                                   |
| polled, left stick        | `gamepad.stickChange`  | `{ stickLeft, stickRight, stickUp, stickDown }` (`GamepadStickChangeEvent`) |
| polled, buttons           | `gamepad.buttonPress`  | `{ button, state: 'pressed' }` (`GamepadButtonChangeEvent`) |

### Polling behaviour

- Gamepads are polled at most every **50 ms**.
- `gamepad.stickChange` is emitted on every poll while the left stick is outside a dead zone of `0.2`
  on at least one axis. It is not emitted when the stick returns to the center.
- `gamepad.buttonPress` is emitted on every poll **while** a button is held, not only on the initial press.
  There is no `released` event yet.

Button indices follow the [standard gamepad mapping](https://w3c.github.io/gamepad/#remapping)
(0 = A, 1 = B, 2 = X, 3 = Y, 4/5 = bumpers, 6/7 = triggers, 8 = select, 9 = start, 12–15 = d-pad).

## System Lifecycle

- `start`: reads the connected gamepads and registers the connect / disconnect listeners.
- `stop`: removes the listeners.
- `tick`: polls the gamepads and emits stick and button events.
