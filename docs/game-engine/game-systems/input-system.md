# InputSystem

## Synopsis

The InputSystem is responsible for handling user input such as keyboard and mouse events. 

It processes input events and provides a unified interface for other systems to access input data.

Browser events are captured and translated into a format that can be used by the game engine,
and forwarded on the internal event bus.

Gamepad support is not included in this system. Checkout the [GamepadSystem](gamepad-system.md) for gamepad input handling.

## Input Events

| Event Emitter     | Captured Event | Event type    | Internal Event   | Internal Event Payload |
|-------------------|----------------|---------------|------------------|------------------------|
| `window`          | keydown        | KeyboardEvent | keyboard.keydown | KeyboardEvent          |
| `window`          | keyup          | KeyboardEvent | keyboard.keydown | KeyboardEvent          |
| `window`          | mousedown      | MouseEvent    | mouse.mousedown  | MouseEvent             |
| `window`          | mouseup        | MouseEvent    | mouse.mouseup    | MouseEvent             |
| `window`          | dblclick       | MouseEvent    | mouse.dblclick   | MouseEvent             |
| `window`          | wheel          | WheelEvent    | wheel            | WheelEvent             |
| `window`          | zoom           | WheelEvent    | zoom             | WheelEvent             |
| `window`          | resize         | UIEvent       | resize           | { width, height }      |
|                   |                |               |                  |                        |
|                   |                |               |                  |                        |
|                   |                |               |                  |                        |


## System Lifecycle

- `onStart`: Initializes the InputSystem, setting up event listeners for input events.
- `onStop`: Cleans up the InputSystem, removing event listeners and resetting input state.
