# GridSystem

```typescript
game.addSystem(new GridSystem(game, tileMap))
```

## Synopsis

The GridSystem connects the mouse to the tile map's grid. It listens to `mousemove` and `mousedown`
on the game container, converts the mouse position to a cell (taking the camera offset and zoom into account,
see [Camera](../game-world.md#camera)) and emits grid events.

It also adds a small info box in the bottom left corner with the mouse, canvas and grid position.

!!! note
    The GridSystem still computes a cell highlight (hovered cell, its row and column, selected cell) every tick,
    but its canvas is not attached to the container, so the highlight is not visible.
    Use the [GridLinesSystem](#gridlinessystem) to show the grid.

## Events

| Emits            | When                                                        | Payload               |
|------------------|-------------------------------------------------------------|-----------------------|
| `grid.cellHover` | The mouse moves onto another cell inside the grid           | `{ index, col, row }` |
| `grid.cellClick` | Mouse down while a cell is hovered                          | `{ index, col, row }` |
| `system.draw`    | Every tick                                                  | `{ system, context, drawCounter }` |

`index` is the cell index: `row · columns + col`.

| Listens to | Action             |
|------------|--------------------|
| `resize`   | Resizes the canvas |

## System Lifecycle

- `onLoad`: creates the info box and the canvas.
- `start` / `stop`: add / remove the mouse listeners on the container.

# GridLinesSystem

```typescript
game.addSystem(new GridLinesSystem(game, tileMap))
```

Draws the grid lines of the tile map's projection on its own canvas (`#gridLinesCanvas`).
The lines extend one map size beyond the map in each direction.

It is purely visual and does not handle mouse input, so add a [GridSystem](#gridsystem) as well
if you need `grid.cellHover` / `grid.cellClick`.
