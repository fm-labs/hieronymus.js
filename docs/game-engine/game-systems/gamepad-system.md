# GamepadSystem

## Synopsis

The GamepadSystem is responsible for handling user Gamepad events. 

Browser events are captured and translated into a format that can be used by the game engine,
and forwarded on the internal event bus.

For keyboard and mouse input event handling, checkout the [InputSystem](input-system.md).

## Gamepad Events

| Event Emitter                 | Captured Event      | Event type   | Internal Event       | Internal Event Payload                   |
|-------------------------------|---------------------|--------------|----------------------|------------------------------------------|
| `window`                      | gamepadconnected    | GamepadEvent | gamepad.connected    | GamepadEvent                             |
| `window`                      | gamepaddisconnected | GamepadEvent | gamepad.disconnected | GamepadEvent                             |
| Polled from Gamepad instance  | -                   | -            | gamepad.stickChange  | {stickUp,stickDown,stickLeft,stickRight} |
| Polled from Gamepad instance  | -                   | -            | gamepad.buttonPress  | {button,state}                           |




## System Lifecycle

- `onStart`: Initializes the GamepadSystem, setting up event listeners for Gamepad events.
- `onStop`: Cleans up the GamepadSystem, removing event listeners and resetting Gamepad state.
- `onTick`: Polls the Gamepad state and emits events for stick changes and button presses.
