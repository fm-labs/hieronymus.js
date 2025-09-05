# Overview

## Built-in Game Systems

- **Input System**: Handles user input such as keyboard and mouse events, providing a unified interface for other systems to access input data.
- **Gamepad System**: Manages gamepad input, allowing for support of game controllers.
- **Grid System**: Provides a grid-based layout system for organizing game objects in a grid format, useful for tile-based games. Supports orthogonal and isometric grids.
- **TileMap System**: Manages tile maps, including loading, rendering, and interacting with tile-based environments.
  - **TileMap Editor**: A tool for creating and editing tile maps, allowing designers to visually build levels and environments.



| System                       | Tick | Draw | Event Listener | Event Emitter |
|------------------------------|------|------|----------------|---------------|
| Debug                        | -    | -    | YES            | -             |
| Camera                       | -    | -    | YES            | YES           |
| [Input](input-system.md)     | -    | -    | YES            | YES           |
| Info                         | -    | YES  | YES            | -             |
| [Gamepad](gamepad-system.md) | YES  | -    | YES            | YES           |
| Grid                         | -    | YES  | YES            | YES           |
| [TileMap](tilemap-system.md) | YES  | YES  | YES            | YES           |
| TileMapEditor                | YES  | YES  | YES            | YES           |
|                              |      |      |                |               |
|                              |      |      |                |               |



Emoji Legend:

- :white_check_mark: - System is implemented and functional.
- :construction: - System is under development.
- :x: - System is not implemented or deprecated.
- :question: - System is planned but not yet implemented.
- :warning: - System has known issues or limitations.
- :information_source: - System documentation is available.
- :bulb: - System has additional notes or tips.
